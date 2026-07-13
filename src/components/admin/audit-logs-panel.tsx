import Link from "next/link";
import type { UserRole } from "@/lib/prisma-shim";
import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";

type ListedAuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: Date;
  actor: {
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
  } | null;
};

type Props = {
  logs: ListedAuditLog[];
  filters: {
    q: string;
    action?: string;
    entityType?: string;
  };
  actions: string[];
  entityTypes: string[];
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function roleLabel(role: UserRole) {
  switch (role) {
    case "admin":
      return "Admin";
    case "institution":
      return "Kurum Yöneticisi";
    case "teacher":
      return "Öğretmen";
    case "parent":
      return "Veli";
    default:
      return role;
  }
}

export function AuditLogsPanel({ logs, filters, actions, entityTypes }: Props) {
  return (
    <div className="space-y-6">
      <form className="grid gap-4 rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4 sm:p-5 lg:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,1fr))]">
        <input type="hidden" name="section" value="denetim" />

        <Field label="Denetim Günlüklerinde Ara" hint="Açıklama, e-posta veya işlem tipi ile filtreleyin.">
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Örnek: brute_force veya email@..."
            className={inputClassName()}
          />
        </Field>

        <Field label="İşlem Tipi (Action)">
          <select name="action" defaultValue={filters.action ?? ""} className={inputClassName()}>
            <option value="">Tüm İşlemler</option>
            {actions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Varlık Tipi (Entity Type)">
          <select name="entityType" defaultValue={filters.entityType ?? ""} className={inputClassName()}>
            <option value="">Tüm Varlıklar</option>
            {entityTypes.map((ent) => (
              <option key={ent} value={ent}>
                {ent}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex flex-wrap items-end gap-3 lg:col-span-3">
          <Button type="submit">Filtreyi uygula</Button>
          <Link
            href="/panel/admin?section=denetim"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-[color:var(--panel-text-muted)] ring-1 ring-[color:var(--panel-border)] transition hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]"
          >
            Temizle
          </Link>
          <div className="ml-auto text-sm text-[color:var(--panel-text-soft)]">
            {logs.length} olay listelendi (maks. 100)
          </div>
        </div>
      </form>

      <div className="overflow-x-auto rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead>
            <tr className="text-left text-[color:var(--panel-text-soft)]">
              <th className="px-4 py-3 font-medium sm:px-5">İşlemi Yapan</th>
              <th className="px-4 py-3 font-medium sm:px-5">İşlem & Varlık Tipi</th>
              <th className="px-4 py-3 font-medium sm:px-5">Açıklama / Özet</th>
              <th className="px-4 py-3 font-medium sm:px-5">Tarih</th>
              <th className="px-4 py-3 font-medium sm:px-5 text-right">Eylemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} className="align-middle hover:bg-white/[0.01] transition-colors">
                  <td className="px-4 py-4 sm:px-5 whitespace-nowrap">
                    {log.actor ? (
                      <div>
                        <div className="font-semibold text-[color:var(--panel-text)]">
                          {log.actor.name ?? "İsimsiz Kullanıcı"}
                        </div>
                        <div className="text-xs text-[color:var(--panel-text-soft)]">
                          {log.actor.email}
                        </div>
                        <span className="mt-1 inline-block">
                          <Badge tone="neutral">{roleLabel(log.actor.role)}</Badge>
                        </span>
                      </div>
                    ) : (
                      <Badge tone="danger">Sistem / Dış</Badge>
                    )}
                  </td>
                  <td className="px-4 py-4 sm:px-5 whitespace-nowrap">
                    <div className="font-medium text-[color:var(--panel-text)] break-all max-w-[200px] truncate">
                      {log.action}
                    </div>
                    <div className="text-xs text-[color:var(--panel-text-soft)]">
                      {log.entityType}
                      {log.entityId && (
                        <span className="ml-1 text-[10px] text-neutral-500">
                          ({log.entityId.slice(0, 8)}...)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-5">
                    <p className="text-sm text-[color:var(--panel-text)] max-w-sm sm:max-w-md md:max-w-lg leading-relaxed">
                      {log.summary}
                    </p>
                  </td>
                  <td className="px-4 py-4 sm:px-5 whitespace-nowrap text-[color:var(--panel-text-soft)]">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-4 sm:px-5 text-right whitespace-nowrap">
                    <Link href={`/panel/admin/audit/${log.id}`}>
                      <Button variant="ghost" size="sm" className="inline-flex items-center gap-1">
                        <Eye className="size-3.5" />
                        Detay
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-[color:var(--panel-text-soft)] sm:px-5"
                >
                  Filtrelere uygun denetim günlüğü bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
