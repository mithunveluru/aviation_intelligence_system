import logging
import re

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

from app.config import settings

logger = logging.getLogger(__name__)

SEVERITY_CLASSES = ["Minor", "Moderate", "Severe", "Fatal"]

MODEL_FEATURES = [
    "year", "aboard", "log_aboard", "ground", "ground_flag",
    "cluster_id", "decade",
    "month", "has_route",
    "is_military", "is_private",
    "has_summary", "aircraft_era", "aboard_severity_bin",
    "is_solo",
    "is_small_piston", "is_helicopter", "is_commercial_jet", "is_turboprop",
    "cause_mechanical", "cause_weather", "cause_human_error",
    "cause_structural", "cause_fire", "cause_navigation",
    "phase_takeoff", "phase_cruise", "phase_landing",
    "phase_approach", "phase_climb", "phase_descent", "phase_ground",
    "kw_no_survivors", "kw_survived", "kw_all_killed",
    "kw_engine", "kw_fire", "kw_weather", "kw_terrain", "kw_structural",
    "kw_no_fatalities", "kw_injuries_only", "kw_aircraft_destroyed",
    "death_signal_score",
    "has_cause_extracted", "has_phase_extracted",
]

_MILITARY_KW = [
    "military", "air force", "army", "navy", "royal", "raf",
    "usaf", "usmc", "luftwaffe", "fuerza aerea", "armée",
]
_PRIVATE_KW = ["private", "personal", "executive", "charter"]


class MLService:
    def build_features(self, df: pd.DataFrame) -> pd.DataFrame:
        feat = pd.DataFrame(index=df.index)

        year   = pd.to_numeric(df.get("year"),   errors="coerce")
        aboard = pd.to_numeric(df.get("aboard"), errors="coerce")
        ground = pd.to_numeric(df.get("ground"), errors="coerce").fillna(0.0)

        feat["year"]        = year
        feat["aboard"]      = aboard
        feat["log_aboard"]  = np.log1p(aboard.fillna(0.0))
        feat["ground"]      = ground
        feat["ground_flag"] = (ground > 0).astype(float)
        feat["cluster_id"]  = (
            pd.to_numeric(df.get("cluster_id"), errors="coerce").fillna(-1.0)
        )
        feat["decade"] = (year // 10) * 10

        date_col = pd.to_datetime(
            df.get("date", pd.Series(pd.NaT, index=df.index)),
            errors="coerce",
        )
        feat["month"] = date_col.dt.month.fillna(6.0).astype(float)

        route_col = df.get(
            "route", pd.Series("", index=df.index)
        ).fillna("").astype(str)
        feat["has_route"] = (route_col.str.strip() != "").astype(float)

        op_cat = df.get("operator_category")
        if op_cat is None or op_cat.isnull().all():
            op_cat = df["operator"].fillna("").apply(self._classify_operator)

        feat["is_military"] = (op_cat == "Military").astype(float)
        feat["is_private"]  = (op_cat == "Private").astype(float)

        summary_col = df.get("summary", pd.Series("", index=df.index)).fillna("")
        feat["has_summary"] = (summary_col != "").astype(float)

        def _encode_era(y):
            if pd.isna(y): return 2
            y = int(y)
            if y < 1940:  return 0
            if y < 1958:  return 1
            if y < 1970:  return 2
            if y < 1990:  return 3
            return 4

        feat["aircraft_era"] = year.apply(_encode_era).astype(float)

        feat["aboard_severity_bin"] = pd.cut(
            aboard.fillna(1.0),
            bins=[-1, 4, 19, 99, float("inf")],
            labels=[3, 2, 1, 0],
        ).astype(float)

        feat["is_solo"] = (aboard.fillna(0.0) == 1.0).astype(float)

        ac = df.get(
            "aircraft_type", pd.Series("", index=df.index)
        ).fillna("").str.lower()

        feat["is_small_piston"] = ac.str.contains(
            r"cessna|piper|beechcraft|beech|mooney|cirrus|diamond|grumman"
            r"|socata|robin|jodel|zenith|kitfox|ultralight",
            regex=True, na=False,
        ).astype(float)

        feat["is_helicopter"] = ac.str.contains(
            r"helicopter|sikorsky|bell \d|eurocopter|agusta|robinson r"
            r"|r-22|r-44|r-66|md 500|hughes 500|enstrom|schweizer",
            regex=True, na=False,
        ).astype(float)

        feat["is_commercial_jet"] = ac.str.contains(
            r"boeing|airbus|mcdonnell douglas|dc-\d|b-7\d\d|a3\d\d"
            r"|fokker|bac|vickers|caravelle|comet|concorde|tristar"
            r"|ilyushin|tupolev|antonov",
            regex=True, na=False,
        ).astype(float)

        feat["is_turboprop"] = ac.str.contains(
            r"atr |atr-|dash 8|dhc-\d|saab 340|saab 2000|let 4"
            r"|embraer 1\d\d|beech 1900|shorts 3|bandeirante",
            regex=True, na=False,
        ).astype(float)

        cause_raw = df.get(
            "extracted_cause_category",
            pd.Series("Unknown", index=df.index),
        ).fillna("Unknown")
        cause_col = cause_raw.apply(
            lambda x: x.split("|")[0].strip() if "|" in str(x) else str(x)
        )
        for cause in ["Mechanical", "Weather", "Human Error",
                      "Structural", "Fire", "Navigation"]:
            feat[f"cause_{cause.lower().replace(' ', '_')}"] = (
                cause_col == cause
            ).astype(float)

        phase_raw = df.get(
            "extracted_phase_of_flight",
            pd.Series("Unknown", index=df.index),
        ).fillna("Unknown")
        phase_col = phase_raw.apply(
            lambda x: x.split("|")[0].strip() if "|" in str(x) else str(x)
        )
        for phase in ["Takeoff", "Cruise", "Landing",
                      "Approach", "Climb", "Descent", "Ground"]:
            feat[f"phase_{phase.lower()}"] = (
                phase_col == phase
            ).astype(float)

        s = summary_col.str.lower()

        feat["kw_no_survivors"] = s.str.contains(
            r"no survivors?|none (?:of .{0,25})?survived"
            r"|there were no survivors|no one survived",
            regex=True, na=False,
        ).astype(float)

        feat["kw_survived"] = s.str.contains(
            r"surviv|rescued|walked away|escaped|pulled from",
            regex=True, na=False,
        ).astype(float)

        feat["kw_all_killed"] = s.str.contains(
            r"all \d+ (?:persons?|people|occupants?|passengers?|crew|aboard)?"
            r" ?(?:were )?(?:killed|died|perished)"
            r"|killing all|killed all"
            r"|all aboard (?:were )?(?:killed|died|perished)"
            r"|both .{0,20}(?:killed|died|perished)"
            r"|all .{0,20} perished",
            regex=True, na=False,
        ).astype(float)

        feat["kw_engine"] = s.str.contains(
            r"engine failure|engine fire|loss of power|powerplant"
            r"|engine stall|fuel exhaustion|fuel starvation",
            regex=True, na=False,
        ).astype(float)

        feat["kw_fire"] = s.str.contains(
            r"\bfire\b|flame|smoke|burning|inflight fire",
            regex=True, na=False,
        ).astype(float)

        feat["kw_weather"] = s.str.contains(
            r"weather|fog|icing|snow|storm|turbulence"
            r"|wind shear|low visibility|thunderstorm",
            regex=True, na=False,
        ).astype(float)

        feat["kw_terrain"] = s.str.contains(
            r"terrain|mountain|hillside|cfit|controlled flight"
            r"|struck.*ground|struck.*tree|wire strike",
            regex=True, na=False,
        ).astype(float)

        feat["kw_structural"] = s.str.contains(
            r"structural failure|wing.*separat|tail.*separat"
            r"|broke apart|in.?flight break|disintegrat",
            regex=True, na=False,
        ).astype(float)

        feat["kw_no_fatalities"] = s.str.contains(
            r"no fatalities|no deaths?|no one (?:was )?killed"
            r"|no casualties|without fatality|no loss of life",
            regex=True, na=False,
        ).astype(float)

        feat["kw_injuries_only"] = s.str.contains(
            r"minor injur|serious injur|hospitali[zs]|non.fatal"
            r"|sustained injur|several injur",
            regex=True, na=False,
        ).astype(float)

        feat["kw_aircraft_destroyed"] = s.str.contains(
            r"aircraft destroyed|written off|total loss|destroyed on impact",
            regex=True, na=False,
        ).astype(float)

        feat["death_signal_score"] = (
            feat["kw_no_survivors"]   * 3
            + feat["kw_all_killed"]   * 3
            + feat["kw_structural"]   * 2
            + feat["kw_fire"]         * 1
            + feat["kw_terrain"]      * 1
            + feat["kw_survived"]     * -2
        ).clip(lower=0)

        feat["has_cause_extracted"] = (
            df.get("extracted_cause_category",
                   pd.Series("Unknown", index=df.index))
            .fillna("Unknown") != "Unknown"
        ).astype(float)

        feat["has_phase_extracted"] = (
            df.get("extracted_phase_of_flight",
                   pd.Series("Unknown", index=df.index))
            .fillna("Unknown") != "Unknown"
        ).astype(float)

        return feat[MODEL_FEATURES]

    @staticmethod
    def _build_text_input(df: pd.DataFrame) -> pd.Series:
        return df["summary"].fillna("")

    def train(
        self,
        df: pd.DataFrame,
        run_id: int,
        test_size: float | None = None,
        random_state: int | None = None,
    ) -> dict:
        test_size    = test_size    or settings.TEST_SIZE
        random_state = random_state or settings.RF_RANDOM_STATE

        labelled = df[df["severity_label"].isin(SEVERITY_CLASSES)].copy()
        logger.info(
            f"[Run {run_id}] Training on {len(labelled):,} labelled incidents "
            f"(excluding {len(df) - len(labelled):,} Unknown rows)"
        )
        if len(labelled) < 100:
            raise ValueError(f"Insufficient training data: {len(labelled)} rows.")

        class_dist = labelled["severity_label"].value_counts().to_dict()
        logger.info(f"Class distribution: {class_dist}")

        le = LabelEncoder()
        le.fit(SEVERITY_CLASSES)
        y = le.transform(labelled["severity_label"])

        logger.info(
            "Label encoding: "
            + ", ".join(f"{cls}={le.transform([cls])[0]}" for cls in le.classes_)
        )

        X_struct_raw = self.build_features(labelled)
        summaries    = self._build_text_input(labelled)

        summary_coverage = (summaries.str.strip() != "").mean() * 100
        logger.info(
            f"TF-IDF RE-ENABLED — summary only, min_df=2 "
            f"({summary_coverage:.1f}% of rows have summaries)"
        )

        (X_str_train, X_str_test,
         sums_train,  sums_test,
         y_train,     y_test) = train_test_split(
            X_struct_raw, summaries, y,
            test_size=test_size,
            stratify=y,
            random_state=random_state,
        )

        (X_str_tr,  X_str_val,
         sums_tr,   sums_val,
         y_tr,      y_val) = train_test_split(
            X_str_train, sums_train, y_train,
            test_size=0.15,
            stratify=y_train,
            random_state=random_state,
        )
        logger.info(
            f"Split: {len(X_str_tr):,} train | {len(X_str_val):,} val "
            f"| {len(X_str_test):,} test (all stratified)"
        )

        imputer        = SimpleImputer(strategy="median")
        X_str_tr_imp   = imputer.fit_transform(X_str_tr)
        X_str_val_imp  = imputer.transform(X_str_val)
        X_str_test_imp = imputer.transform(X_str_test)

        tfidf = TfidfVectorizer(
            max_features=600,
            stop_words="english",
            ngram_range=(1, 2),
            sublinear_tf=True,
            min_df=2,
        )
        X_text_tr   = tfidf.fit_transform(sums_tr).toarray()
        X_text_val  = tfidf.transform(sums_val).toarray()
        X_text_test = tfidf.transform(sums_test).toarray()

        logger.info(
            f"TF-IDF: {len(tfidf.vocabulary_):,} terms → dense "
            f"(max_features=400, bigrams, summary-only, min_df=2)"
        )

        X_tr   = np.hstack([X_str_tr_imp,   X_text_tr])
        X_val  = np.hstack([X_str_val_imp,  X_text_val])
        X_test = np.hstack([X_str_test_imp, X_text_test])

        logger.info(
            f"Feature matrix: {X_tr.shape[1]} dims "
            f"({len(MODEL_FEATURES)} structural + {len(tfidf.vocabulary_)} TF-IDF dense)"
        )

        clf = XGBClassifier(
            n_estimators=3000,
            learning_rate=0.03,
            max_depth=5,
            subsample=0.8,
            colsample_bytree=0.7,
            min_child_weight=5,
            gamma=0.1,
            reg_alpha=0.15,
            reg_lambda=1.0,
            use_label_encoder=False,
            eval_metric="mlogloss",
            early_stopping_rounds=75,
            random_state=random_state,
            n_jobs=-1,
            verbosity=0,
        )

        logger.info(
            "Training XGBClassifier "
            "(n_estimators≤3000, lr=0.03, max_depth=5, NO sample_weight)..."
        )
        clf.fit(
            X_tr, y_tr,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )
        logger.info(
            f"Training complete. Best iteration: {clf.best_iteration:,} "
            f"(early stopped from 3000 ceiling)"
        )

        y_pred       = clf.predict(X_test)
        y_pred_proba = clf.predict_proba(X_test)

        all_feature_names = MODEL_FEATURES + tfidf.get_feature_names_out().tolist()

        metrics = self._evaluate(
            y_test=y_test,
            y_pred=y_pred,
            y_pred_proba=y_pred_proba,
            le=le,
            clf=clf,
            feature_names=all_feature_names,
        )
        metrics.update({
            "class_distribution":   class_dist,
            "training_samples":     int(len(X_str_tr)),
            "test_samples":         int(len(X_str_test)),
            "features":             MODEL_FEATURES,
            "tfidf_vocab_size":     len(tfidf.vocabulary_),
            "total_feature_count":  X_tr.shape[1],
            "test_size":            test_size,
            "n_estimators":         int(clf.best_iteration),
        })

        imputer_path = settings.MODELS_DIR / f"run_{run_id}_imputer.joblib"
        tfidf_path   = settings.MODELS_DIR / f"run_{run_id}_tfidf.joblib"
        model_path   = settings.MODELS_DIR / f"run_{run_id}_severity_model.joblib"
        le_path      = settings.MODELS_DIR / f"run_{run_id}_label_encoder.joblib"

        joblib.dump(imputer, imputer_path)
        joblib.dump(tfidf,   tfidf_path)
        joblib.dump(clf,     model_path)
        joblib.dump(le,      le_path)

        metrics["model_path"]         = str(model_path)
        metrics["imputer_path"]       = str(imputer_path)
        metrics["tfidf_path"]         = str(tfidf_path)
        metrics["label_encoder_path"] = str(le_path)

        logger.info(
            f"[Run {run_id}] ✅ Model saved | "
            f"Accuracy={metrics['accuracy']:.4f} | "
            f"F1_weighted={metrics['f1_weighted']:.4f} | "
            f"F1_macro={metrics['f1_macro']:.4f} | "
            f"Precision={metrics['precision_weighted']:.4f} | "
            f"Recall={metrics['recall_weighted']:.4f}"
        )
        return metrics

    def predict_unknown(
        self,
        df: pd.DataFrame,
        run_id: int,
    ) -> tuple[np.ndarray, np.ndarray, list[int]]:
        imputer_path = settings.MODELS_DIR / f"run_{run_id}_imputer.joblib"
        tfidf_path   = settings.MODELS_DIR / f"run_{run_id}_tfidf.joblib"
        model_path   = settings.MODELS_DIR / f"run_{run_id}_severity_model.joblib"
        le_path      = settings.MODELS_DIR / f"run_{run_id}_label_encoder.joblib"

        for path in [model_path, imputer_path, tfidf_path, le_path]:
            if not path.exists():
                raise FileNotFoundError(
                    f"Missing artifact: {path.name}. Train first."
                )

        imputer = joblib.load(imputer_path)
        tfidf   = joblib.load(tfidf_path)
        clf     = joblib.load(model_path)
        le      = joblib.load(le_path)

        unknown_df = df[df["severity_label"] == "Unknown"].copy()
        if unknown_df.empty:
            logger.info("[ML] No Unknown-severity incidents — skipping.")
            return np.array([]), np.array([]), []

        logger.info(f"[ML] Predicting {len(unknown_df):,} Unknown incidents...")

        X_struct_imp = imputer.transform(self.build_features(unknown_df))
        X_text       = tfidf.transform(
            self._build_text_input(unknown_df)
        ).toarray()
        X_final = np.hstack([X_struct_imp, X_text])

        y_pred_encoded = clf.predict(X_final)
        y_proba        = clf.predict_proba(X_final)

        labels     = le.inverse_transform(y_pred_encoded)
        confidence = y_proba.max(axis=1).round(4)

        pred_dist = dict(zip(*np.unique(labels, return_counts=True)))
        logger.info(f"[ML] Prediction distribution: {pred_dist}")

        return labels, confidence, unknown_df["id"].tolist()

    def _evaluate(self, y_test, y_pred, y_pred_proba, le, clf, feature_names):
        class_names = le.classes_.tolist()
        clf_report  = classification_report(
            y_test, y_pred, target_names=class_names,
            output_dict=True, zero_division=0,
        )
        cm = confusion_matrix(y_test, y_pred).tolist()
        importances = dict(list(sorted(
            {n: round(float(v), 6) for n, v in
             zip(feature_names, clf.feature_importances_)}.items(),
            key=lambda x: x[1], reverse=True,
        ))[:30])
        per_class_recall = {
            class_names[i]: round(float(recall_score(
                y_test, y_pred, labels=[i], average="macro", zero_division=0,
            )), 4)
            for i in range(len(class_names))
        }
        return {
            "accuracy":              round(float(accuracy_score(y_test, y_pred)), 4),
            "precision_weighted":    round(float(precision_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
            "recall_weighted":       round(float(recall_score(y_test,    y_pred, average="weighted", zero_division=0)), 4),
            "f1_weighted":           round(float(f1_score(y_test,        y_pred, average="weighted", zero_division=0)), 4),
            "f1_macro":              round(float(f1_score(y_test,        y_pred, average="macro",    zero_division=0)), 4),
            "classification_report": clf_report,
            "confusion_matrix":      cm,
            "class_names":           class_names,
            "feature_importances":   importances,
            "per_class_recall":      per_class_recall,
        }

    @staticmethod
    def _classify_operator(operator: str) -> str:
        if not operator:
            return "Commercial"
        op = operator.lower()
        if any(k in op for k in _MILITARY_KW): return "Military"
        if any(k in op for k in _PRIVATE_KW):  return "Private"
        return "Commercial"
