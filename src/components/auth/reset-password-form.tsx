"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { resetPasswordAction } from "@/app/actions";
import { useActionFeedback, useActionToast } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";

type ResetPasswordValues = {
  password: string;
  confirmPassword: string;
};

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const { showToast } = useActionToast();
  const { register, handleSubmit, formState } = useForm<ResetPasswordValues>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (!token) {
      showToast({
        title: "Bağlantı geçersiz",
        message: "Sifirlama bağlantısı geçersiz.",
        tone: "error",
      });
      setFeedback("Sıfırlama bağlantısı geçersiz.");
      return;
    }

    setFeedback("");
    startTransition(async () => {
      const result = await resetPasswordAction({
        token,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });

      setFeedback(result.message);
      showResult(result, {
        successTitle: "Şifre yenilendi",
        errorTitle: "Şifre yenilenemedi",
      });

      if (result.success) {
        setTimeout(() => {
          router.push("/giris");
        }, 800);
      }
    });
  });

  return (
    <Card className="w-full max-w-md bg-neutral-950/96">
      <div className="mb-6 space-y-2">
        <div className="text-sm font-semibold uppercase tracking-[0.28em] text-neutral-500">
          Yeni Şifre
        </div>
        <h1 className="text-3xl font-semibold text-white">Şifrenizi yenileyin</h1>
        <p className="text-sm text-neutral-400">
          Bağlantı geçerliyse yeni şifrenizi kaydedip tekrar giriş yapabilirsiniz.
        </p>
      </div>

      <form className="grid gap-4" onSubmit={onSubmit}>
        <Field label="Yeni şifre">
          <input
            type="password"
            className={inputClassName()}
            {...register("password", { required: "Yeni şifre zorunludur." })}
          />
        </Field>
        <Field label="Yeni şifre (tekrar)">
          <input
            type="password"
            className={inputClassName()}
            {...register("confirmPassword", { required: "Şifre tekrarı zorunludur." })}
          />
        </Field>

        {feedback ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-neutral-200">
            {feedback}
          </div>
        ) : null}
        {formState.errors.password?.message || formState.errors.confirmPassword?.message ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-neutral-200">
            {formState.errors.password?.message || formState.errors.confirmPassword?.message}
          </div>
        ) : null}

        <Button type="submit" disabled={isPending || !token}>
          {isPending ? "Şifre kaydediliyor..." : "Yeni Şifreyi Kaydet"}
        </Button>
      </form>

      <p className="mt-4 text-sm text-neutral-400">
        Giriş ekranına dönmek ister misiniz?{" "}
        <Link href="/giris" className="font-semibold text-white">
          Giriş yapın
        </Link>
      </p>
    </Card>
  );
}
