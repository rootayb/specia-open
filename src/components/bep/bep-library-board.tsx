"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, FilePenLine, Search, SlidersHorizontal } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

type StudentDocumentRecord = {
  id: string;
  title: string;
  status: string;
  approvalStatus: string;
  updatedAt: string;
};

type StudentGroupRecord = {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string | null;
  classroom: string | null;
  documents: StudentDocumentRecord[];
};

type Props = {
  students: StudentGroupRecord[];
  initialStudentId?: string;
  showApprovalFlow: boolean;
  canCreate: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(value: string) {
  const normalized = value.trim().toLocaleLowerCase("tr-TR");

  if (normalized === "completed") {
    return "TAMAMLANDI";
  }

  if (normalized === "draft") {
    return "TASLAK";
  }

  return normalized.toLocaleUpperCase("tr-TR");
}

function approvalLabel(value: string) {
  const normalized = value.trim().toLocaleLowerCase("tr-TR");

  if (normalized === "approved") {
    return "ONAYLANDI";
  }

  if (normalized === "pending") {
    return "ONAY BEKLİYOR";
  }

  if (normalized === "rejected") {
    return "REDDEDİLDİ";
  }

  return normalized.toLocaleUpperCase("tr-TR");
}

function badgeTone(value: string): BadgeTone {
  if (value === "completed" || value === "approved") {
    return "success";
  }

  if (value === "pending") {
    return "warning";
  }

  if (value === "rejected") {
    return "danger";
  }

  return "neutral";
}

export function BepLibraryBoard({
  students,
  initialStudentId,
  showApprovalFlow,
  canCreate,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState(initialStudentId ?? "all");
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase("tr-TR"));

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (studentFilter !== "all") count += 1;
    if (statusFilter !== "all") count += 1;
    if (showApprovalFlow && approvalFilter !== "all") count += 1;
    return count;
  }, [studentFilter, statusFilter, showApprovalFlow, approvalFilter]);

  const filteredStudents = useMemo(
    () =>
      students
        .map((student) => {
          const fullName = `${student.firstName} ${student.lastName}`;
          const matchesStudent = studentFilter === "all" || student.id === studentFilter;

          if (!matchesStudent) {
            return null;
          }

          const documents = student.documents.filter((document) => {
            const matchesSearch =
              deferredSearch.length === 0 ||
              fullName.toLocaleLowerCase("tr-TR").includes(deferredSearch) ||
              (student.schoolName ?? "").toLocaleLowerCase("tr-TR").includes(deferredSearch) ||
              (student.classroom ?? "").toLocaleLowerCase("tr-TR").includes(deferredSearch) ||
              document.title.toLocaleLowerCase("tr-TR").includes(deferredSearch);
            const matchesStatus = statusFilter === "all" || document.status === statusFilter;
            const matchesApproval =
              !showApprovalFlow ||
              approvalFilter === "all" ||
              document.approvalStatus === approvalFilter;

            return matchesSearch && matchesStatus && matchesApproval;
          });

          if (documents.length === 0) {
            return null;
          }

          return {
            ...student,
            documents,
          };
        })
        .filter((student): student is StudentGroupRecord => student !== null),
    [approvalFilter, deferredSearch, showApprovalFlow, statusFilter, studentFilter, students],
  );

  const totalDocumentCount = filteredStudents.reduce(
    (count, student) => count + student.documents.length,
    0,
  );
  const completedCount = filteredStudents.reduce(
    (count, student) =>
      count + student.documents.filter((document) => document.status === "completed").length,
    0,
  );
  const pendingApprovalCount = filteredStudents.reduce(
    (count, student) =>
      count + student.documents.filter((document) => document.approvalStatus === "pending").length,
    0,
  );

  return (
    <div className="grid gap-6">
      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-5">
            <SectionHeading
              eyebrow="BEP"
              title="BEP kütüphanesi"
            />

            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <div className="text-[color:var(--panel-text-soft)]">Öğrenci</div>
                <div className="mt-1 text-2xl font-semibold text-[color:var(--panel-text)]">
                  {filteredStudents.length}
                </div>
              </div>
              <div>
                <div className="text-[color:var(--panel-text-soft)]">Toplam BEP</div>
                <div className="mt-1 text-2xl font-semibold text-[color:var(--panel-text)]">
                  {totalDocumentCount}
                </div>
              </div>
              <div>
                <div className="text-[color:var(--panel-text-soft)]">Tamamlanan</div>
                <div className="mt-1 text-2xl font-semibold text-[color:var(--panel-text)]">
                  {completedCount}
                </div>
              </div>
              {showApprovalFlow ? (
                <div>
                  <div className="text-[color:var(--panel-text-soft)]">Onay bekleyen</div>
                  <div className="mt-1 text-2xl font-semibold text-[color:var(--panel-text)]">
                    {pendingApprovalCount}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link href="/panel/formlar" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full sm:w-auto">Formlar</Button>
            </Link>
            {canCreate ? (
              <>
                <Link href="/panel/bep/toplu" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full sm:w-auto">Toplu BEP</Button>
                </Link>
                <Link href="/panel/bep/yeni" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto">
                    <FilePenLine className="size-4" />
                    Yeni BEP
                  </Button>
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card variant="subtle" padding="md">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--panel-text-soft)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={cn(inputClassName(), "pl-10")}
                placeholder="Öğrenci, okul, sınıf veya belge başlığı ile ara..."
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-2 border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] text-[color:var(--panel-text)] transition hover:bg-[color:var(--panel-bg-hover)]",
                  showFilters && "bg-[color:var(--panel-bg-hover)] border-primary/30"
                )}
              >
                <SlidersHorizontal className="size-4 text-[color:var(--panel-text-soft)]" />
                <span>Filtrele</span>
                {activeFiltersCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
              
              {activeFiltersCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setStudentFilter("all");
                    setStatusFilter("all");
                    if (showApprovalFlow) setApprovalFilter("all");
                  }}
                  className="text-xs text-[color:var(--panel-text-muted)] hover:text-[color:var(--panel-text)]"
                >
                  Filtreleri Temizle
                </Button>
              )}
            </div>
          </div>
        </Card>

        {showFilters && (
          <Card variant="subtle" padding="md" className="border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]/20">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Öğrenci Seçin">
                <select
                  value={studentFilter}
                  onChange={(event) => setStudentFilter(event.target.value)}
                  className={inputClassName()}
                >
                  <option value="all">Tüm öğrenciler</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="BEP Durumu">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={inputClassName()}
                >
                  <option value="all">Tüm durumlar</option>
                  <option value="draft">Taslak</option>
                  <option value="completed">Tamamlandı</option>
                </select>
              </Field>

              {showApprovalFlow ? (
                <Field label="Onay Durumu">
                  <select
                    value={approvalFilter}
                    onChange={(event) => setApprovalFilter(event.target.value)}
                    className={inputClassName()}
                  >
                    <option value="all">Tüm onaylar</option>
                    <option value="pending">Onay bekliyor</option>
                    <option value="approved">Onaylandı</option>
                    <option value="rejected">Reddedildi</option>
                  </select>
                </Field>
              ) : null}
            </div>
          </Card>
        )}
      </div>

      {filteredStudents.length === 0 ? (
        <Card variant="subtle" padding="lg">
          <div className="space-y-4">
            <div className="text-lg font-semibold text-[color:var(--panel-text)]">
              Filtreye uygun BEP kaydı bulunamadı.
            </div>
            <p className="text-sm text-[color:var(--panel-text-muted)]">
              Filtreleri temizleyin veya yeni bir belge başlatmak için oluşturma akışını kullanın.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--panel-text)] transition hover:bg-[color:var(--panel-bg-hover)]"
                onClick={() => {
                  setSearch("");
                  setStudentFilter(initialStudentId ?? "all");
                  setStatusFilter("all");
                  if (showApprovalFlow) {
                    setApprovalFilter("all");
                  }
                }}
              >
                Filtreleri Temizle
              </button>
              {canCreate ? (
                <Link href="/panel/bep/yeni">
                  <Button>Yeni BEP</Button>
                </Link>
              ) : null}
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-[color:var(--panel-border)] px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--panel-text-soft)]">
            Kayıt Akışı
          </div>

          <div className="divide-y divide-[color:var(--panel-border)]">
            {filteredStudents.map((student) => {
              const isExpanded = expandedStudents[student.id] ?? filteredStudents.length === 1;

              return (
                <div key={student.id} className="bg-[color:var(--panel-bg-base)]/50">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedStudents((current) => ({
                        ...current,
                        [student.id]: !isExpanded,
                      }))
                    }
                    className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-[color:var(--panel-bg-hover)]/55"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="mt-1 inline-flex size-8 items-center justify-center rounded-full border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] text-[color:var(--panel-text-soft)]">
                        {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xl font-semibold text-[color:var(--panel-text)]">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="mt-1 text-sm text-[color:var(--panel-text-soft)]">
                          {student.schoolName || "Okul belirtilmedi"} · Sınıf: {student.classroom || "-"}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-full border border-[color:var(--panel-border)] px-3 py-1 text-sm text-[color:var(--panel-text-muted)]">
                        {student.documents.length} belge
                      </div>
                      {canCreate ? (
                        <Link href={`/panel/bep/yeni?studentId=${student.id}`} onClick={(event) => event.stopPropagation()}>
                          <Button variant="ghost">Yeni BEP</Button>
                        </Link>
                      ) : null}
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="px-4 pb-4 sm:px-6">
                      <div className="overflow-hidden rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]/55">
                        <div className="hidden grid-cols-[minmax(0,1.5fr)_140px_220px_90px] gap-4 border-b border-[color:var(--panel-border)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--panel-text-soft)] lg:grid">
                          <div>Belge</div>
                          <div>Güncelleme</div>
                          <div>Durum</div>
                          <div className="text-right">Aç</div>
                        </div>

                        <div className="divide-y divide-[color:var(--panel-border)]">
                          {student.documents.map((document) => (
                            <Link
                              key={document.id}
                              href={`/panel/bep/${document.id}`}
                              className="grid gap-4 px-5 py-4 transition hover:bg-[color:var(--panel-bg-hover)] lg:grid-cols-[minmax(0,1.5fr)_140px_220px_90px] lg:items-center"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-[color:var(--panel-text)]">
                                  {document.title}
                                </div>
                                <div className="mt-1 text-sm text-[color:var(--panel-text-soft)] lg:hidden">
                                  {formatDate(document.updatedAt)}
                                </div>
                              </div>

                              <div className="hidden text-sm text-[color:var(--panel-text-soft)] lg:block">
                                {formatDate(document.updatedAt)}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Badge tone={badgeTone(document.status)}>
                                  {statusLabel(document.status)}
                                </Badge>
                                {showApprovalFlow ? (
                                  <Badge tone={badgeTone(document.approvalStatus)}>
                                    {approvalLabel(document.approvalStatus)}
                                  </Badge>
                                ) : null}
                              </div>

                              <div className="text-sm font-medium text-[color:var(--panel-text-soft)] lg:text-right">
                                Aç
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}



