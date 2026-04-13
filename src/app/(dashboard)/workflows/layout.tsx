import { AdminGuard } from "@/components/admin-guard";

export default function WorkflowsLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
