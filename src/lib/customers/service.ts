import { store } from "@/lib/store";
import type { Customer } from "@/types";

export function getCustomersForTenant(tenantId: string): Customer[] {
  return store.customers.filter((c) => c.tenantId === tenantId);
}

export function getCustomerById(id: string): Customer | undefined {
  return store.customers.find((c) => c.id === id);
}

export function createCustomer(
  input: Omit<Customer, "id" | "createdAt">
): Customer {
  const customer: Customer = {
    ...input,
    id: store.generateId("cus"),
    createdAt: new Date().toISOString(),
  };
  store.customers.push(customer);
  return customer;
}

export function updateCustomer(
  id: string,
  patch: Partial<Pick<Customer, "name" | "email" | "phone" | "notes">>
): Customer {
  const customer = getCustomerById(id);
  if (!customer) throw new Error("Customer not found");
  Object.assign(customer, patch);
  return customer;
}