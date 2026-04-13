import { AdminGuard } from "@/components/admin-guard";

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
