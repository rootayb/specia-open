"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StudentStatusButton } from "@/components/students/student-status-button";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  enrollmentType: string;
  schoolName: string | null;
  classroom: string | null;
  documents: unknown[];
};

export function StudentList({ students }: { students: Student[] }) {
  const [visibleCount, setVisibleCount] = useState(5);

  const visibleStudents = students.slice(0, visibleCount);
  const hasMore = students.length > visibleCount;

  return (
    <div className="grid gap-3">
      {visibleStudents.map((student) => (
        <Link
          key={student.id}
          href={`/panel/ogrenciler/${student.id}`}
          className="flex flex-col gap-3 rounded-[14px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-3.5 transition hover:border-[color:var(--panel-border-strong)] hover:bg-[color:var(--panel-bg-hover)] md:flex-row md:items-center md:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold text-[color:var(--panel-text)]">
                {student.firstName} {student.lastName}
              </span>
              <Badge tone={student.isActive ? "success" : "warning"} dot>
                {student.isActive ? "Aktif" : "Pasif"}
              </Badge>
              {student.enrollmentType === "periodic" ? (
                <Badge tone="info" dot>
                  Dönemsel
                </Badge>
              ) : null}
            </div>
            <div className="mt-1.5 text-sm text-[color:var(--panel-text-muted)]">
              {student.schoolName || "Okul belirtilmedi"} · Sınıf: {student.classroom || "-"} · {student.documents.length} BEP
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <StudentStatusButton
              studentId={student.id}
              studentName={`${student.firstName} ${student.lastName}`}
              isActive={student.isActive}
              compact
              onStopPropagation
            />
            <span className="flex items-center gap-1.5 text-sm text-[color:var(--panel-text-soft)]">
              Detayı Aç
              <ArrowRight className="size-4" />
            </span>
          </div>
        </Link>
      ))}

      {hasMore && (
        <div className="mt-2 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => setVisibleCount((prev) => prev + 10)}
            className="flex items-center gap-1.5"
          >
            <ChevronDown className="size-4" />
            Daha Fazla Göster ({students.length - visibleCount} kaldı)
          </Button>
        </div>
      )}
    </div>
  );
}
