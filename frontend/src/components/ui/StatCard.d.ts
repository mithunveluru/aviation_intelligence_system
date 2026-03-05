import type { LucideIcon } from 'lucide-react';
interface Props {
    icon: LucideIcon;
    label: string;
    value: string | number;
    sub?: string;
    accent?: 'cyan' | 'teal' | 'amber' | 'red' | 'emerald';
    delay?: number;
}
export default function StatCard({ icon: Icon, label, value, sub, accent, delay }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=StatCard.d.ts.map