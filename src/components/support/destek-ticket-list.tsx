"use client";

import Link from "next/link";
import { Mail, Globe, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

type SupportTicket = {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  source: string;
  createdAt: Date;
};

const statusLabels: Record<string, string> = {
  open: "Açık",
  in_progress: "İşlemde",
  resolved: "Çözüldü",
  closed: "Kapatıldı",
};

const statusClasses: Record<string, string> = {
  open: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
  in_progress: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  resolved: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  closed: "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20",
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DestekTicketList({ tickets }: { tickets: SupportTicket[] }) {
  if (tickets.length === 0) {
    return (
      <Card padding="md" className="text-center py-10">
        <p className="text-sm text-[color:var(--panel-text-muted)]">
          Henüz oluşturulmuş bir destek talebiniz bulunmamaktadır.
        </p>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]">
      <table className="min-w-full divide-y divide-white/10 text-sm">
        <thead>
          <tr className="text-left text-[color:var(--panel-text-soft)] border-b border-white/10">
            <th className="px-4 py-3 font-medium sm:px-5">Konu</th>
            <th className="px-4 py-3 font-medium sm:px-5">Durum</th>
            <th className="px-4 py-3 font-medium sm:px-5">Kaynak</th>
            <th className="px-4 py-3 font-medium sm:px-5">Oluşturulma Tarihi</th>
            <th className="px-4 py-3 font-medium sm:px-5 text-right">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {tickets.map((ticket) => (
            <tr
              key={ticket.id}
              className="align-middle hover:bg-white/[0.02] transition-colors"
            >
              <td className="px-4 py-4 sm:px-5 font-medium text-[color:var(--panel-text)]">
                {ticket.subject}
              </td>
              <td className="px-4 py-4 sm:px-5">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    statusClasses[ticket.status] || statusClasses.open
                  }`}
                >
                  {statusLabels[ticket.status] || ticket.status}
                </span>
              </td>
              <td className="px-4 py-4 sm:px-5 text-[color:var(--panel-text-muted)]">
                <span className="flex items-center gap-1.5 text-xs">
                  {ticket.source === "email" ? (
                    <>
                      <Mail className="h-3.5 w-3.5 text-emerald-400" />
                      E-posta
                    </>
                  ) : (
                    <>
                      <Globe className="h-3.5 w-3.5 text-sky-400" />
                      Web
                    </>
                  )}
                </span>
              </td>
              <td className="px-4 py-4 sm:px-5 text-[color:var(--panel-text-soft)]">
                {formatDateTime(ticket.createdAt)}
              </td>
              <td className="px-4 py-4 sm:px-5 text-right">
                <Link
                  href={`/panel/destek/${ticket.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Detay
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
