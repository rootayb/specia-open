"use client";

import { useState, useTransition } from "react";
import { sendAdminNotificationAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";

type Target = "all" | "role" | "institution" | "user";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "institution", label: "Kurum yöneticisi" },
  { value: "teacher", label: "Öğretmen" },
  { value: "parent", label: "Veli" },
];

type Props = {
  institutions: { id: string; name: string }[];
};

export function AdminNotificationForm({ institutions }: Props) {
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<Target>("all");
  const [role, setRole] = useState("teacher");
  const [institutionId, setInstitutionId] = useState(institutions[0]?.id ?? "");
  const [userEmail, setUserEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await sendAdminNotificationAction({
        title,
        body,
        target,
        role: target === "role" ? (role as "admin" | "institution" | "teacher" | "parent") : undefined,
        institutionId: target === "institution" ? institutionId : undefined,
        userEmail: target === "user" ? userEmail.trim() : undefined,
      });
      showResult(result, {
        successTitle: "Bildirim gönderildi",
        errorTitle: "Gönderilemedi",
      });
      if (result.success) {
        setTitle("");
        setBody("");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <Field label="Hedef kitle">
        <select
          className={inputClassName()}
          value={target}
          onChange={(e) => setTarget(e.target.value as Target)}
        >
          <option value="all">Tüm kullanıcılar</option>
          <option value="role">Role göre</option>
          <option value="institution">Kuruma göre</option>
          <option value="user">Tek kullanıcı (e-posta)</option>
        </select>
      </Field>

      {target === "role" ? (
        <Field label="Rol">
          <select className={inputClassName()} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {target === "institution" ? (
        <Field label="Kurum">
          <select
            className={inputClassName()}
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
          >
            {institutions.length === 0 ? (
              <option value="">Kurum bulunamadı</option>
            ) : (
              institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))
            )}
          </select>
        </Field>
      ) : null}

      {target === "user" ? (
        <Field label="Kullanıcı e-postası" hint="Bildirim yalnızca bu e-postaya sahip kullanıcıya gönderilir">
          <input
            type="email"
            className={inputClassName()}
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="örnek@örnek.com"
            required
          />
        </Field>
      ) : null}

      <Field label="Başlık">
        <input
          type="text"
          className={inputClassName()}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Örn: Planlı bakım bildirimi"
          maxLength={120}
          required
        />
      </Field>

      <Field label="Mesaj">
        <textarea
          className={`${inputClassName()} min-h-24 py-2 resize-none`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Kullanıcıya gösterilecek mesaj..."
          maxLength={500}
          required
        />
      </Field>

      <Button
        type="submit"
        disabled={
          isPending ||
          (target === "institution" && institutions.length === 0)
        }
        className="w-full"
      >
        {isPending ? "Gönderiliyor..." : "Bildirimi Gönder"}
      </Button>
    </form>
  );
}
