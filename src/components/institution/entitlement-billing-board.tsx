"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  generateEntitlementInvoiceDraftsAction,
  updateEntitlementInvoiceStatusAction,
  generateDifferenceInvoiceAction,
  deleteInstitutionInvoiceAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type InvoiceStatus = "draft" | "approved" | "issued" | "paid" | "cancelled" | "refunded";

type EntitlementRecord = {
  studentId: string;
  studentName: string;
  classroom: string | null;
  completedSessions: number;
  individualSessions: number;
  groupSessions: number;
  makeupSessions: number;
  ramIndividualHours: number;
  ramGroupHours: number;
  warnings: string[];
  invoice: InvoiceRecord | null;
};

type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  customerName: string;
  customerTitle: string | null;
  serviceTitle: string;
  servicePeriod: string | null;
  quantity: unknown;
  unitPrice: unknown;
  taxRate: unknown;
  billingStudentId: string | null;
  billingPeriod: string | null;
  billingSource: string;
  createdBy: {
    name: string;
    email: string;
  };
};

type BillingHub = {
  period: {
    key: string;
    label: string;
  };
  entitlements: EntitlementRecord[];
  invoices: InvoiceRecord[];
};

const tabs = [
  "Hak Edişler",
  "Fatura Taslakları",
  "Kesilen Faturalar",
  "Veli Fark Ücretleri",
  "Tahsilatlar",
  "Muhasebe Ayarları",
] as const;

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
}

function invoiceStatusLabel(status: InvoiceStatus) {
  const labels: Record<InvoiceStatus, string> = {
    draft: "Taslak",
    approved: "Onaylandı",
    issued: "Kesildi",
    paid: "Ödendi",
    cancelled: "İptal",
    refunded: "İade",
  };
  return labels[status];
}

function invoiceTotal(invoice: InvoiceRecord) {
  const subtotal = Number(invoice.quantity) * Number(invoice.unitPrice);
  return subtotal + subtotal * (Number(invoice.taxRate) / 100);
}

function InvoiceCard({ invoice }: { invoice: InvoiceRecord }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const updateStatus = (status: Exclude<InvoiceStatus, "draft">) => {
    startTransition(async () => {
      const result = await updateEntitlementInvoiceStatusAction({ id: invoice.id, status });
      showResult(result, {
        successTitle: "Fatura güncellendi",
        errorTitle: "Fatura güncellenemedi",
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{invoice.invoiceNumber}</span>
            <span className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-medium border",
              invoice.billingSource === "difference"
                ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                : "bg-blue-500/10 text-blue-300 border-blue-500/20"
            )}>
              {invoice.billingSource === "difference" ? "Veli Farkı" : "MEB Hak Ediş"}
            </span>
          </div>
          <div className="mt-1 text-xs text-neutral-500">{invoice.customerTitle ?? invoice.customerName}</div>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-neutral-300">
          {invoiceStatusLabel(invoice.status)}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-neutral-400 sm:grid-cols-3">
        <div>Seans: {Number(invoice.quantity)}</div>
        <div>Birim: {money(Number(invoice.unitPrice))}</div>
        <div>Toplam: {money(invoiceTotal(invoice))}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {invoice.status === "draft" ? (
          <Button size="sm" disabled={isPending} onClick={() => updateStatus("approved")}>Onayla</Button>
        ) : null}
        {invoice.status === "approved" ? (
          <Button size="sm" disabled={isPending} onClick={() => updateStatus("issued")}>Kesildi yap</Button>
        ) : null}
        {invoice.status === "issued" ? (
          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => updateStatus("paid")}>Ödendi</Button>
        ) : null}
        {invoice.status !== "cancelled" && invoice.status !== "refunded" ? (
          <Button size="sm" variant="ghost" disabled={isPending} onClick={() => updateStatus("cancelled")}>İptal</Button>
        ) : null}
        {invoice.status === "paid" ? (
          <Button size="sm" variant="ghost" disabled={isPending} onClick={() => updateStatus("refunded")}>İade</Button>
        ) : null}
        {invoice.status !== "draft" ? (
          <>
            <Link href={`/api/pdf/invoice/${invoice.id}`} target="_blank">
              <Button size="sm" variant="ghost">PDF</Button>
            </Link>
            <Link href={`/api/billing/invoices/${invoice.id}/excel`} target="_blank">
              <Button size="sm" variant="ghost">Excel</Button>
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function EntitlementBillingBoard({ hub }: { hub: BillingHub }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Hak Edişler");
  const [period, setPeriod] = useState(hub.period.key);
  const [unitPrice, setUnitPrice] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const [diffUnitPrices, setDiffUnitPrices] = useState<Record<string, number>>({});

  const handleCreateDiffInvoice = (studentId: string) => {
    const price = diffUnitPrices[studentId] ?? 500;
    if (price <= 0) return;
    startTransition(async () => {
      const result = await generateDifferenceInvoiceAction({
        studentId,
        period: hub.period.key,
        unitPrice: price,
      });
      showResult(result, {
        successTitle: "Veli fark faturası oluşturuldu",
        errorTitle: "Hata oluştu",
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  const handleDeleteInvoice = (id: string) => {
    startTransition(async () => {
      const result = await deleteInstitutionInvoiceAction({ id });
      showResult(result, {
        successTitle: "Fatura silindi",
        errorTitle: "Fatura silinemedi",
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  const drafts = hub.invoices.filter((invoice) => invoice.status === "draft" || invoice.status === "approved");
  const issued = hub.invoices.filter((invoice) => ["issued", "paid", "cancelled", "refunded"].includes(invoice.status));
  const totalSessions = hub.entitlements.reduce((sum, item) => sum + item.completedSessions, 0);

  const createDrafts = () => {
    startTransition(async () => {
      const result = await generateEntitlementInvoiceDraftsAction({ period, unitPrice, taxRate });
      showResult(result, {
        successTitle: "Taslaklar oluşturuldu",
        errorTitle: "Taslak oluşturulamadı",
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">Hak Ediş ve Fatura</div>
            <div className="mt-2 text-lg font-semibold text-white">{hub.period.label}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className={cn(inputClassName(), "w-40")}
              type="month"
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value);
                router.push(`/panel/hak-edis?period=${event.target.value}`);
              }}
            />
            <input className={cn(inputClassName(), "w-32")} type="number" min={0} value={unitPrice} onChange={(event) => setUnitPrice(Number(event.target.value))} placeholder="Birim ücret" />
            <input className={cn(inputClassName(), "w-24")} type="number" min={0} max={100} value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value))} placeholder="KDV" />
            <Button disabled={isPending || unitPrice <= 0} onClick={createDrafts}>Taslak oluştur</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-neutral-500">Hak ediş öğrencisi</div>
            <div className="mt-1 text-2xl font-semibold text-white">{hub.entitlements.length}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-neutral-500">Gerçekleşen seans</div>
            <div className="mt-1 text-2xl font-semibold text-white">{totalSessions}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-neutral-500">Fatura kaydı</div>
            <div className="mt-1 text-2xl font-semibold text-white">{hub.invoices.length}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition",
              activeTab === tab ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Hak Edişler" ? (
        <div className="grid gap-3">
          {hub.entitlements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
              Bu ay tamamlanmış seans bulunmuyor.
            </div>
          ) : (
            hub.entitlements.map((item) => (
              <div key={item.studentId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{item.studentName}</div>
                    <div className="mt-1 text-xs text-neutral-500">{item.classroom ?? "Sınıf bilgisi yok"}</div>
                  </div>
                  <div className="text-right text-sm text-neutral-300">{item.completedSessions} seans</div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-neutral-400 sm:grid-cols-4">
                  <div>Bireysel/Telafi: {item.individualSessions}</div>
                  <div>Grup: {item.groupSessions}</div>
                  <div>Telafi: {item.makeupSessions}</div>
                  <div>Fatura: {item.invoice ? invoiceStatusLabel(item.invoice.status) : "Yok"}</div>
                </div>
                {item.warnings.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    {item.warnings.join(" ")}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {activeTab === "Fatura Taslakları" ? (
        <div className="grid gap-3">{drafts.length ? drafts.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} />) : <Empty text="Taslak fatura yok." />}</div>
      ) : null}

      {activeTab === "Kesilen Faturalar" ? (
        <div className="grid gap-3">{issued.length ? issued.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} />) : <Empty text="Kesilen fatura yok." />}</div>
      ) : null}

      {activeTab === "Veli Fark Ücretleri" ? (
        <div className="grid gap-3">
          {hub.entitlements.length === 0 ? (
            <Empty text="Bu ay fark ücreti hesaplanabilecek öğrenci bulunmuyor." />
          ) : (
            hub.entitlements.map((item) => {
              const diffInvoice = hub.invoices.find(
                (inv) =>
                  inv.billingStudentId === item.studentId &&
                  inv.billingSource === "difference"
              );
              const currentPrice = diffUnitPrices[item.studentId] ?? 500;
              const calculatedTotal = item.completedSessions * currentPrice;

              return (
                <div key={item.studentId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-white">{item.studentName}</div>
                      <div className="mt-1 text-xs text-neutral-500">{item.classroom ?? "Sınıf bilgisi yok"}</div>
                      <div className="mt-2 text-sm text-neutral-300">
                        Tamamlanan Seans: <span className="font-medium">{item.completedSessions} seans</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {diffInvoice ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-right">
                            <div className="text-xs text-neutral-500">Tahakkuk Eden Fark</div>
                            <div className="text-sm font-semibold text-white">
                              {money(Number(diffInvoice.quantity) * Number(diffInvoice.unitPrice))}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              ({diffInvoice.invoiceNumber} - {invoiceStatusLabel(diffInvoice.status)})
                            </div>
                          </div>
                          <Link href={`/api/pdf/invoice/${diffInvoice.id}`} target="_blank">
                            <Button size="sm" variant="ghost">PDF</Button>
                          </Link>
                          {diffInvoice.status === "draft" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300"
                              disabled={isPending}
                              onClick={() => handleDeleteInvoice(diffInvoice.id)}
                            >
                              Sil
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-xs text-neutral-500">Öngörülen Toplam</div>
                            <div className="text-sm font-semibold text-amber-400">{money(calculatedTotal)}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              className={cn(inputClassName(), "w-24 px-2 py-1 text-xs")}
                              value={currentPrice}
                              placeholder="Seans Ücreti"
                              onChange={(e) =>
                                setDiffUnitPrices({
                                  ...diffUnitPrices,
                                  [item.studentId]: Number(e.target.value),
                                })
                              }
                            />
                            <span className="text-xs text-neutral-500">TL</span>
                          </div>
                          <Button
                            size="sm"
                            disabled={isPending || currentPrice <= 0}
                            onClick={() => handleCreateDiffInvoice(item.studentId)}
                          >
                            Fark Tahakkuk Et
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {activeTab === "Tahsilatlar" ? (
        <div className="grid gap-4">
          {/* Tahsilat Özet Kartları */}
          {(() => {
            const billableInvoices = hub.invoices.filter((inv) => inv.status !== "cancelled" && inv.status !== "draft");
            const totalInvoiced = billableInvoices.reduce((sum, inv) => sum + invoiceTotal(inv), 0);
            const totalCollected = billableInvoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + invoiceTotal(inv), 0);
            const totalPending = billableInvoices.filter((inv) => ["approved", "issued"].includes(inv.status)).reduce((sum, inv) => sum + invoiceTotal(inv), 0);

            return (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
                  <div className="text-xs text-neutral-500">Toplam Faturalanan</div>
                  <div className="mt-1 text-xl font-semibold text-white">{money(totalInvoiced)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-emerald-500/5 p-4 text-center">
                  <div className="text-xs text-emerald-400">Tahsil Edilen (Ödendi)</div>
                  <div className="mt-1 text-xl font-semibold text-emerald-400">{money(totalCollected)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-amber-500/5 p-4 text-center">
                  <div className="text-xs text-amber-400">Bekleyen Tahsilat</div>
                  <div className="mt-1 text-xl font-semibold text-amber-400">{money(totalPending)}</div>
                </div>
              </div>
            );
          })()}

          {/* Fatura Listesi ve Durum Değiştirme Butonları */}
          <div className="grid gap-3">
            {hub.invoices.length === 0 ? (
              <Empty text="Tahsilat takibi yapılabilecek fatura kaydı bulunmuyor." />
            ) : (
              hub.invoices.map((invoice) => {
                const total = invoiceTotal(invoice);
                const updateStatus = (status: Exclude<InvoiceStatus, "draft">) => {
                  startTransition(async () => {
                    const result = await updateEntitlementInvoiceStatusAction({ id: invoice.id, status });
                    showResult(result, {
                      successTitle: "Durum güncellendi",
                      errorTitle: "Hata oluştu",
                    });
                    if (result.success) {
                      router.refresh();
                    }
                  });
                };

                return (
                  <div key={invoice.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{invoice.invoiceNumber}</span>
                          <span className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-medium border",
                            invoice.billingSource === "difference"
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                          )}>
                            {invoice.billingSource === "difference" ? "Veli Farkı" : "MEB Hak Ediş"}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-neutral-400">
                          {invoice.customerTitle ?? invoice.customerName}
                        </div>
                        <div className="mt-2 text-xs text-neutral-500">
                          Hizmet Dönemi: {invoice.servicePeriod}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-neutral-500">Tutar</div>
                          <div className="text-base font-semibold text-white">{money(total)}</div>
                          <div className="mt-0.5 text-[11px] text-neutral-400">
                            Durum: <span className="font-medium text-white">{invoiceStatusLabel(invoice.status)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                          {["approved", "issued"].includes(invoice.status) ? (
                            <Button size="sm" onClick={() => updateStatus("paid")} disabled={isPending}>
                              Tahsil Edildi (Ödendi)
                            </Button>
                          ) : null}

                          {invoice.status === "paid" ? (
                            <Button size="sm" variant="secondary" onClick={() => updateStatus("refunded")} disabled={isPending}>
                              İade Et
                            </Button>
                          ) : null}

                          {invoice.status === "draft" ? (
                            <Button size="sm" variant="ghost" onClick={() => updateStatus("approved")} disabled={isPending}>
                              Taslağı Onayla
                            </Button>
                          ) : null}

                          {invoice.status !== "cancelled" && invoice.status !== "refunded" ? (
                            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => updateStatus("cancelled")} disabled={isPending}>
                              İptal Et
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "Muhasebe Ayarları" ? <Empty text="e-Fatura/e-Arşiv entegrasyonu için taslak altyapı ayrıldı. Özel entegratör bağlantısı sonraki sürümde API anahtarlarıyla etkinleştirilecek." /> : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
      {text}
    </div>
  );
}
