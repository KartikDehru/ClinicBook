import Image from "next/image";
import type { Provider } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ProviderCard({ provider, selected, onSelect }: {
  provider: Provider;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className="w-full text-left">
      <Card className={selected ? "ring-2 ring-brand-500" : ""}>
        <CardHeader className="flex flex-row items-start gap-4">
          <Image
            src={provider.avatarUrl}
            alt={provider.name}
            width={56}
            height={56}
            className="rounded-full bg-slate-100"
            unoptimized
          />
          <div>
            <CardTitle className="text-base">{provider.name}</CardTitle>
            <CardDescription>{provider.title}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-slate-600">{provider.bio}</p>
          <div className="flex flex-wrap gap-1">
            {provider.specialties.map((s) => (
              <Badge key={s} variant="muted">
                {s}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}