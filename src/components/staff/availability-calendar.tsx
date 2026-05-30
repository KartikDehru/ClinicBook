import { formatWeeklyHours } from "@/lib/availability/slots";
import type { Provider } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AvailabilityCalendar({ providers }: { providers: Provider[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {providers.map((provider) => (
        <Card key={provider.id}>
          <CardHeader>
            <CardTitle className="text-base">{provider.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-slate-600">
              {formatWeeklyHours(provider.id).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}