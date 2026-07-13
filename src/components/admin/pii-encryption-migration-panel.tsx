"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, KeyRound, LockKeyhole, Play, Search, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";

const CONFIRMATION_TEXT = "SIFRELEMEYI BASLAT";

type MigrationStats = {
  label: string;
  total: number;
  encrypted: number;
  skipped: number;
  errors: number;
};

type MigrationCursor = {
  modelIndex: number;
  recordCursor?: string;
};

type MigrationResponse = {
  dryRun: boolean;
  totals: {
    total: number;
    encrypted: number;
    skipped: number;
    errors: number;
  };
  results: MigrationStats[];
  confirmationText?: string;
  nextCursor?: MigrationCursor;
  done?: boolean;
  progress?: {
    currentModelIndex: number;
    totalModels: number;
    currentModelLabel?: string;
  };
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
};

async function runMigrationRequest(input: {
  dryRun: boolean;
  operationPin: string;
  confirmationText?: string;
  cursor?: MigrationCursor;
}) {
  const response = await fetch("/api/admin/pii-encryption-migration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const responseText = await response.text();
  let payload: ApiEnvelope<MigrationResponse>;

  try {
    payload = JSON.parse(responseText) as ApiEnvelope<MigrationResponse>;
  } catch {
    throw new Error(
      response.status === 504 || response.status === 500
        ? "Şifreleme işlemi sunucu süresine takıldı. Sayfayı yenileyip işlemi tekrar başlatın; sistem kaldığı yerden şifreli kayıtları atlayarak devam eder."
        : "Sunucudan beklenen formatta yanıt alınamadı.",
    );
  }

  if (!response.ok || !payload.success || !payload.data) {
    const message = payload.error?.message ?? payload.message ?? "İşlem tamamlanamadı.";
    const technicalPatternMessage = /expected pattern|did not match.*pattern|string.*pattern/i.test(message);
    throw new Error(
      technicalPatternMessage
        ? "Operasyon kodu 6 haneli rakam olmalıdır. Vercel env değerini ve girdiğiniz kodu kontrol edin."
        : message,
    );
  }

  return {
    message: payload.message ?? "İşlem başarılı.",
    data: payload.data,
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function emptyMigrationResult(dryRun: boolean): MigrationResponse {
  return {
    dryRun,
    totals: { total: 0, encrypted: 0, skipped: 0, errors: 0 },
    results: [],
    done: false,
  };
}

function mergeMigrationResults(current: MigrationResponse, next: MigrationResponse): MigrationResponse {
  const rows = new Map<string, MigrationStats>();
  for (const row of current.results) {
    rows.set(row.label, { ...row });
  }
  for (const row of next.results) {
    const existing = rows.get(row.label);
    rows.set(row.label, {
      label: row.label,
      total: (existing?.total ?? 0) + row.total,
      encrypted: (existing?.encrypted ?? 0) + row.encrypted,
      skipped: (existing?.skipped ?? 0) + row.skipped,
      errors: (existing?.errors ?? 0) + row.errors,
    });
  }

  const results = Array.from(rows.values());
  return {
    ...next,
    totals: results.reduce(
      (acc, item) => ({
        total: acc.total + item.total,
        encrypted: acc.encrypted + item.encrypted,
        skipped: acc.skipped + item.skipped,
        errors: acc.errors + item.errors,
      }),
      { total: 0, encrypted: 0, skipped: 0, errors: 0 },
    ),
    results,
  };
}

export function PiiEncryptionMigrationPanel() {
  const [operationPin, setOperationPin] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [lastMessage, setLastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [result, setResult] = useState<MigrationResponse | null>(null);

  const canSubmit = /^\d{6}$/.test(operationPin) && !isRunning;
  const hasEncryptableRecords = (result?.totals.encrypted ?? 0) > 0;
  const resultRows = useMemo(
    () => result?.results.filter((row) => row.total > 0 || row.encrypted > 0 || row.errors > 0) ?? [],
    [result],
  );

  async function handleRun(dryRun: boolean) {
    setLastMessage(null);

    if (!/^\d{6}$/.test(operationPin)) {
      setLastMessage({ type: "error", text: "Vercel operasyon kodu 6 haneli olmalıdır." });
      return;
    }

    if (!dryRun) {
      const confirmed = window.confirm(
        "Bu işlem canlı veritabanındaki açık metin hassas verileri şifreler. Devam etmek istiyor musunuz?",
      );
      if (!confirmed) return;
    }

    setIsRunning(true);
    try {
      let cursor: MigrationCursor | undefined;
      let aggregate = emptyMigrationResult(dryRun);
      let message = "";

      do {
        const nextResult = await runMigrationRequest({
          dryRun,
          operationPin: operationPin.trim(),
          confirmationText: dryRun ? undefined : CONFIRMATION_TEXT,
          cursor,
        });
        aggregate = mergeMigrationResults(aggregate, nextResult.data);
        cursor = nextResult.data.nextCursor;
        message = nextResult.message;
        setResult(aggregate);

        const progress = nextResult.data.progress;
        setLastMessage({
          type: "success",
          text: progress?.currentModelLabel
            ? `${progress.currentModelLabel} işlendi (${Math.min(progress.currentModelIndex + 1, progress.totalModels)}/${progress.totalModels}).`
            : "İşlem devam ediyor.",
        });
      } while (cursor);

      setLastMessage({ type: "success", text: message });
    } catch (error) {
      setLastMessage({
        type: "error",
        text: error instanceof Error ? error.message : "İşlem sırasında hata oluştu.",
      });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--panel-text-soft)]">
            <LockKeyhole className="size-4" />
            Veri Şifreleme
          </div>
          <h3 className="mt-2 text-lg font-semibold text-[color:var(--panel-text)]">
            Hassas verileri sistem ortamında şifrele
          </h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--panel-text-muted)]">
            İşlem yalnızca admin oturumuyla ve Vercel&apos;de tanımlanan 6 haneli operasyon koduyla çalışır.
            Analiz modu veritabanına yazmaz; başlat modu açık metin kayıtları şifreler.
          </p>
        </div>
        <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] px-4 py-3 text-sm text-[color:var(--panel-text-muted)]">
          <div className="flex items-center gap-2 font-semibold text-[color:var(--panel-text)]">
            <ShieldAlert className="size-4" />
            Çift onaylı işlem
          </div>
          <div className="mt-1">Admin oturumu + operasyon kodu + gerçek işlem onayı.</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
        <Field label="Operasyon kodu" hint="Vercel env: PII_ENCRYPTION_MIGRATION_PIN">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--panel-text-soft)]" />
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={operationPin}
              onChange={(event) => setOperationPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6 haneli kod"
              className={`${inputClassName()} pl-10`}
            />
          </div>
        </Field>

        <Button
          type="button"
          variant="secondary"
          disabled={!canSubmit}
          onClick={() => handleRun(true)}
          className="w-full lg:w-auto"
        >
          <Search className="size-4" />
          {isRunning ? "Çalışıyor..." : "Şifreleme Analizi"}
        </Button>

        <Button
          type="button"
          variant="danger"
          disabled={!canSubmit || !hasEncryptableRecords}
          onClick={() => handleRun(false)}
          className="w-full lg:w-auto"
        >
          <Play className="size-4" />
          Şifrelemeyi Başlat
        </Button>
      </div>

      {lastMessage ? (
        <div
          className={`mt-4 rounded-[var(--panel-radius-card)] border p-4 text-sm ${
            lastMessage.type === "success"
              ? "border-[color:var(--panel-success-border)] bg-[color:var(--panel-success-bg)] text-[color:var(--panel-success-text)]"
              : "border-[color:var(--panel-danger-border)] bg-[color:var(--panel-danger-bg)] text-[color:var(--panel-danger-text)]"
          }`}
        >
          {lastMessage.text}
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--panel-text-soft)]">
                Mod
              </div>
              <div className="mt-2 text-xl font-semibold text-[color:var(--panel-text)]">
                {result.dryRun ? "Analiz" : "Gerçek İşlem"}
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--panel-text-soft)]">
                Kayıt
              </div>
              <div className="mt-2 text-xl font-semibold text-[color:var(--panel-text)]">
                {formatNumber(result.totals.total)}
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--panel-text-soft)]">
                Şifrelenecek
              </div>
              <div className="mt-2 text-xl font-semibold text-[color:var(--panel-text)]">
                {formatNumber(result.totals.encrypted)}
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--panel-text-soft)]">
                Hata
              </div>
              <div className="mt-2 flex items-center gap-2 text-xl font-semibold text-[color:var(--panel-text)]">
                {result.totals.errors === 0 ? <CheckCircle2 className="size-5 text-emerald-500" /> : null}
                {formatNumber(result.totals.errors)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead>
                <tr className="text-left text-[color:var(--panel-text-soft)]">
                  <th className="px-4 py-3 font-medium sm:px-5">Tablo</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Toplam</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Şifrelenecek</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Atlanan</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Hata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {resultRows.length > 0 ? (
                  resultRows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-3 font-semibold text-[color:var(--panel-text)] sm:px-5">
                        {row.label}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--panel-text-muted)] sm:px-5">
                        {formatNumber(row.total)}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--panel-text-muted)] sm:px-5">
                        {formatNumber(row.encrypted)}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--panel-text-muted)] sm:px-5">
                        {formatNumber(row.skipped)}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--panel-text-muted)] sm:px-5">
                        {formatNumber(row.errors)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[color:var(--panel-text-soft)]">
                      Şifrelenecek açık metin kayıt bulunmadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
