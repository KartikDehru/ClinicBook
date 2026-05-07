import { store } from "@/lib/store";
import type { Provider } from "@/types";

export function getProvidersForTenant(tenantId: string): Provider[] {
  return store.providers.filter((p) => p.tenantId === tenantId);
}

export function getProviderById(id: string): Provider | undefined {
  return store.providers.find((p) => p.id === id);
}