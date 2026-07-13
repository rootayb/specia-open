"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { SpeciaLogoBadge } from "@/components/brand/specia-logo-badge";
import { useActionToast } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";

type LoginValues = {
  email: string;
  password: string;
};

type Props = {
  maintenanceActive?: boolean;
  maintenanceEndsAt?: string | null;
  defaultEmail?: string;
  verified?: boolean;
  callbackUrl?: string;
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function LoginForm({
  maintenanceActive = false,
  maintenanceEndsAt,
  defaultEmail = "",
  verified = false,
  callbackUrl = "/panel",
}: Props) {
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorEmail, setTwoFactorEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showToast } = useActionToast();
  const { register, handleSubmit, formState } = useForm<LoginValues>({
    defaultValues: {
      email: defaultEmail,
      password: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError("");
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        callbackUrl,
        redirect: false,
      });

      if (result?.error === "2FA_REQUIRED") {
        setTwoFactorEmail(values.email);
        setStep("2fa");
        setTwoFactorCode("");
        showToast({
          title: "İki adımlı doğrulama gerekli",
          message: "Lütfen e-posta adresinize gönderilen güvenlik kodunu girin.",
          tone: "info",
        });
        return;
      }

      if (result?.error || !result?.ok) {
        setServerError("E-posta veya şifre hatalı.");
        showToast({
          title: "Giriş yapılamadı",
          message: "E-posta veya şifre hatalı.",
          tone: "error",
        });
        return;
      }

      showToast({
        title: "Giriş başarılı",
        message: "Panel açılıyor.",
        tone: "success",
      });
      router.replace(result.url ?? callbackUrl);
      router.refresh();
    });
  });

  const onVerifyTwoFactor = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    startTransition(async () => {
      const result = await signIn("2fa-credentials", {
        email: twoFactorEmail,
        code: twoFactorCode,
        callbackUrl,
        redirect: false,
      });

      if (result?.error || !result?.ok) {
        setServerError("Doğrulama kodu hatalı veya süresi dolmuş.");
        showToast({
          title: "Doğrulama başarısız",
          message: "Doğrulama kodu hatalı veya süresi dolmuş.",
          tone: "error",
        });
        return;
      }

      showToast({
        title: "Giriş başarılı",
        message: "Oturum açıldı, yönlendiriliyorsunuz.",
        tone: "success",
      });
      router.replace(result.url ?? callbackUrl);
      router.refresh();
    });
  };

  const firstError =
    serverError ||
    formState.errors.email?.message ||
    formState.errors.password?.message ||
    "";

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
            {step === "credentials" ? (
              <>
                <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.04em] text-white sm:text-[2.25rem]">
                  Giriş yapın
                </h1>
                <p className="mt-3 text-[15px] text-neutral-500">
                  Panele erişmek için e-posta ve şifrenizi girin.
                </p>

                {/* Maintenance banner */}
                {maintenanceActive ? (
                  <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3.5">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                    <p className="text-sm leading-relaxed text-amber-200/90">
                      Bakım modu aktif. Erişim akışı geçici olarak sınırlandırıldı.
                      {formatDateTime(maintenanceEndsAt)
                        ? ` Planlanan bitiş: ${formatDateTime(maintenanceEndsAt)}.`
                        : ""}
                    </p>
                  </div>
                ) : null}

                {/* Verified banner */}
                {verified ? (
                  <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3.5">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                    <p className="text-sm leading-relaxed text-emerald-200/90">
                      Kaydınız onaylandı. Giriş yapabilirsiniz.
                    </p>
                  </div>
                ) : null}

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
                  </div>

                  {/* Password field */}
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-medium text-neutral-400">
                        Şifre
                      </label>
                      <Link
                        href="/sifremi-unuttum"
                        className="text-[13px] font-medium text-neutral-500 transition-colors hover:text-white"
                      >
                        Şifremi unuttum
                      </Link>
                    </div>
                    <div className="group relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-neutral-600 transition-colors group-focus-within:text-neutral-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-12 text-[15px] text-white outline-none transition-all placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/[0.05] focus:ring-2 focus:ring-white/[0.06]"
                        {...register("password", { required: "Şifre zorunludur." })}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 transition-colors hover:text-neutral-300"
                      >
                        {showPassword ? (
                          <EyeOff className="size-[18px]" />
                        ) : (
                          <Eye className="size-[18px]" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {firstError ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/15 bg-rose-500/[0.06] px-3.5 py-3 text-[13px] leading-relaxed text-rose-200/90">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-400" />
                      {firstError}
                    </div>
                  ) : null}

                  {/* Submit */}
                  <Button type="submit" className="mt-1 h-12 text-[15px]" disabled={isPending}>
                    {isPending ? "Giriş yapılıyor..." : "Giriş Yap"}
                    {!isPending && <ArrowRight className="size-4" />}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.04em] text-white sm:text-[2.25rem]">
                  Güvenlik kodu
                </h1>
                <p className="mt-3 text-[15px] text-neutral-500">
                  {twoFactorEmail} adresine gönderilen 6 haneli iki adımlı doğrulama kodunu girin.
                </p>

                <form className="mt-8 grid gap-5" onSubmit={onVerifyTwoFactor}>
                  <div className="grid gap-2">
                    <label className="text-[13px] font-medium text-neutral-400">
                      Doğrulama Kodu
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                      className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-center font-mono text-xl tracking-[0.25em] text-white outline-none transition-all placeholder:text-neutral-700 focus:border-white/20 focus:bg-white/[0.05]"
                      required
                    />
                  </div>

                  {/* Error */}
                  {serverError ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/15 bg-rose-500/[0.06] px-3.5 py-3 text-[13px] leading-relaxed text-rose-200/90">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-400" />
                      {serverError}
                    </div>
                  ) : null}

                  {/* Submit */}
                  <Button type="submit" className="mt-1 h-12 text-[15px]" disabled={isPending || twoFactorCode.length !== 6}>
                    {isPending ? "Doğrulanıyor..." : "Kodu Doğrula"}
                    {!isPending && <ArrowRight className="size-4" />}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("credentials");
                      setServerError("");
                    }}
                    className="text-center text-sm font-medium text-neutral-500 transition-colors hover:text-white"
                  >
                    Şifre ile Giriş Ekranına Dön
                  </button>
                </form>
              </>
            )}

            {/* Divider */}
            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-neutral-950 px-4 text-[13px] text-neutral-600">
                  veya
                </span>
              </div>
            </div>

            {/* Google Login Button */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setServerError("");
                startTransition(async () => {
                  await signIn("google", { callbackUrl });
                });
              }}
              className="mt-4 h-12 w-full text-[15px] flex items-center justify-center gap-3 transition-colors"
              disabled={isPending}
            >
              <GoogleIcon className="size-5 shrink-0" />
              Google ile Giriş Yap
            </Button>

            <p className="mt-6 text-center text-[14px] text-neutral-500">
              Hesabınız yok mu?{" "}
              <Link
                href="/kayit"
                className="font-semibold text-white transition-colors hover:text-neutral-200"
              >
                Kayıt olun
              </Link>
            </p>
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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}
