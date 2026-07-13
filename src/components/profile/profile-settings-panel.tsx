"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";

import {
  changePasswordAction,
  closeAccountAction,
  updateProfileAction,
  revokeWebSessionAction,
  revokeTrustedWebDeviceAction,
  sendTwoFactorCodeAction,
  verifyAndEnableTwoFactorAction,
  verifyAndDisableTwoFactorAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import { cleanDeviceLabel, getDeviceDetails } from "@/lib/user-agent";

type ProfileForm = {
  name: string;
  email: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type DangerForm = {
  password: string;
  confirmationText: string;
};

interface WebSessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActive: string;
}

interface TrustedWebDeviceInfo {
  id: string;
  deviceLabel: string | null;
  lastUsedAt: string;
}

export function ProfileSettingsPanel({
  user,
  twoFactorEnabled: initialTwoFactorEnabled,
  currentSessionId,
  initialSessions,
  initialTrustedDevices,
}: {
  user: {
    name: string;
    email: string;
  };
  twoFactorEnabled: boolean;
  currentSessionId?: string;
  initialSessions?: WebSessionInfo[];
  initialTrustedDevices?: TrustedWebDeviceInfo[];
}) {
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: user.name,
    email: user.email,
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [dangerForm, setDangerForm] = useState<DangerForm>({
    password: "",
    confirmationText: "",
  });
  const [sessions, setSessions] = useState<WebSessionInfo[]>(initialSessions || []);
  const [trustedDevices, setTrustedDevices] = useState<TrustedWebDeviceInfo[]>(
    initialTrustedDevices || [],
  );

  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(initialTwoFactorEnabled);
  const [twoFactorStep, setTwoFactorStep] = useState<"idle" | "verify_enable" | "verify_disable">("idle");
  const [twoFactorCode, setTwoFactorCode] = useState<string>("");
  const [twoFactorMessage, setTwoFactorMessage] = useState<string>("");

  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [dangerMessage, setDangerMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  return (
    <div className="grid gap-6">
      {/* Profil Bilgileri */}
      <Card>
        <div>
          <div className="space-y-2">
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--panel-text-soft)]">
              Profil
            </div>
            <div className="text-2xl font-semibold text-[color:var(--panel-text)]">
              Temel hesap bilgileri
            </div>
            <p className="text-sm text-[color:var(--panel-text-muted)]">
              Ad soyad ve e-posta bilgilerinizi güncelleyebilirsiniz.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Ad soyad">
            <input
              className={inputClassName()}
              value={profileForm.name}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </Field>
          <Field label="E-posta">
            <input
              className={inputClassName()}
              type="email"
              value={profileForm.email}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateProfileAction(profileForm);
                setProfileMessage(result.message);
                showResult(result, {
                  successTitle: "Profil kaydedildi",
                  errorTitle: "Profil kaydedilemedi",
                });
              })
            }
          >
            {isPending ? "Kaydediliyor..." : "Profili Kaydet"}
          </Button>
          {profileMessage ? (
            <div className="text-sm text-[color:var(--panel-text-muted)]">{profileMessage}</div>
          ) : null}
        </div>
      </Card>

      {/* Şifre Değiştirme */}
      <Card>
        <div className="space-y-2">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--panel-text-soft)]">
            Güvenlik
          </div>
          <div className="text-2xl font-semibold text-[color:var(--panel-text)]">
            Şifre değiştir
          </div>
          <p className="text-sm text-[color:var(--panel-text-muted)]">
            Hesap güvenliğiniz için şifrenizi belirli aralıklarla güncelleyin. Şifrenizi değiştirmek için mevcut şifrenizi girmeniz gerekmektedir.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Field label="Mevcut şifre">
            <input
              className={inputClassName()}
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  currentPassword: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Yeni şifre">
            <input
              className={inputClassName()}
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
              }
            />
          </Field>
          <Field label="Yeni şifre tekrar">
            <input
              className={inputClassName()}
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await changePasswordAction(passwordForm);
                setPasswordMessage(result.message);
                showResult(result, {
                  successTitle: "Şifre güncellendi",
                  errorTitle: "Şifre güncellenemedi",
                });
                if (result.success) {
                  setPasswordForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }
              })
            }
          >
            {isPending ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </Button>
          {passwordMessage ? (
            <div className="text-sm text-[color:var(--panel-text-muted)]">{passwordMessage}</div>
          ) : null}
        </div>
      </Card>

      {/* İki Adımlı Doğrulama (2FA) */}
      <Card>
        <div className="space-y-2">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--panel-text-soft)]">
            Güvenlik Katmanı
          </div>
          <div className="text-2xl font-semibold text-[color:var(--panel-text)]">
            İki adımlı doğrulama (2FA)
          </div>
          <p className="text-sm text-[color:var(--panel-text-muted)]">
            Hesabınızın güvenliğini artırmak için e-posta ile iki adımlı doğrulamayı aktifleştirin. Giriş yaparken e-posta adresinize gönderilen tek kullanımlık şifreyi girmeniz istenir.
          </p>
        </div>

        <div className="mt-6">
          {twoFactorStep === "idle" ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className={`size-3 rounded-full ${twoFactorEnabled ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                <span className="text-sm font-semibold text-[color:var(--panel-text)]">
                  {twoFactorEnabled ? "İki adımlı doğrulama aktif." : "İki adımlı doğrulama pasif."}
                </span>
              </div>
              <div>
                <Button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      setTwoFactorMessage("");
                      const result = await sendTwoFactorCodeAction();
                      showResult(result, {
                        successTitle: "Kod gönderildi",
                        errorTitle: "Kod gönderilemedi",
                      });
                      if (result.success) {
                        setTwoFactorStep(twoFactorEnabled ? "verify_disable" : "verify_enable");
                        setTwoFactorCode("");
                      } else {
                        setTwoFactorMessage(result.message);
                      }
                    })
                  }
                >
                  {twoFactorEnabled ? "2FA Devre Dışı Bırak" : "2FA Etkinleştir"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 max-w-md">
              <div className="text-sm text-[color:var(--panel-text)]">
                {twoFactorStep === "verify_enable"
                  ? "2FA'yı aktifleştirmek için e-postanıza gönderilen 6 haneli güvenlik kodunu girin:"
                  : "2FA'yı kapatmak için e-postanıza gönderilen 6 haneli güvenlik kodunu girin:"}
              </div>
              <Field label="Doğrulama Kodu">
                <input
                  className={inputClassName()}
                  placeholder="000000"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                />
              </Field>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={isPending || twoFactorCode.length !== 6}
                  onClick={() =>
                    startTransition(async () => {
                      setTwoFactorMessage("");
                      const result =
                        twoFactorStep === "verify_enable"
                          ? await verifyAndEnableTwoFactorAction(twoFactorCode)
                          : await verifyAndDisableTwoFactorAction(twoFactorCode);
                      
                      showResult(result, {
                        successTitle: twoFactorStep === "verify_enable" ? "2FA Etkinleştirildi" : "2FA Kapatıldı",
                        errorTitle: "Hata",
                      });

                      if (result.success) {
                        setTwoFactorEnabled(twoFactorStep === "verify_enable");
                        setTwoFactorStep("idle");
                        setTwoFactorCode("");
                      } else {
                        setTwoFactorMessage(result.message);
                      }
                    })
                  }
                >
                  {twoFactorStep === "verify_enable" ? "Onayla ve Aktif Et" : "Onayla ve Kapat"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => {
                    setTwoFactorStep("idle");
                    setTwoFactorMessage("");
                    setTwoFactorCode("");
                  }}
                >
                  İptal
                </Button>
              </div>
            </div>
          )}

          {twoFactorMessage ? (
            <div className={`mt-3 text-sm font-medium ${twoFactorMessage.includes("basariyla") ? "text-emerald-400" : "text-rose-400"}`}>
              {twoFactorMessage}
            </div>
          ) : null}
        </div>
      </Card>

      {/* Aktif Oturumlar */}
      <Card>
        <div className="space-y-2">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--panel-text-soft)]">
            Hesap Güvenliği
          </div>
          <div className="text-2xl font-semibold text-[color:var(--panel-text)]">
            Aktif Oturumlar
          </div>
          <p className="text-sm text-[color:var(--panel-text-muted)]">
            Hesabınızın web üzerinden açık olduğu oturumları izleyin. Her cihaz tek satırda gösterilir; şüpheli bir işlem fark ederseniz oturumu uzaktan kapatabilirsiniz.
          </p>
        </div>

        <div className="mt-6 divide-y divide-[color:var(--panel-border)]">
          {sessions.map((session) => {
            const isCurrent = session.id === currentSessionId;
            const device = getDeviceDetails(session.userAgent);
            const activeDate = new Date(session.lastActive).toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div key={session.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[color:var(--panel-text)]">
                      {device}
                    </span>
                    {isCurrent && <Badge tone="info">Bu Cihaz</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--panel-text-muted)]">
                    <span>IP: {session.ipAddress || "Bilinmiyor"}</span>
                    <span>Son aktiflik: {activeDate}</span>
                  </div>
                </div>

                {!isCurrent && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await revokeWebSessionAction(session.id);
                        showResult(result, {
                          successTitle: "Oturum sonlandırıldı",
                          errorTitle: "Oturum sonlandırılamadı",
                        });
                        if (result.success) {
                          setSessions((prev) => prev.filter((s) => s.id !== session.id));
                        }
                      })
                    }
                  >
                    Oturumu Kapat
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Güvenilir Cihazlar */}
      <Card>
        <div className="space-y-2">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
            Hesap Güvenliği
          </div>
          <div className="text-2xl font-semibold text-[color:var(--panel-text)]">
            Güvenilir Cihazlar
          </div>
          <p className="text-sm text-[color:var(--panel-text-muted)]">
            İki adımlı doğrulama açıkken bir cihazda kodu bir kez doğruladığınızda o cihaz burada listelenir; sonraki girişlerde (farklı bir IP&apos;den bile olsa) tekrar kod istenmez. Bir cihazı kaldırırsanız o cihazdan sonraki girişte doğrulama kodu yeniden istenir.
          </p>
        </div>

        <div className="mt-6 divide-y divide-[color:var(--panel-border)]">
          {trustedDevices.length === 0 ? (
            <div className="py-4 text-sm text-[color:var(--panel-text-soft)]">
              Henüz güvenilir bir cihaz eşleştirilmedi.
            </div>
          ) : (
            trustedDevices.map((device) => {
              const usedDate = new Date(device.lastUsedAt).toLocaleDateString("tr-TR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={device.id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-[color:var(--panel-text)]">
                      {cleanDeviceLabel(device.deviceLabel)}
                    </span>
                    <div className="mt-1 text-xs text-[color:var(--panel-text-muted)]">
                      Son kullanım: {usedDate}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await revokeTrustedWebDeviceAction(device.id);
                        showResult(result, {
                          successTitle: "Cihaz kaldırıldı",
                          errorTitle: "Cihaz kaldırılamadı",
                        });
                        if (result.success) {
                          setTrustedDevices((prev) => prev.filter((d) => d.id !== device.id));
                        }
                      })
                    }
                  >
                    Bu Cihazı Unut
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Hesap Kapatma */}
      <Card className="border-[color:var(--panel-danger-border)] bg-[color:var(--panel-danger-bg)]">
        <div className="space-y-2">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--panel-danger-text)]">
            Tehlikeli işlem
          </div>
          <div className="text-2xl font-semibold text-[color:var(--panel-text)]">
            Hesabı kapat
          </div>
          <p className="text-sm text-[color:var(--panel-text-muted)]">
            Hesabınızı kalıcı olarak kapatmak için mevcut şifrenizi girip onay alanını doldurmanız gerekmektedir. Bu işlem geri alınamaz.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Şifre" hint="İşlemi onaylamak için mevcut şifrenizi girin.">
            <input
              className={inputClassName()}
              type="password"
              value={dangerForm.password}
              onChange={(event) =>
                setDangerForm((current) => ({ ...current, password: event.target.value }))
              }
            />
          </Field>
          <Field label="Onay metni" hint='İşlemi onaylamak için kutucuğa "HESABIMI KAPAT" yazın.'>
            <input
              className={inputClassName()}
              value={dangerForm.confirmationText}
              onChange={(event) =>
                setDangerForm((current) => ({
                  ...current,
                  confirmationText: event.target.value,
                }))
              }
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="danger"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await closeAccountAction(dangerForm);
                setDangerMessage(result.message);
                showResult(result, {
                  successTitle: "Hesap kapatıldı",
                  errorTitle: "Hesap kapatılamadı",
                });

                if (result.success) {
                  await signOut({ callbackUrl: "/giris" });
                }
              })
            }
          >
            Hesabımı Kapat
          </Button>
          {dangerMessage ? <div className="text-sm text-[color:var(--panel-danger-text)]">{dangerMessage}</div> : null}
        </div>
      </Card>
    </div>
  );
}
