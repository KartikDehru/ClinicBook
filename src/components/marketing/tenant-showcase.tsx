import Link from "next/link";
import { SAMPLE_TENANTS } from "@/data/tenants";
import { Badge } from "@/components/ui/badge";

export function TenantShowcase() {
  return (
    <section className="bg-slate-900 py-16 text-white">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-2xl font-bold">Sample tenants</h2>
        <p className="mt-2 text-slate-300">Explore live demo workspaces with realistic data.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {SAMPLE_TENANTS.map((t) => (
            <Link
              key={t.id}
              href={`/t/${t.slug}`}
              className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 transition hover:border-brand-400"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{t.name}</span>
                <Badge variant="muted" className="capitalize text-slate-800">
                  {t.vertical}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-400">{t.subdomain}.clinicbook.app</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}