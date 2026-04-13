import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { redirect } from "next/navigation";

/**
 * Server component guard. Wrap admin-only page content with this.
 * Non-admins are redirected to the dashboard.
 */
export async function AdminGuard({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    redirect("/dashboard?error=admin_required");
  }
  return <>{children}</>;
}
