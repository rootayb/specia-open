"use client";

import { useState } from "react";
import { Edit2, CreditCard, Building, MapPin, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InstitutionSettingsForm } from "@/components/admin/institution-settings-form";
import type { InstitutionSettingsInput } from "@/lib/schemas";

export function FinansSettingsWrapper({
  initialValues,
}: {
  initialValues: InstitutionSettingsInput;
}) {
  // Determine if settings are already filled
  const hasSettings = !!(
    initialValues.legalName?.trim() ||
    initialValues.taxNumber?.trim() ||
    initialValues.iban?.trim()
  );

  const [isEditing, setIsEditing] = useState(!hasSettings);

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Resmi Fatura Bilgilerini Düzenle</h2>
          {hasSettings && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(false)}
            >
              Vazgeç
            </Button>
          )}
        </div>
        <InstitutionSettingsForm
          initialValues={initialValues}
          mode="billing"
          showIntro={false}
        />
      </div>
    );
  }

  return (
    <Card variant="subtle" padding="lg" className="border border-white/10 bg-white/[0.02]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">Resmi Fatura ve Ödeme Bilgileri</h2>
          <p className="text-xs text-[color:var(--panel-text-muted)]">
            Kurum adına düzenlenecek resmi faturalarda ve hak ediş ödemelerinde kullanılan güncel bilgiler.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsEditing(true)}
          className="shrink-0"
        >
          <Edit2 className="size-3.5 mr-1.5" />
          Bilgileri Düzenle
        </Button>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {/* Unvan ve Vergi Bilgileri */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--panel-text-soft)] uppercase tracking-wider">
            <Building className="size-3.5" />
            Resmi Unvan & Vergi
          </div>
          <div className="space-y-1.5 text-sm">
            <div>
              <span className="text-[color:var(--panel-text-muted)]">Kurum Resmi Adı:</span>
              <div className="font-medium text-white">{initialValues.legalName || "-"}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[color:var(--panel-text-muted)]">Vergi Dairesi:</span>
                <div className="font-medium text-white">{initialValues.taxOffice || "-"}</div>
              </div>
              <div>
                <span className="text-[color:var(--panel-text-muted)]">Vergi No:</span>
                <div className="font-medium text-white">{initialValues.taxNumber || "-"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Banka ve Ödeme Bilgileri */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--panel-text-soft)] uppercase tracking-wider">
            <CreditCard className="size-3.5" />
            Ödeme Bilgileri
          </div>
          <div className="space-y-1.5 text-sm">
            <div>
              <span className="text-[color:var(--panel-text-muted)]">IBAN Adresi:</span>
              <div className="font-mono font-medium text-white tracking-wider break-all text-xs mt-0.5">
                {initialValues.iban || "-"}
              </div>
            </div>
            <div>
              <span className="text-[color:var(--panel-text-muted)]">Mersis No:</span>
              <div className="font-medium text-white">{initialValues.mersisNumber || "-"}</div>
            </div>
            <div>
              <span className="text-[color:var(--panel-text-muted)]">Fatura Öneki:</span>
              <div className="font-medium text-emerald-400">{initialValues.invoicePrefix || "AYB"}</div>
            </div>
          </div>
        </div>

        {/* İletişim ve Adres */}
        <div className="space-y-3 sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--panel-text-soft)] uppercase tracking-wider">
            <MapPin className="size-3.5" />
            İletişim & Konum
          </div>
          <div className="space-y-1.5 text-sm">
            <div>
              <span className="text-[color:var(--panel-text-muted)]">Adres:</span>
              <div className="font-medium text-white leading-5">{initialValues.address || "-"}</div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[color:var(--panel-text-muted)]">
                <Phone className="size-3" />
                {initialValues.phone || "-"}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[color:var(--panel-text-muted)]">
                <Mail className="size-3" />
                {initialValues.email || "-"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
