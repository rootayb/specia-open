"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";

import { saveStudentAction } from "@/app/actions";
import { useActionToast } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import { SectionHeading } from "@/components/ui/section-heading";
import type { StudentInput } from "@/lib/schemas";
import { restoreTurkishText } from "@/lib/turkish";

const kademeOptions = [
  { value: "", label: "Kademe seçin" },
  { value: "1. Kademe", label: "1. Kademe" },
  { value: "2. Kademe", label: "2. Kademe" },
  { value: "3. Kademe", label: "3. Kademe" },
];

function DisplayField({ label, value }: { label: string; value?: string | Date | null }) {
  const displayVal = value ? String(value) : "-";
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.01] px-4.5 py-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-1.5 text-sm font-medium text-white break-words whitespace-pre-wrap">{displayVal}</div>
    </div>
  );
}

function formatDisplayDate(dateStr?: string | Date | null) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(d);
  } catch {
    return String(dateStr);
  }
}

export function StudentForm({
  defaultValues,
}: {
  defaultValues: StudentInput;
}) {
  const router = useRouter();
  const { showToast } = useActionToast();
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const isNew = !defaultValues.id;
  const [isEditing, setIsEditing] = useState(isNew);

  const { register, handleSubmit, reset, control } = useForm<StudentInput>({
    defaultValues,
  });
  const enrollmentType = useWatch({
    control,
    name: "enrollmentType",
  });

  // Keep form values in sync with backend refreshes
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit = handleSubmit((values) => {
    setFeedback("");
    startTransition(async () => {
      const result = await saveStudentAction(values);
      setFeedback(result.message);
      showToast({
        title: result.success ? "Öğrenci kaydı hazır" : "Kayıt tamamlanmadı",
        message: result.message,
        tone: result.success ? "success" : "error",
      });

      if (result.success && result.id) {
        if (isNew) {
          router.push(`/panel/ogrenciler/${result.id}`);
          router.refresh();
        } else {
          setIsEditing(false);
          router.refresh();
        }
      }
    });
  });

  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
      <Card>
        <SectionHeading
          eyebrow="I. Öğrenci Bilgileri"
          title="Kimlik, öğrenci ve aile bilgileri"
          description="Öğrenciyi tanımlayan temel bilgilerle aile ve iletişim kaydını bu bölümde tamamlayın."
          action={
            !isNew ? (
              isEditing ? (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    reset(defaultValues);
                    setIsEditing(false);
                  }}
                >
                  İptal Et
                </Button>
              ) : (
                <Button type="button" onClick={() => setIsEditing(true)}>
                  Profili Düzenle
                </Button>
              )
            ) : null
          }
        />

        {isEditing ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            <Field label="Kayıt tipi">
              <select className={inputClassName()} {...register("enrollmentType")}>
                <option value="regular">Düzenli öğrenci</option>
                <option value="periodic">Dönemsel öğrenci</option>
              </select>
            </Field>
            {enrollmentType === "periodic" ? (
              <>
                <Field label="Kuruma katılım başlangıcı">
                  <input type="date" className={inputClassName()} {...register("enrollmentStartDate")} />
                </Field>
                <Field label="Kuruma katılım bitişi">
                  <input type="date" className={inputClassName()} {...register("enrollmentEndDate")} />
                </Field>
              </>
            ) : null}
            <Field label="Ad">
              <input className={inputClassName()} {...register("firstName")} />
            </Field>
            <Field label="Soyad">
              <input className={inputClassName()} {...register("lastName")} />
            </Field>
            <Field label="Kademe">
              <select className={inputClassName()} {...register("kademe")}>
                {kademeOptions.map((option) => (
                  <option key={option.value || "empty"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sınıfı">
              <input className={inputClassName()} {...register("classroom")} />
            </Field>
            <Field label="Okul numarası">
              <input className={inputClassName()} {...register("schoolNumber")} />
            </Field>
            <Field label="Okulu">
              <input className={inputClassName()} {...register("schoolName")} />
            </Field>
            <Field label="Doğum tarihi">
              <input type="date" className={inputClassName()} {...register("birthDate")} />
            </Field>
            <Field label="İl / İlçe">
              <input className={inputClassName()} {...register("district")} />
            </Field>
            <Field label="BEP başlangıç">
              <input type="date" className={inputClassName()} {...register("bepStartDate")} />
            </Field>
            <Field label="BEP bitiş">
              <input type="date" className={inputClassName()} {...register("bepEndDate")} />
            </Field>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            <DisplayField
              label="Kayıt tipi"
              value={defaultValues.enrollmentType === "periodic" ? "Dönemsel öğrenci" : "Düzenli öğrenci"}
            />
            {defaultValues.enrollmentType === "periodic" ? (
              <>
                <DisplayField
                  label="Kuruma katılım başlangıcı"
                  value={formatDisplayDate(defaultValues.enrollmentStartDate)}
                />
                <DisplayField
                  label="Kuruma katılım bitişi"
                  value={formatDisplayDate(defaultValues.enrollmentEndDate)}
                />
              </>
            ) : null}
            <DisplayField label="Ad" value={defaultValues.firstName} />
            <DisplayField label="Soyad" value={defaultValues.lastName} />
            <DisplayField label="Kademe" value={defaultValues.kademe} />
            <DisplayField label="Sınıfı" value={defaultValues.classroom} />
            <DisplayField label="Okul numarası" value={defaultValues.schoolNumber} />
            <DisplayField label="Okulu" value={defaultValues.schoolName} />
            <DisplayField label="Doğum tarihi" value={formatDisplayDate(defaultValues.birthDate)} />
            <DisplayField label="İl / İlçe" value={defaultValues.district} />
            <DisplayField label="BEP başlangıç" value={formatDisplayDate(defaultValues.bepStartDate)} />
            <DisplayField label="BEP bitiş" value={formatDisplayDate(defaultValues.bepEndDate)} />
          </div>
        )}

        {isEditing ? (
          <div className="mt-4 grid gap-4">
            <Field label="Yerleştirme kurul kararı">
              <textarea className={`${inputClassName()} min-h-24`} {...register("placementDecision")} />
            </Field>
            <Field label="Eğitsel tanı">
              <textarea className={`${inputClassName()} min-h-24`} {...register("diagnosis")} />
            </Field>
            <Field label="Önceki destek eğitim hizmetleri">
              <textarea className={`${inputClassName()} min-h-24`} {...register("previousSupport")} />
            </Field>
            <Field label="Mevcut destek eğitim hizmetleri">
              <textarea className={`${inputClassName()} min-h-24`} {...register("currentSupport")} />
            </Field>
            <Field label="Destek materyalleri / cihazlar">
              <textarea className={`${inputClassName()} min-h-24`} {...register("supportMaterials")} />
            </Field>
            <Field label="Önemli sağlık bilgileri">
              <textarea className={`${inputClassName()} min-h-24`} {...register("healthNotes")} />
            </Field>
            <Field label="Eğitim ortamına ilişkin düzenlemeler">
              <textarea className={`${inputClassName()} min-h-24`} {...register("educationAdjustments")} />
            </Field>
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            <DisplayField label="Yerleştirme kurul kararı" value={defaultValues.placementDecision} />
            <DisplayField label="Eğitsel tanı" value={defaultValues.diagnosis} />
            <DisplayField label="Önceki destek eğitim hizmetleri" value={defaultValues.previousSupport} />
            <DisplayField label="Mevcut destek eğitim hizmetleri" value={defaultValues.currentSupport} />
            <DisplayField label="Destek materyalleri / cihazlar" value={defaultValues.supportMaterials} />
            <DisplayField label="Önemli sağlık bilgileri" value={defaultValues.healthNotes} />
            <DisplayField label="Eğitim ortamına ilişkin düzenlemeler" value={defaultValues.educationAdjustments} />
          </div>
        )}

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-300/80">
            Aile ile ilgili bilgiler
          </div>
          <div className="mt-5 grid gap-4 2xl:grid-cols-3">
            {/* Anne */}
            <div className="grid gap-4">
              <div className="text-sm font-medium text-neutral-100">Anne</div>
              {isEditing ? (
                <>
                  <Field label="Adı soyadı">
                    <input className={inputClassName()} {...register("motherName")} />
                  </Field>
                  <Field label="Telefon">
                    <input className={inputClassName()} {...register("motherPhone")} />
                  </Field>
                  <Field label="Ev adresi">
                    <textarea
                      className={`${inputClassName()} min-h-24`}
                      {...register("motherHomeAddress")}
                    />
                  </Field>
                  <Field label="İş adresi">
                    <textarea
                      className={`${inputClassName()} min-h-24`}
                      {...register("motherWorkAddress")}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <DisplayField label="Adı soyadı" value={defaultValues.motherName} />
                  <DisplayField label="Telefon" value={defaultValues.motherPhone} />
                  <DisplayField label="Ev adresi" value={defaultValues.motherHomeAddress} />
                  <DisplayField label="İş adresi" value={defaultValues.motherWorkAddress} />
                </>
              )}
            </div>

            {/* Baba */}
            <div className="grid gap-4">
              <div className="text-sm font-medium text-neutral-100">Baba</div>
              {isEditing ? (
                <>
                  <Field label="Adı soyadı">
                    <input className={inputClassName()} {...register("fatherName")} />
                  </Field>
                  <Field label="Telefon">
                    <input className={inputClassName()} {...register("fatherPhone")} />
                  </Field>
                  <Field label="Ev adresi">
                    <textarea
                      className={`${inputClassName()} min-h-24`}
                      {...register("fatherHomeAddress")}
                    />
                  </Field>
                  <Field label="İş adresi">
                    <textarea
                      className={`${inputClassName()} min-h-24`}
                      {...register("fatherWorkAddress")}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <DisplayField label="Adı soyadı" value={defaultValues.fatherName} />
                  <DisplayField label="Telefon" value={defaultValues.fatherPhone} />
                  <DisplayField label="Ev adresi" value={defaultValues.fatherHomeAddress} />
                  <DisplayField label="İş adresi" value={defaultValues.fatherWorkAddress} />
                </>
              )}
            </div>

            {/* Veli / Vasi */}
            <div className="grid gap-4">
              <div className="text-sm font-medium text-neutral-100">Veli / Vasi</div>
              {isEditing ? (
                <>
                  <Field label="Adı soyadı">
                    <input className={inputClassName()} {...register("guardianName")} />
                  </Field>
                  <Field label="Telefon">
                    <input className={inputClassName()} {...register("guardianPhone")} />
                  </Field>
                  <Field label="Ev adresi">
                    <textarea
                      className={`${inputClassName()} min-h-24`}
                      {...register("guardianHomeAddress")}
                    />
                  </Field>
                  <Field label="İş adresi">
                    <textarea
                      className={`${inputClassName()} min-h-24`}
                      {...register("guardianWorkAddress")}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <DisplayField label="Adı soyadı" value={defaultValues.guardianName} />
                  <DisplayField label="Telefon" value={defaultValues.guardianPhone} />
                  <DisplayField label="Ev adresi" value={defaultValues.guardianHomeAddress} />
                  <DisplayField label="İş adresi" value={defaultValues.guardianWorkAddress} />
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeading
          eyebrow="II. Eğitsel Performans"
          title="Gelişim özeti"
          description="Öğrencinin gelişim öyküsünü, eğitsel ihtiyaçlarını ve genel durumunu burada özetleyin."
        />
        <div className="mt-6 grid gap-4">
          {isEditing ? (
            <>
              <Field label="Öğrencinin gelişim öyküsü">
                <textarea className={`${inputClassName()} min-h-36`} {...register("developmentHistory")} />
              </Field>
              <Field label="Güçlü yönler">
                <textarea className={`${inputClassName()} min-h-28`} {...register("strengths")} />
              </Field>
              <Field label="Geliştirilmesi gereken yönler">
                <textarea className={`${inputClassName()} min-h-28`} {...register("improvementAreas")} />
              </Field>
              <Field label="Davranış problemi notları">
                <textarea className={`${inputClassName()} min-h-28`} {...register("behaviorNotes")} />
              </Field>
            </>
          ) : (
            <>
              <DisplayField label="Öğrencinin gelişim öyküsü" value={defaultValues.developmentHistory} />
              <DisplayField label="Güçlü yönler" value={defaultValues.strengths} />
              <DisplayField label="Geliştirilmesi gereken yönler" value={defaultValues.improvementAreas} />
              <DisplayField label="Davranış problemi notları" value={defaultValues.behaviorNotes} />
            </>
          )}
        </div>
      </Card>

      {feedback ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-neutral-200">
          {restoreTurkishText(feedback)}
        </div>
      ) : null}

      {isEditing && (
        <div className="flex justify-end gap-3">
          {!isNew && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                reset(defaultValues);
                setIsEditing(false);
              }}
            >
              İptal Et
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Kaydediliyor..." : "Öğrenciyi Kaydet"}
          </Button>
        </div>
      )}
    </form>
  );
}
