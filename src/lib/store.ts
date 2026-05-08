import {
  SAMPLE_APPOINTMENTS,
  SAMPLE_AVAILABILITY,
  SAMPLE_CUSTOMERS,
  SAMPLE_PROVIDERS,
  SAMPLE_TENANTS,
  SAMPLE_USERS,
} from "@/data/tenants";
import type {
  Appointment,
  AvailabilitySlot,
  Customer,
  Provider,
  Tenant,
  User,
} from "@/types";

/**
 * In-memory data store for demo / dev. Replace with a real database in production.
 */
class AppStore {
  tenants: Tenant[] = [...SAMPLE_TENANTS];
  users: User[] = [...SAMPLE_USERS];
  providers: Provider[] = [...SAMPLE_PROVIDERS];
  availability: AvailabilitySlot[] = [...SAMPLE_AVAILABILITY];
  customers: Customer[] = [...SAMPLE_CUSTOMERS];
  appointments: Appointment[] = [...SAMPLE_APPOINTMENTS];

  generateId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

const globalForStore = globalThis as unknown as { __clinicbookStore?: AppStore };

export const store = globalForStore.__clinicbookStore ?? new AppStore();

if (process.env.NODE_ENV !== "production") {
  globalForStore.__clinicbookStore = store;
}