import { AdminGuard } from "@/components/admin-guard";

export default function CampaignsLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
