import type { Customer } from "@/types";
import { format } from "date-fns";

export function CustomerList({ customers }: { customers: Customer[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">Since</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
              <td className="px-4 py-3">{c.email}</td>
              <td className="px-4 py-3">{c.phone ?? "—"}</td>
              <td className="px-4 py-3">{format(new Date(c.createdAt), "MMM d, yyyy")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}