"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  KeyRound,
  AlertCircle,
  ChevronLeft,
  RotateCw,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";

import { registerUserAction, verifyRegistrationCodeAction } from "@/app/actions";
import { SpeciaLogoBadge } from "@/components/brand/specia-logo-badge";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";

type RegisterValues = {
  name: string;
  email: string;
  password: string;
  inviteCode: string;
};

export function RegisterForm({ defaultInviteCode = "" }: { defaultInviteCode?: string }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingValues, setPendingValues] = useState<RegisterValues | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const { register, handleSubmit, formState, setValue } = useForm<RegisterValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      inviteCode: defaultInviteCode,
    },
  });

  useEffect(() => {
    setValue("inviteCode", defaultInviteCode);
  }, [defaultInviteCode, setValue]);

  const onSubmit = handleSubmit((values) => {
    setFeedback("");
    startTransition(async () => {
      const result = await registerUserAction(values);
      setFeedback(result.message);
      showResult(result, {
        successTitle: "Doğrulama kodu gönderildi",
        errorTitle: "Kayıt başlatılamadı",
      });

      if (result.success) {
        setPendingValues(values);
      }
    });
  });

  function handleVerifyCode() {
    if (!pendingValues) {
      return;
    }

    setFeedback("");
    startTransition(async () => {
      const result = await verifyRegistrationCodeAction({
        email: pendingValues.email,
        code: verificationCode,
      });
      setFeedback(result.message);
      showResult(result, {
        successTitle: "Kayıt onaylandı",
        errorTitle: "Kod doğrulanamadı",
      });

      if (result.success) {
        router.push(`/giris?email=${encodeURIComponent(pendingValues.email)}&verified=1`);
      }
    });
  }

  function handleResendCode() {
    if (!pendingValues) {
      return;
    }

    setFeedback("");
    startTransition(async () => {
      const result = await registerUserAction(pendingValues);
      setFeedback(result.message);
      showResult(result, {
        successTitle: "Kod tekrar gönderildi",
        errorTitle: "Kod tekrar gönderilemedi",
      });
    });
  }

  const firstFormError =
    formState.errors.name?.message ||
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
            {/* ---- Verification step ---- */}
            {pendingValues ? (
              <>
                <div className="mb-1 flex items-center gap-2">
                  <ShieldCheck className="size-5 text-emerald-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                    E-posta doğrulama
                  </span>
                </div>
                <h1 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.04em] text-white sm:text-[2.25rem]">
                  6 haneli kodu girin
                </h1>
                <p className="mt-3 text-[15px] text-neutral-500">
                  <span className="text-neutral-400">{pendingValues.email}</span> adresine
                  gönderilen kodu yazarak kaydı tamamlayın.
                </p>

                <div className="mt-8 grid gap-5">
                  {/* Code input */}
                  <div className="grid gap-2">
                    <label className="text-[13px] font-medium text-neutral-400">
                      Doğrulama kodu
                    </label>
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-center text-lg tracking-[0.35em] text-white outline-none transition-all placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/[0.05] focus:ring-2 focus:ring-white/[0.06]"
                      value={verificationCode}
                      onChange={(event) =>
                        setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                    />
                    <span className="text-[12px] text-neutral-600">Kod 10 dakika boyunca geçerlidir.</span>
                  </div>

                  {/* Feedback */}
                  {feedback ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3 text-[13px] leading-relaxed text-neutral-300">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-neutral-500" />
                      {feedback}
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="grid gap-3">
                    <Button
                      type="button"
                      className="h-12 text-[15px]"
                      disabled={isPending || verificationCode.length !== 6}
                      onClick={handleVerifyCode}
                    >
                      {isPending ? "Doğrulanıyor..." : "Kaydı Onayla"}
                      {!isPending && <ArrowRight className="size-4" />}
                    </Button>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1 h-10 text-[13px]"
                        disabled={isPending}
                        onClick={handleResendCode}
                      >
                        <RotateCw className="size-3.5" />
                        Tekrar Gönder
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex-1 h-10 text-[13px]"
                        disabled={isPending}
                        onClick={() => {
                          setPendingValues(null);
                          setVerificationCode("");
                          setFeedback("");
                        }}
                      >
                        <ChevronLeft className="size-3.5" />
                        Bilgileri Düzenle
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* ---- Registration form ---- */
              <>
                <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.04em] text-white sm:text-[2.25rem]">
                  Hesap oluşturun
                </h1>
                <p className="mt-3 text-[15px] text-neutral-500">
                  Bilgilerinizi girerek yeni bir hesap oluşturun.
                </p>

                <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
                  {/* Name */}
                  <div className="grid gap-2">
                    <label className="text-[13px] font-medium text-neutral-400">
                      Ad soyad
                    </label>
                    <div className="group relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-neutral-600 transition-colors group-focus-within:text-neutral-400" />
                      <input
                        className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-4 text-[15px] text-white outline-none transition-all placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/[0.05] focus:ring-2 focus:ring-white/[0.06]"
                        placeholder="Adınız soyadınız"
                        {...register("name", { required: "Ad soyad zorunludur." })}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="grid gap-2">
                    <label className="text-[13px] font-medium text-neutral-400">
                      E-posta
                    </label>
                    <div className="group relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-neutral-600 transition-colors group-focus-within:text-neutral-400" />
                      <input
                        type="email"
                        autoComplete="email"
                        className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-4 text-[15px] text-white outline-none transition-all placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/[0.05] focus:ring-2 focus:ring-white/[0.06]"
                        placeholder="örnek@email.com"
                        {...register("email", { required: "E-posta zorunludur." })}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="grid gap-2">
                    <label className="text-[13px] font-medium text-neutral-400">
                      Şifre
                    </label>
                    <div className="group relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-neutral-600 transition-colors group-focus-within:text-neutral-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-12 text-[15px] text-white outline-none transition-all placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/[0.05] focus:ring-2 focus:ring-white/[0.06]"
                        placeholder="••••••••"
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

                  {/* Invite code */}
                  <div className="grid gap-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[13px] font-medium text-neutral-400">
                        Davet kodu
                      </label>
                      <div className="group relative flex items-center">
                        <HelpCircle className="size-3.5 cursor-help text-neutral-600 transition-colors hover:text-neutral-400" />
                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-normal leading-normal text-neutral-300 opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100 z-20">
                          Bir kurum tarafından gönderilen davet kodu ile doğrudan ilgili kuruma bağlanabilirsiniz.
                          <div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1 border-b border-r border-white/10 bg-neutral-900 rotate-45" />
                        </div>
                      </div>
                    </div>
                    <div className="group relative">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-neutral-600 transition-colors group-focus-within:text-neutral-400" />
                      <input
                        className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-4 text-[15px] text-white outline-none transition-all placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/[0.05] focus:ring-2 focus:ring-white/[0.06]"
                        placeholder="XXXX-XXXX"
                        {...register("inviteCode")}
                      />
                    </div>
                    {defaultInviteCode ? (
                      <span className="text-[12px] text-neutral-600">
                        QR veya davet bağlantısından otomatik dolduruldu.
                      </span>
                    ) : null}
                  </div>

                  {/* User Agreement Checkbox */}
                  <div className="flex items-start gap-2.5 mt-1">
                    <input
                      type="checkbox"
                      id="agreeTerms"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 size-4 rounded border-white/10 bg-white/5 text-white focus:ring-0 focus:ring-offset-0 accent-white cursor-pointer"
                    />
                    <label htmlFor="agreeTerms" className="text-xs leading-normal text-neutral-500 select-none cursor-pointer">
                      Kayıt olarak{" "}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="font-semibold text-white underline underline-offset-2 transition-colors hover:text-neutral-300 outline-none"
                      >
                        Kullanıcı Sözleşmesi
                      </button>
                      &apos;ni okuduğumu ve kabul ettiğimi onaylıyorum.
                    </label>
                  </div>

                  {/* Errors */}
                  {feedback || firstFormError ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/15 bg-rose-500/[0.06] px-3.5 py-3 text-[13px] leading-relaxed text-rose-200/90">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-400" />
                      {feedback || firstFormError}
                    </div>
                  ) : null}

                  {/* Submit */}
                  <Button type="submit" className="mt-1 h-12 text-[15px]" disabled={isPending || !agreeTerms}>
                    {isPending ? "Kod gönderiliyor..." : "Kayıt Ol"}
                    {!isPending && <ArrowRight className="size-4" />}
                  </Button>

                  <p className="mt-3 text-center text-[12px] text-neutral-500">
                    Kredi kartı gerekmez. Tüm özellikler sınırsız ve tamamen ücretsizdir.
                  </p>
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

            <p className="mt-6 text-center text-[14px] text-neutral-500">
              Zaten hesabınız var mı?{" "}
              <Link
                href="/giris"
                className="font-semibold text-white transition-colors hover:text-neutral-200"
              >
                Giriş yapın
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center text-[12px] text-neutral-700 sm:px-10">
          © {new Date().getFullYear()} Specia Dijital Eğitim Çözümleri
        </div>
      </div>

      {/* -------- User Agreement Modal -------- */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-[28px] border border-white/10 bg-neutral-950/95 p-6 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9)] sm:p-8">
            {/* Modal Header */}
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Kullanıcı Sözleşmesi ve Üyelik Koşulları
              </h2>
              <p className="mt-1.5 text-xs text-neutral-500">
                Lütfen kayıt işlemini tamamlamadan önce sözleşmeyi dikkatlice okuyunuz.
              </p>
            </div>

            {/* Modal Scrollable Body */}
            <div className="mt-6 flex-1 overflow-y-auto pr-1 text-sm text-neutral-400 leading-relaxed space-y-4 scrollbar-thin">
              <section className="space-y-2">
                <h3 className="font-semibold text-white">1. Giriş ve Taraflar</h3>
                <p>
                  İşbu Kullanıcı Sözleşmesi, Specia Dijital Eğitim Çözümleri (bundan böyle &quot;Platform&quot; olarak anılacaktır) ile Platform&apos;a üye olan kullanıcı (bundan böyle &quot;Kullanıcı&quot; olarak anılacaktır) arasında, üyelik kayıt işlemlerinin tamamlanması anında kurulmuş olup karşılıklı hak ve yükümlülükleri düzenlemektedir.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">2. Hizmetin Kapsamı</h3>
                <p>
                  Platform; öğrenci kayıtları, BEP belgeleri, değerlendirmeler, gelişim takibi, belge arşivi, evrak doğrulama, iletişim ve kurum yönetimi süreçleri için geliştirilmiş bulut tabanlı bir dijital eğitim çözümleri alanıdır. Sunulan tüm işlevler yalnızca eğitim, takip ve dokümantasyon amaçlı olup kararlar nihai olarak ilgili uzman/kurum sorumluluğundadır.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">3. Kişisel Veriler ve Veri Güvenliği (KVKK)</h3>
                <p>
                  Kullanıcı, Platform&apos;a kaydettiği tüm öğrenci bilgilerini, gelişim raporlarını ve veli verilerini girmeye tam yetkili olduğunu taahhüt eder. Girilen bu veriler 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında değerlendirilmekte olup, sisteme kaydedilen tüm hassas veriler gelişmiş şifreleme altyapıları ile korunmaktadır. Kullanıcı şifresini ve erişim bilgilerini güvenli bir şekilde saklamakla bizzat yükümlüdür.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">4. Fikri Mülkiyet Hakları</h3>
                <p>
                  Platform yazılımı, tasarımı, kod yapısı, Specia logosu, Specia Dijital Eğitim Çözümleri markası, iş akış tasarımları ve kullanılan özel şablonların tamamının fikri mülkiyet hakları münhasıran Platform sahiplerine aittir. Kullanıcı bu yapıları kopyalayamaz, benzerlerini oluşturamaz veya ticari amaçla Platform dışına transfer edemez.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">5. Hak ve Yükümlülükler</h3>
                <p>
                  Kullanıcı, üyelik formunda verdiği e-posta ve iletişim bilgilerinin doğru olduğunu, doğrulanabilir bir e-posta adresi kullandığını beyan eder. Yanıltıcı bilgi girilmesi halinde Platform, üyelik sürecini tek taraflı askıya alma veya iptal etme hakkını saklı tutar.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">6. Yürürlük ve Kabul</h3>
                <p>
                  Kullanıcı, Platform üzerinde kayıt adımlarını tamamlarken işbu sözleşmeyi dijital ortamda onaylayarak tüm maddelerini özgür iradesiyle kabul ettiğini ve yürürlüğe girdiğini beyan etmiş olur.
                </p>
              </section>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end sm:items-center border-t border-white/5 pt-4">
              <Button
                type="button"
                variant="ghost"
                className="h-10 text-[13px] text-neutral-400 hover:text-white"
                onClick={() => setShowTermsModal(false)}
              >
                Kapat
              </Button>
              <Button
                type="button"
                className="h-10 px-5 text-[13px]"
                onClick={() => {
                  setAgreeTerms(true);
                  setShowTermsModal(false);
                }}
              >
                Okudum, Kabul Ediyorum
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
