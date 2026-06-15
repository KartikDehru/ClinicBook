import { getContainer } from "@/lib/container";
import { apiRoute, parseBody } from "@/lib/http";
import { inviteStaffSchema } from "@/lib/validation/schemas";

export const POST = apiRoute(async ({ request, actor, json }) => {
  const { tenantId, ...input } = await parseBody(request, inviteStaffSchema);
  const user = await getContainer().tenantAdmin.inviteStaff(actor, tenantId, input);
  return json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
});
