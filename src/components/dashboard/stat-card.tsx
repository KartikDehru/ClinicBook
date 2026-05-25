import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: string;
}

export function StatCard({ title, value, description, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {(description || trend) && (
        <CardContent>
          {trend && <p className="text-sm font-medium text-emerald-600">{trend}</p>}
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </CardContent>
      )}
    </Card>
  );
}