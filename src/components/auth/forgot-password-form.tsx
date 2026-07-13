"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, AlertCircle, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";

import { requestPasswordResetAction } from "@/app/actions";
import { SpeciaLogoBadge } from "@/components/brand/specia-logo-badge";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";

type ForgotPasswordValues = {
  email: string;
};

export function ForgotPasswordForm() {
  const [feedback, setFeedback] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const { register, handleSubmit, formState } = useForm<ForgotPasswordValues>({
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [cooldownSeconds]);

  const onSubmit = handleSubmit((values) => {
    setFeedback("");
    startTransition(async () => {
      const result = await requestPasswordResetAction(values);
      setFeedback(result.message);
      showResult(result, {
        successTitle: "Sıfırlama maili gönderildi",
        errorTitle: "Sıfırlama maili gönderilemedi",
      });
      if (result.retryAfterSeconds) {
        setCooldownSeconds(result.retryAfterSeconds);
      }
    });
  });

  const firstError = feedback || formState.errors.email?.message || "";

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* -------- Left: Brand / Hero side -------- */}
      <div className="relative hidden items-center justify-center bg-neutral-950 lg:flex">
        {/* logo */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          <SpeciaLogoBadge
            size="lg"
            variant="white"
            frameTone="none"
            className="shadow-none opacity-90"
          />
          <p className="max-w-xs text-center text-sm leading-relaxed text-neutral-500">
            Specia Dijital Eğitim Çözümleri ile eğitim süreçlerini sade ve güvenilir bir düzende yönetin.
          </p>
        </div>
      </div>

      {/* -------- Right: Form side -------- */}
      <div className="flex flex-col bg-neutral-950">
        {/* Mobile logo */}
        <div className="flex justify-center pt-12 lg:hidden">
          <SpeciaLogoBadge
            size="sm"
            variant="white"
            frameTone="none"
            className="shadow-none"
          />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-[400px]">
            {/* Header info */}
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="size-4 text-amber-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                Şifre sıfırlama
              </span>
            </div>
            <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.04em] text-white sm:text-[2.25rem]">
              Şifrenizi sıfırlayın
            </h1>
            <p className="mt-3 text-[15px] text-neutral-500 leading-relaxed">
              Hesabınız bu e-posta ile kayıtlıysa size şifre yenileme bağlantısı gönderilir.
            </p>

            <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
              {/* Email field */}
              <div className="grid gap-2">
                <label className="text-[13px] font-medium text-neutral-400">
                  E-posta
                </label>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-neutral-600 transition-colors group-focus-within:text-neutral-400" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="örnek@email.com"
                    className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-4 text-[15px] text-white outline-none transition-all placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/[0.05] focus:ring-2 focus:ring-white/[0.06]"
                    {...register("email", { required: "E-posta zorunludur." })}
                  />
                </div>
                <span className="text-[12px] text-neutral-600">
                  Bağlantının ulaşması birkaç dakika sürebilir. Lütfen spam kutunuzu kontrol edin.
                </span>
              </div>

              {/* Feedback / Error */}
              {firstError ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/15 bg-rose-500/[0.06] px-3.5 py-3 text-[13px] leading-relaxed text-rose-200/90">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-400" />
                  {firstError}
                </div>
              ) : null}

              {/* Submit */}
              <Button
                type="submit"
                className="mt-1 h-12 text-[15px]"
                disabled={isPending || cooldownSeconds > 0}
              >
                {isPending
                  ? "Bağlantı hazırlanıyor..."
                  : cooldownSeconds > 0
                    ? `Tekrar göndermek için ${cooldownSeconds} sn`
                    : "Sıfırlama Maili Gönder"}
              </Button>
            </form>

            {/* Back button */}
            <div className="mt-8 flex justify-center">
              <Link
                href="/giris"
                className="inline-flex items-center gap-2 text-[14px] text-neutral-500 transition-colors hover:text-white"
              >
                <ArrowLeft className="size-4" />
                Giriş ekranına dön
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center text-[12px] text-neutral-700 sm:px-10">
          © {new Date().getFullYear()} Specia Dijital Eğitim Çözümleri
        </div>
      </div>
    </div>
  );
}
