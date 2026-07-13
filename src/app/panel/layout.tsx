import { AppShell } from "@/components/layout/app-shell";
import { getActivePlatformAnnouncements } from "@/lib/data";
import { requireUser } from "@/lib/session";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const announcements = await getActivePlatformAnnouncements();

  return (
    <AppShell
      userId={user.id}
      userName={user.name ?? user.email ?? "Kullanıcı"}
      userRole={user.role}
      institutionId={user.institutionId}
      allowedModules={user.allowedModules}
      institutionType={user.institution?.type}
      announcements={announcements}
    >
      {children}
    </AppShell>
  );
}
