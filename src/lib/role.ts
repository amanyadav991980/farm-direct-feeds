import type { Role } from "@/convex/schema";

export const ROLE_LABEL: Record<Role, string> = {
  buyer: "Buyer",
  farmer: "Farmer",
  admin: "Admin",
};

/** Where a signed-in user lands after auth / from the header. */
export function roleHome(role?: Role | null): string {
  if (role === "farmer") return "/farmer";
  if (role === "admin") return "/admin";
  return "/buyer";
}

export function roleHomeLabel(role?: Role | null): string {
  if (!role) return "Get started";
  return `${ROLE_LABEL[role]} dashboard`;
}
