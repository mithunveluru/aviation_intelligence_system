from fastapi import APIRouter
from app.api.v1 import incidents, analysis, llm, clusters, model

api_router = APIRouter()
api_router.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
api_router.include_router(analysis.router,  prefix="/analysis",  tags=["Analysis"])
api_router.include_router(llm.router,       prefix="/llm",       tags=["LLM"])
api_router.include_router(clusters.router,  prefix="/clusters",  tags=["Clusters"])
api_router.include_router(model.router,     prefix="/model",     tags=["Model"])
