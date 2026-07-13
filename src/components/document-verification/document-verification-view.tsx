import Link from "next/link";
import { CheckCircle2, FileCheck2, LockKeyhole, Search, ShieldCheck } from "lucide-react";

import { getRequestIp } from "@/lib/action-security";
import {
  buildSignedDocumentUrl,
  buildVerifiedDocumentSession,
  canAccessIssuedDocument,
  isSecondaryCodeRequired,
  isSecondaryCodeValid,
  logDocumentSecurityEvent,
  raiseDocumentAccessAlarm,
} from "@/lib/document-access-security";
import { getIssuedPdfDocumentLabel, normalizeVerificationCode } from "@/lib/issued-pdf-documents";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, purgeExpiredRateLimits } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";

const DOCUMENT_VERIFICATION_LOOKUP_LIMIT = 12;
const DOCUMENT_VERIFICATION_LOOKUP_WINDOW_MS = 1000 * 60 * 10;

type DocumentVerificationViewProps = {
  searchParams: Promise<{ code?: string; secCode?: string }>;
  backHref: string;
  backLabel: string;
};

const panelSurface =
  "rounded-[16px] border border-[color:var(--panel-border)] bg-[linear-gradient(180deg,var(--panel-bg-elevated),var(--panel-bg-base))] shadow-[var(--panel-shadow)]";
const panelSubtleSurface =
  "rounded-[16px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]";
const inputClass =
  "h-11 w-full rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] px-3.5 text-sm text-[color:var(--panel-text)] outline-none transition placeholder:text-[color:var(--panel-text-soft)] focus:border-[color:var(--panel-border-strong)]";
const primaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[color:var(--panel-text)] px-4 text-sm font-semibold text-[#09090b] transition hover:bg-white";
const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-elevated)] px-3.5 text-sm font-semibold text-[color:var(--panel-text)] transition hover:bg-[color:var(--panel-bg-hover)]";

export async function DocumentVerificationView({
  searchParams,
  backHref,
  backLabel,
}: DocumentVerificationViewProps) {
  const user = await requireUser();
  const { code, secCode } = await searchParams;
  const verificationCode = normalizeVerificationCode(code);
  let rateLimitMessage: string | null = null;

  if (verificationCode) {
    await purgeExpiredRateLimits();
    const requestIp = await getRequestIp();
    const rateLimit = await consumeRateLimit({
      action: "document_verification.lookup",
      key: `ip:${requestIp}`,
      limit: DOCUMENT_VERIFICATION_LOOKUP_LIMIT,
      windowMs: DOCUMENT_VERIFICATION_LOOKUP_WINDOW_MS,
      blockMs: DOCUMENT_VERIFICATION_LOOKUP_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      rateLimitMessage = `Çok fazla evrak kontrol denemesi yapıldı. Lütfen ${Math.max(Math.ceil(rateLimit.retryAfterMs / 1000), 1)} saniye sonra tekrar deneyin.`;
      await raiseDocumentAccessAlarm({
        ip: requestIp,
        code: verificationCode,
        reason: "lookup_rate_limit",
      });
    }
  }

  const record =
    verificationCode && !rateLimitMessage
      ? await prisma.issuedPdfDocument.findUnique({
          where: { verificationCode },
          select: {
            id: true,
            verificationCode: true,
            title: true,
            documentType: true,
            fileName: true,
            issuedAt: true,
            studentId: true,
            institutionId: true,
            issuedById: true,
          },
        })
      : null;

  let authError: string | null = null;
  let isSecCodeRequired = false;
  let isSecCodeValid = false;
  let secCodeError: string | null = null;

  if (record) {
    let isParentLinked = false;
    if (user.role === "parent") {
      const link = await prisma.parentStudentLink.findFirst({
        where: {
          parentId: user.id,
          studentId: record.studentId || "",
        },
        select: { id: true },
      });
      isParentLinked = Boolean(link);
    }

    if (!canAccessIssuedDocument(user, record, { isParentLinked })) {
      authError = "Bu belgeyi görüntüleme yetkiniz bulunmuyor.";
    }

    if (!authError) {
      isSecCodeRequired = isSecondaryCodeRequired(user, record);

      if (isSecCodeRequired && secCode) {
        if (await isSecondaryCodeValid(record, secCode)) {
          isSecCodeValid = true;
        } else {
          secCodeError = "Geçersiz veya süresi dolmuş güvenlik kodu.";
          const requestIp = await getRequestIp();
          await logDocumentSecurityEvent({
            action: "document_verification.sec_code_failed",
            code: verificationCode,
            ip: requestIp,
            userAgent: null,
            status: "blocked",
            reason: "invalid_secondary_security_code",
            documentId: record.id,
          });
          await raiseDocumentAccessAlarm({
            ip: requestIp,
            code: verificationCode,
            reason: "sec_code_failure",
          });
        }
      }
    }
  }

  return (
    <div className="grid w-full gap-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className={`${panelSurface} p-5 sm:p-6`}>
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] text-[color:var(--panel-text)]">
              <FileCheck2 className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--panel-text)]">
                Belge numarası ile doğrulama yapın
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--panel-text-muted)]">
                Resmî evrak alanındaki belge numarasını girin. Kayıt bulunduğunda aynı PDF’i
                doğrudan görüntüleyebilir ve indirebilirsiniz.
              </p>
            </div>
          </div>

          <form className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]" method="get">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--panel-text-soft)]">
                Belge numarası
              </span>
              <input
                name="code"
                defaultValue={verificationCode}
                placeholder="Örnek: SPC-RPT-260328-AB12CD"
                className={inputClass}
              />
            </label>
            <div className="flex items-end">
              <button type="submit" className={`${primaryButtonClass} w-full lg:w-auto`}>
                <Search className="size-4" aria-hidden="true" />
                Belgeyi Doğrula
              </button>
            </div>
          </form>

          {rateLimitMessage ? (
            <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
              {rateLimitMessage}
            </div>
          ) : null}

          {verificationCode && !record && !rateLimitMessage && !authError ? (
            <div className="mt-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
              Belge doğrulaması tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.
            </div>
          ) : null}

          {authError ? (
            <div className="mt-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
              {authError}
            </div>
          ) : null}
        </section>

        <aside className={`${panelSubtleSurface} p-5`}>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] text-[color:var(--panel-text)]">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[color:var(--panel-text)]">
                Kontrol akışı
              </div>
              <div className="text-xs text-[color:var(--panel-text-soft)]">
                Kod ile belgeye güvenli erişim
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 text-sm text-[color:var(--panel-text-muted)]">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden="true" />
              Belge numarası doğrulanır.
            </div>
            <div className="flex gap-3">
              <LockKeyhole className="mt-0.5 size-4 shrink-0 text-sky-300" aria-hidden="true" />
              Gerekirse ikinci güvenlik kodu istenir.
            </div>
            <div className="flex gap-3">
              <FileCheck2 className="mt-0.5 size-4 shrink-0 text-[color:var(--panel-text-soft)]" aria-hidden="true" />
              Yetkili kullanıcı PDF’i görüntüler veya indirir.
            </div>
          </div>
        </aside>
      </div>

      {record && !authError && isSecCodeRequired && !isSecCodeValid ? (
        <div className={`${panelSurface} p-5 sm:p-6`}>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
            Güvenlik Kontrolü
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--panel-text)]">
            İkinci doğrulama kodu gerekli
          </h2>
          <p className="mt-3 text-sm leading-7 text-[color:var(--panel-text-muted)]">
            Bu belge ikinci bir güvenlik katmanı ile korunuyor. Lütfen belgeyi düzenleyen öğretmen, kurum yöneticisi veya admin hesabından alacağınız 6 haneli güvenlik kodunu girin.
          </p>
          <form className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" method="get">
            <input type="hidden" name="code" value={verificationCode} />
            <input
              name="secCode"
              placeholder="6 Haneli Güvenlik Kodu"
              maxLength={6}
              className={inputClass}
            />
            <button type="submit" className={primaryButtonClass}>
              Onayla
            </button>
          </form>
          {secCodeError ? (
            <div className="mt-4 text-sm font-medium text-rose-400">
              {secCodeError}
            </div>
          ) : null}
        </div>
      ) : null}

      {record && !authError && (!isSecCodeRequired || isSecCodeValid) ? (
        (() => {
          const docSession = isSecCodeValid ? buildVerifiedDocumentSession(record.verificationCode) : null;
          const viewUrl = buildSignedDocumentUrl({ code: record.verificationCode }) + (docSession ? `&docSession=${docSession}` : "");
          const downloadUrl = buildSignedDocumentUrl({
            code: record.verificationCode,
            download: true,
          }) + (docSession ? `&docSession=${docSession}` : "");

          return (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className={`${panelSubtleSurface} p-5`}>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                    Belge Türü
                  </div>
                  <div className="mt-3 text-lg font-semibold text-[color:var(--panel-text)]">
                    {getIssuedPdfDocumentLabel(record.documentType)}
                  </div>
                </div>
                <div className={`${panelSubtleSurface} p-5`}>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                    Belge No
                  </div>
                  <div className="mt-3 text-lg font-semibold text-[color:var(--panel-text)]">{record.verificationCode}</div>
                </div>
                <div className={`${panelSubtleSurface} p-5`}>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                    Oluşturma Tarihi
                  </div>
                  <div className="mt-3 text-lg font-semibold text-[color:var(--panel-text)]">
                    {record.issuedAt.toLocaleString("tr-TR")}
                  </div>
                </div>
              </div>

              <div className={`${panelSurface} p-4 sm:p-6`}>
                <div className="flex flex-col gap-4 border-b border-[color:var(--panel-border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                      Kayıtlı PDF
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--panel-text)]">
                      {record.title}
                    </h2>
                    <p className="mt-2 text-sm text-[color:var(--panel-text-muted)]">{record.fileName}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={viewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={secondaryButtonClass}
                    >
                      PDF’i Gör
                    </a>
                    <a
                      href={downloadUrl}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[color:var(--panel-text)] px-3.5 text-sm font-semibold text-[#09090b] transition hover:bg-white"
                    >
                      PDF’i İndir
                    </a>
                  </div>
                </div>

                <iframe
                  title={record.title}
                  src={viewUrl}
                  className="mt-6 h-[70vh] w-full rounded-[16px] border border-[color:var(--panel-border)] bg-white"
                />
              </div>
            </>
          );
        })()
      ) : null}

      <div className="flex justify-start">
        <Link
          href={backHref}
          className="text-sm text-[color:var(--panel-text-muted)] transition hover:text-[color:var(--panel-text)]"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
