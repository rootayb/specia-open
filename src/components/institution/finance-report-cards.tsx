"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { FileDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { updateEntitlementInvoiceStatusAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { useRouter } from "next/navigation";

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}

// 1. Öğrenci Bazlı Maliyet ve Gelir Akışı
interface StudentBillingItem {
  studentName: string;
  classroom: string;
  completedSessions: number;
  mebTotal: number;
  parentTotal: number;
}

export function StudentBillingCard({ data }: { data: StudentBillingItem[] }) {
  const [limit, setLimit] = useState(3);
  const hasMore = data.length > limit;

  const actionButton = hasMore ? (
    <Button
      variant="ghost"
      size="sm"
      className="text-neutral-400 hover:text-white hover:bg-white/5 text-xs rounded-lg font-medium"
      onClick={() => setLimit((prev) => prev + 5)}
    >
      Daha Fazlası ({data.length - limit})
    </Button>
  ) : null;

  return (
    <Card variant="subtle" padding="lg">
      <SectionHeading
        eyebrow="Detaylar"
        title="Öğrenci Bazlı Maliyet ve Gelir Akışı"
        description="Öğrencilerin tamamlanan seans sayıları ve MEB/Veli fatura dağılımları."
        action={actionButton}
        align="between"
      />
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm text-[color:var(--panel-text-soft)]">
          <thead>
            <tr className="border-b border-[color:var(--panel-border)] text-[color:var(--panel-text-muted)] font-medium">
              <th className="pb-3 pr-2">Öğrenci Adı</th>
              <th className="pb-3 px-2 text-right">Seans</th>
              <th className="pb-3 px-2 text-right">MEB Payı</th>
              <th className="pb-3 px-2 text-right">Veli Payı</th>
              <th className="pb-3 pl-2 text-right">Toplam</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--panel-border)]/40">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[color:var(--panel-text-muted)]">
                  Kayıtlı öğrenci hak ediş verisi bulunmuyor.
                </td>
              </tr>
            ) : (
              data.slice(0, limit).map((item, idx) => (
                <tr key={idx} className="hover:bg-[color:var(--panel-bg-hover)]/30 transition-colors">
                  <td className="py-3 pr-2">
                    <div className="font-medium text-[color:var(--panel-text)]">{item.studentName}</div>
                    <div className="text-xs text-[color:var(--panel-text-muted)]">{item.classroom}</div>
                  </td>
                  <td className="py-3 px-2 text-right font-medium">{item.completedSessions}</td>
                  <td className="py-3 px-2 text-right text-[color:var(--panel-text-muted)]">{formatMoney(item.mebTotal)}</td>
                  <td className="py-3 px-2 text-right text-[color:var(--panel-text-muted)]">{formatMoney(item.parentTotal)}</td>
                  <td className="py-3 pl-2 text-right font-semibold text-[color:var(--panel-text)]">
                    {formatMoney(item.mebTotal + item.parentTotal)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// 2. Ödeme Bekleyen Alıcılar
interface DebtorItem {
  customerName: string;
  studentName: string;
  pendingAmount: number;
  invoiceCount: number;
  email: string | null;
}

export function DebtorsCard({ data }: { data: DebtorItem[] }) {
  const [limit, setLimit] = useState(3);
  const hasMore = data.length > limit;

  const actionButton = hasMore ? (
    <Button
      variant="ghost"
      size="sm"
      className="text-neutral-400 hover:text-white hover:bg-white/5 text-xs rounded-lg font-medium"
      onClick={() => setLimit((prev) => prev + 5)}
    >
      Daha Fazlası ({data.length - limit})
    </Button>
  ) : null;

  return (
    <Card variant="subtle" padding="lg">
      <SectionHeading
        eyebrow="Alacak Takibi"
        title="Ödeme Bekleyen Alıcılar"
        description="Kurumdan hizmet alan ve ödeme vadesi gelen veya geçmiş kişi ve kurumlar."
        action={actionButton}
        align="between"
      />
      <div className="mt-6 grid gap-3">
        {data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--panel-border)] px-4 py-10 text-sm text-center text-[color:var(--panel-text-soft)]">
            Ödeme bekleyen alacak kaydı bulunmuyor.
          </div>
        ) : (
          data.slice(0, limit).map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-4 rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/72 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="font-semibold text-[color:var(--panel-text)]">{item.customerName}</div>
                <div className="mt-0.5 text-xs text-[color:var(--panel-text-soft)]">
                  Öğrenci: <span className="text-[color:var(--panel-text-muted)]">{item.studentName}</span>
                </div>
                {item.email ? (
                  <div className="mt-1 text-xs text-[color:var(--panel-text-muted)]">
                    {item.email}
                  </div>
                ) : null}
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-[color:var(--panel-warning-text)]">{formatMoney(item.pendingAmount)}</div>
                <div className="mt-0.5 text-[11px] text-[color:var(--panel-text-soft)]">
                  {item.invoiceCount} adet fatura beklemede
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

// 3. Personel / Genel Gider Dağılımı
const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  salary: "Maaş",
  bonus: "Prim",
  per_session_fee: "Seans Başı Ücret",
  sgk_tax: "SGK / Vergi",
  rent: "Kira",
  utilities: "Fatura",
  office_supplies: "Ofis Malzemesi",
  maintenance: "Bakım / Onarım",
  other: "Diğer",
};

export function ExpenseBreakdownCard({
  eyebrow = "Gider Dağılımı",
  title = "Personel Gideri Kaynakları",
  description = "Maaş, prim ve seans başı ücretlerin toplam personel gideri içindeki payları.",
  emptyLabel = "Henüz personel gideri kaydedilmedi.",
  totalExpenses,
  paidExpenses,
  pendingExpenses,
  categoryTotals,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  emptyLabel?: string;
  totalExpenses: number;
  paidExpenses: number;
  pendingExpenses: number;
  categoryTotals: Array<{ category: string; amount: number }>;
}) {
  const sorted = [...categoryTotals].sort((a, b) => b.amount - a.amount);

  return (
    <Card variant="subtle" padding="lg">
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />
      {totalExpenses === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[color:var(--panel-border)] px-4 py-10 text-center text-sm text-[color:var(--panel-text-soft)]">
          {emptyLabel}
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-4">
            {sorted.map((item) => (
              <div key={item.category}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-[color:var(--panel-text)]">
                    {EXPENSE_CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                  <span className="text-[color:var(--panel-text-muted)]">
                    {formatMoney(item.amount)} (%{totalExpenses > 0 ? ((item.amount / totalExpenses) * 100).toFixed(0) : 0})
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[color:var(--panel-bg-hover)] overflow-hidden">
                  <div
                    className="h-full bg-[color:var(--panel-text-soft)] transition-all"
                    style={{ width: `${totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-[color:var(--panel-success-text)]" />
              <span className="text-[color:var(--panel-text-soft)]">Ödenen:</span>
              <span className="font-semibold text-[color:var(--panel-success-text)]">{formatMoney(paidExpenses)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-[color:var(--panel-warning-text)]" />
              <span className="text-[color:var(--panel-text-soft)]">Bekleyen:</span>
              <span className="font-semibold text-[color:var(--panel-warning-text)]">{formatMoney(pendingExpenses)}</span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

// 4. Son Fatura Hareketleri
interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerTitle: string | null;
  issueDate: string;
  billingSource: string;
  status: string;
  total: number;
}

export function RecentInvoicesCard({ data }: { data: InvoiceItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const [limit, setLimit] = useState(3);
  const hasMore = data.length > limit;

  const actionButton = hasMore ? (
    <Button
      variant="ghost"
      size="sm"
      className="text-neutral-400 hover:text-white hover:bg-white/5 text-xs rounded-lg font-medium"
      onClick={() => setLimit((prev) => prev + 5)}
    >
      Daha Fazlası ({data.length - limit})
    </Button>
  ) : null;

  const handleApprove = (invoiceId: string) => {
    startTransition(async () => {
      const result = await updateEntitlementInvoiceStatusAction({
        id: invoiceId,
        status: "approved",
      });
      showResult(result, {
        successTitle: "Fatura onaylandı",
        errorTitle: "Onay işlemi başarısız",
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  return (
    <Card variant="subtle" padding="lg">
      <SectionHeading
        eyebrow="Kayıtlar"
        title="Son Fatura Hareketleri"
        description="Sistemde düzenlenen en son fatura, hak ediş ve fark ücreti kayıtları."
        action={actionButton}
        align="between"
      />
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm text-[color:var(--panel-text-soft)]">
          <thead>
            <tr className="border-b border-[color:var(--panel-border)] text-[color:var(--panel-text-muted)] font-medium">
              <th className="pb-3 pr-2">Fatura No</th>
              <th className="pb-3 px-2">Alıcı / Öğrenci</th>
              <th className="pb-3 px-2">Tarih</th>
              <th className="pb-3 px-2">Tür</th>
              <th className="pb-3 px-2">Durum</th>
              <th className="pb-3 px-2 text-right">Tutar</th>
              <th className="pb-3 pl-2 text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--panel-border)]/40">
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[color:var(--panel-text-muted)]">
                  Henüz fatura veya hak ediş kaydı bulunmuyor.
                </td>
              </tr>
            ) : (
              data.slice(0, limit).map((invoice) => {
                const isDiff = invoice.billingSource === "difference";
                const isEnt = invoice.billingSource === "entitlement";

                return (
                  <tr key={invoice.id} className="hover:bg-[color:var(--panel-bg-hover)]/30 transition-colors">
                    <td className="py-3 pr-2 font-medium text-[color:var(--panel-text)]">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-medium text-[color:var(--panel-text)]">{invoice.customerName}</div>
                      {invoice.customerTitle ? (
                        <div className="text-xs text-[color:var(--panel-text-soft)]">{invoice.customerTitle}</div>
                      ) : null}
                    </td>
                    <td className="py-3 px-2 text-xs">
                      {new Date(invoice.issueDate).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-3 px-2">
                      <Badge tone={isDiff ? "warning" : isEnt ? "info" : "neutral"}>
                        {isDiff ? "Veli Farkı" : isEnt ? "MEB Hak Ediş" : "Diğer"}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-xs font-semibold">
                      {invoice.status === "paid" ? (
                        <Badge tone="success">Ödendi</Badge>
                      ) : invoice.status === "cancelled" ? (
                        <Badge tone="danger">İptal</Badge>
                      ) : invoice.status === "refunded" ? (
                        <Badge tone="neutral">İade</Badge>
                      ) : (
                        <Badge tone="warning">Beklemede</Badge>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right font-semibold text-[color:var(--panel-text)]">
                      {formatMoney(invoice.total)}
                    </td>
                    <td className="py-3 pl-2 text-right">
                      {invoice.status !== "draft" ? (
                        <Link href={`/api/pdf/invoice/${invoice.id}`} target="_blank">
                          <Button size="sm" variant="ghost" className="h-7 px-2">
                            <FileDown className="size-3.5 mr-1" />
                            PDF
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          className="h-7 px-2 text-emerald-400 hover:text-emerald-300"
                          onClick={() => handleApprove(invoice.id)}
                        >
                          Onayla
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
