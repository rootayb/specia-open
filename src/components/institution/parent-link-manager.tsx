"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  linkParentToStudentAction,
  unlinkParentFromStudentAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";

type ParentOption = {
  id: string;
  name: string;
  email: string;
  linkedStudents: Array<{ id: string; firstName: string; lastName: string }>;
};

type StudentOption = {
  id: string;
  firstName: string;
  lastName: string;
  classroom?: string | null;
};

export function ParentLinkManager({
  parents,
  students,
}: {
  parents: ParentOption[];
  students: StudentOption[];
}) {
  const router = useRouter();
  const [parentId, setParentId] = useState(parents[0]?.id ?? "");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const selectedParent = parents.find((parent) => parent.id === parentId);

  return (
    <div className="grid gap-6">
      <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
        <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Veli Eşleştirme
        </div>
        <div className="mt-2 text-lg font-semibold text-white">
          Veli hesabini ogrenciye bagla
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Veli">
            <select
              className={inputClassName()}
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">Veli seçin</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name} ({parent.email})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Öğrenci">
            <select
              className={inputClassName()}
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
            >
              <option value="">Öğrenci seçin</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                  {student.classroom ? ` / ${student.classroom}` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            disabled={isPending || !parentId || !studentId}
            onClick={() => {
              startTransition(async () => {
                const result = await linkParentToStudentAction({ parentId, studentId });
                setFeedback(result.message);
                showResult(result, {
                  successTitle: "Veli bağlantısı kuruldu",
                  errorTitle: "Veli bağlantısı kurulamadi",
                });
                if (result.success) {
                  router.refresh();
                }
              });
            }}
          >
            {isPending ? "Kaydediliyor..." : "Eslestir"}
          </Button>
          {feedback ? <div className="text-sm text-neutral-400">{feedback}</div> : null}
        </div>
      </div>

      <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
        <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Mevcut Baglantilar
        </div>
        <div className="mt-4 grid gap-3">
          {parents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
              Kuruma bağlı veli hesabi yok.
            </div>
          ) : (
            parents.map((parent) => (
              <div
                key={parent.id}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{parent.name}</div>
                    <div className="text-sm text-neutral-500">{parent.email}</div>
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                    {parent.linkedStudents.length} bağlantı
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {parent.linkedStudents.length === 0 ? (
                    <div className="text-sm text-neutral-500">Henüz öğrenci baglanmamis.</div>
                  ) : (
                    parent.linkedStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-neutral-200"
                      >
                        <span>
                          {student.firstName} {student.lastName}
                        </span>
                        <button
                          type="button"
                          className="text-neutral-500 transition hover:text-white"
                          onClick={() => {
                            startTransition(async () => {
                              const result = await unlinkParentFromStudentAction({
                                parentId: parent.id,
                                studentId: student.id,
                              });
                              setFeedback(result.message);
                              showResult(result, {
                                successTitle: "Veli bağlantısı kaldirildi",
                                errorTitle: "Veli bağlantısı kaldirilamadi",
                              });
                              if (result.success) {
                                router.refresh();
                              }
                            });
                          }}
                        >
                          Kaldir
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {selectedParent && selectedParent.linkedStudents.length > 0 ? (
          <div className="mt-4 text-sm text-neutral-500">
            Secili veli: {selectedParent.name}
          </div>
        ) : null}
      </div>
    </div>
  );
}
