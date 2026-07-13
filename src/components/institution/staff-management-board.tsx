"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type {
  StaffEmploymentType,
  StaffModulePermission,
  UserRole,
} from "@/lib/prisma-shim";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import {
  removeInstitutionMemberAction,
  updateInstitutionMemberStateAction,
  updateStaffProfileAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import { confirmModal } from "@/components/ui/confirm-modal";
import type { RemoveInstitutionMemberInput, StaffProfileInput } from "@/lib/schemas";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  institution: "Kurum Yöneticisi",
  teacher: "Öğretmen",
  parent: "Veli",
};

const employmentLabels: Record<StaffEmploymentType, string> = {
  full_time: "Tam Zamanlı",
  part_time: "Yarı Zamanlı",
  consultant: "Danışman",
};

const moduleLabels: Record<StaffModulePermission, string> = {
  all: "Tüm Modüller",
  overview: "Genel Bakış",
  students: "Öğrenciler",
  bep: "BEP Yönetimi",
  approvals: "BEP Onayları",
  documents: "Belge Merkezi",
  invites: "Davet Kodları",
  institution: "Kurum Ayarları",
  reports: "Raporlar",
  schedule: "Seans Programı",
};

type MemberRecord = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branch: string | null;
  employmentType: StaffEmploymentType | null;
  allowedModules: StaffModulePermission[];
  isActive: boolean;
  _count: {
    students: number;
    documents: number;
    parentStudentLinks: number;
    assignedSessions: number;
  };
  parentStudentLinks: Array<{
    id: string;
    student: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
};

type ScopedModulePermission = Exclude<StaffModulePermission, "all">;

const ALL_SCOPED_PERMISSIONS: ScopedModulePermission[] = [
  "overview",
  "students",
  "bep",
  "approvals",
  "documents",
  "invites",
  "institution",
  "reports",
  "schedule",
];

type StaffFormState = {
  userId: string;
  branch: string;
  employmentType: StaffEmploymentType | "";
  allowedModules: StaffModulePermission[];
};

function RemoveInstitutionMemberButton({
  member,
  className,
}: {
  member: Pick<MemberRecord, "id" | "name" | "role">;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const handleRemove = () => {
    const roleLabel = member.role === "parent" ? "veli" : "öğretmen";
    (async () => {
      const confirmed = await confirmModal({
        title: "Üyeliği Sonlandır",
        message: `"${member.name}" hesabını kurumdan çıkarmak istiyor musunuz? Bu işlem ${roleLabel} hesabının kurum erişimini kapatır.`,
        variant: "danger",
        confirmText: "Kurumdan Çıkar",
        cancelText: "Vazgeç",
      });

      if (!confirmed) return;

      startTransition(async () => {
        const payload: RemoveInstitutionMemberInput = { userId: member.id };
        const result = await removeInstitutionMemberAction(payload);

        showResult(result, {
          successTitle: "Uyelik guncellendi",
          errorTitle: "Uyelik guncellenemedi",
        });

        if (result.success) {
          router.refresh();
        }
      });
    })();
  };

  return (
    <Button
      variant="danger"
      disabled={isPending}
      onClick={handleRemove}
      className={className}
    >
      {isPending ? "Cikariliyor..." : "Kurumdan Cikar"}
    </Button>
  );
}

function MemberStateButton({ member }: { member: Pick<MemberRecord, "id" | "isActive"> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  return (
    <Button
      variant={member.isActive ? "ghost" : "secondary"}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await updateInstitutionMemberStateAction({
            userId: member.id,
            isActive: !member.isActive,
          });
          showResult(result, {
            successTitle: member.isActive ? "Üye pasife alindi" : "Üye aktif edildi",
            errorTitle: "Üye durumu guncellenemedi",
          });
          if (result.success) {
            router.refresh();
          }
        })
      }
    >
      {isPending ? "Guncelleniyor..." : member.isActive ? "Pasife Al" : "Aktif Et"}
    </Button>
  );
}

function buildInitialForm(member: MemberRecord): StaffFormState {
  const isAll = member.allowedModules.length === 0 || member.allowedModules.includes("all");
  return {
    userId: member.id,
    branch: member.branch ?? "",
    employmentType: member.employmentType ?? "",
    allowedModules: isAll ? ["all"] : member.allowedModules,
  };
}

function StaffCard({ member }: { member: MemberRecord }) {
  const router = useRouter();
  const [form, setForm] = useState<StaffFormState>(buildInitialForm(member));
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const allModules = form.allowedModules.includes("all");

  const toggleModule = (module: ScopedModulePermission) => {
    setForm((current) => {
      const currentModules = current.allowedModules.filter(
        (item): item is ScopedModulePermission => item !== "all",
      );
      const nextModules = currentModules.includes(module)
        ? currentModules.filter((item) => item !== module)
        : [...currentModules, module];

      return {
        ...current,
        allowedModules: nextModules,
      };
    });
  };

  const saveProfile = () => {
    startTransition(async () => {
      const payload: StaffProfileInput = {
        userId: form.userId,
        branch: form.branch,
        employmentType: form.employmentType,
        allowedModules: form.allowedModules,
      };

      const result = await updateStaffProfileAction(payload);
      setMessage(result.message);
      showResult(result, {
        successTitle: "Üye bilgileri guncellendi",
        errorTitle: "Üye bilgileri guncellenemedi",
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  return (
    <div className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-white">{member.name}</div>
          <div className="text-xs text-neutral-400">{member.email}</div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-neutral-400">
            <Badge tone="neutral">{roleLabels[member.role]}</Badge>
            <Badge tone={member.isActive ? "success" : "neutral"}>
              {member.isActive ? "Aktif" : "Pasif"}
            </Badge>
            <Badge tone="neutral">{member._count.assignedSessions} seans</Badge>
          </div>
        </div>
        <div className="grid gap-1 text-right text-sm text-neutral-400">
          <div>{member._count.students} öğrenci sahibi</div>
          <div>{member._count.documents} BEP olusturdu</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Brans">
          <input
            className={inputClassName()}
            value={form.branch}
            onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))}
            placeholder="Ozel Egitim / DKT / Ergoterapi"
          />
        </Field>
        <Field label="Calisma tipi">
          <select
            className={inputClassName()}
            value={form.employmentType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                employmentType: event.target.value as StaffEmploymentType | "",
              }))
            }
          >
            <option value="">Seçiniz</option>
            <option value="full_time">Tam zamanli</option>
            <option value="part_time">Yari zamanli</option>
            <option value="consultant">Danisman</option>
          </select>
        </Field>
        <Field label="Mevcut profil">
          <div className={`${inputClassName()} flex items-center bg-white/[0.02] text-neutral-400`}>
            {member.employmentType
              ? `${employmentLabels[member.employmentType]} / ${member.branch ?? "Brans yok"}`
              : member.branch ?? "Personel tipi ve brans tanimli değil"}
          </div>
        </Field>
      </div>

      <div className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div>
            <div className="text-sm font-semibold text-white">Modül Yetkileri</div>
            <div className="text-xs text-neutral-400">
              Tüm modüller seçiliyken alt yetkileri tek tek belirtmeniz gerekmez.
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-neutral-200 cursor-pointer select-none transition hover:bg-white/[0.05]">
            <input
              type="checkbox"
              className="rounded border-white/15 bg-black/25 text-neutral-200 focus:ring-0 cursor-pointer"
              checked={allModules}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  allowedModules: event.target.checked ? ["all"] : [...ALL_SCOPED_PERMISSIONS],
                }))
              }
            />
            Tüm Kurum Modülleri
          </label>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {ALL_SCOPED_PERMISSIONS.map((module) => (
            <label
              key={module}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition select-none cursor-pointer",
                allModules
                  ? "border-white/5 bg-white/[0.01] text-neutral-500 opacity-60 cursor-not-allowed"
                  : form.allowedModules.includes(module)
                  ? "border-white/20 bg-white/[0.06] text-white"
                  : "border-white/10 bg-black/20 text-neutral-400 hover:bg-black/35 hover:text-white"
              )}
            >
              <input
                type="checkbox"
                checked={allModules || form.allowedModules.includes(module)}
                disabled={allModules}
                onChange={() => toggleModule(module)}
                className="rounded border-white/15 bg-black/25 text-neutral-200 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
              />
              {moduleLabels[module]}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={isPending} onClick={saveProfile}>
          {isPending ? "Kaydediliyor..." : "Profili Güncelle"}
        </Button>
        {member.role !== "institution" ? (
          <Button
            variant={member.isActive ? "ghost" : "secondary"}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateInstitutionMemberStateAction({
                  userId: member.id,
                  isActive: !member.isActive,
                });
                setMessage(result.message);
                showResult(result, {
                  successTitle: member.isActive ? "Üye pasife alindi" : "Üye aktif edildi",
                  errorTitle: "Üye durumu guncellenemedi",
                });
                if (result.success) {
                  router.refresh();
                }
              })
            }
          >
            {member.isActive ? "Pasife Al" : "Aktif Et"}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          onClick={() => {
            setForm(buildInitialForm(member));
            setMessage("");
          }}
        >
          Sifirla
        </Button>
        {member.role === "teacher" ? <RemoveInstitutionMemberButton member={member} /> : null}
        {message ? <div className="text-sm text-neutral-400">{message}</div> : null}
      </div>
    </div>
  );
}

export function StaffManagementBoard({ members }: { members: MemberRecord[] }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [employmentFilter, setEmploymentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const staffMembers = members.filter((member) => member.role !== "parent");
  const parentMembers = members.filter((member) => member.role === "parent");
  const branchOptions = Array.from(
    new Set(members.map((member) => member.branch).filter((branch): branch is string => Boolean(branch))),
  ).sort((left, right) => left.localeCompare(right, "tr"));
  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
  const filteredMembers = members
    .filter((member) => {
      const matchesQuery =
        !normalizedQuery ||
        member.name.toLocaleLowerCase("tr-TR").includes(normalizedQuery) ||
        member.email.toLocaleLowerCase("tr-TR").includes(normalizedQuery);
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? member.isActive : !member.isActive);
      const matchesBranch = branchFilter === "all" || member.branch === branchFilter;
      const matchesEmployment =
        employmentFilter === "all" || member.employmentType === employmentFilter;

      return matchesQuery && matchesRole && matchesStatus && matchesBranch && matchesEmployment;
    })
    .sort((left, right) => {
      if (sortBy === "sessions") {
        return right._count.assignedSessions - left._count.assignedSessions;
      }
      if (sortBy === "students") {
        return right._count.students - left._count.students;
      }
      return left.name.localeCompare(right.name, "tr");
    });
  const filteredStaff = filteredMembers.filter((member) => member.role !== "parent");
  const filteredParents = filteredMembers.filter((member) => member.role === "parent");

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] text-neutral-400 font-medium uppercase tracking-wider">Toplam Personel</div>
          <div className="mt-2 text-2xl font-semibold text-white">{staffMembers.length}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] text-neutral-400 font-medium uppercase tracking-wider">Aktif Eğitimci</div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {staffMembers.filter((member) => member.role === "teacher" && member.isActive).length}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] text-neutral-400 font-medium uppercase tracking-wider">Bağlı Veli</div>
          <div className="mt-2 text-2xl font-semibold text-white">{parentMembers.length}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] text-neutral-400 font-medium uppercase tracking-wider">Planlı Toplam Seans</div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {staffMembers.reduce((total, member) => total + member._count.assignedSessions, 0)}
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-white">Üye arama ve filtreleme</div>
            <div className="text-sm text-neutral-500">
              {filteredMembers.length} / {members.length} uye gosteriliyor
            </div>
          </div>
          <Link href="/panel/davet-kodlari">
            <Button>Davet Kodu Oluştur</Button>
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input
            className={inputClassName()}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ad veya e-posta ara"
          />
          <select className={inputClassName()} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">Tum roller</option>
            <option value="institution">Kurum Yoneticisi</option>
            <option value="teacher">Öğretmen</option>
            <option value="parent">Veli</option>
          </select>
          <select className={inputClassName()} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Tum durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
          <select className={inputClassName()} value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            <option value="all">Tum branslar</option>
            {branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
          </select>
          <select className={inputClassName()} value={employmentFilter} onChange={(event) => setEmploymentFilter(event.target.value)}>
            <option value="all">Tum calisma tipleri</option>
            <option value="full_time">Tam zamanli</option>
            <option value="part_time">Yari zamanli</option>
            <option value="consultant">Danisman</option>
          </select>
          <select className={inputClassName()} value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="name">Ada gore sırala</option>
            <option value="sessions">Seans yukune gore</option>
            <option value="students">Öğrenci yukune gore</option>
          </select>
        </div>
        <div>
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setRoleFilter("all");
              setStatusFilter("all");
              setBranchFilter("all");
              setEmploymentFilter("all");
              setSortBy("name");
            }}
          >
            Filtreleri Temizle
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredStaff.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-[13px] text-neutral-500 text-center">
            Henüz kurum personeli bulunmuyor.
          </div>
        ) : (
          filteredStaff.map((member) => <StaffCard key={member.id} member={member} />)
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Veli Hesapları
        </div>
        <div className="mt-4 grid gap-3">
          {filteredParents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-[13px] text-neutral-500 text-center">
              Henüz kuruma bağlı veli hesabı yok.
            </div>
          ) : (
            filteredParents.map((member) => (
              <div
                key={member.id}
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{member.name}</div>
                    <div className="text-xs text-neutral-400">{member.email}</div>
                  </div>
                  <div className="text-xs text-neutral-400">
                    {member.parentStudentLinks.length} öğrenci bağlantısı
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-neutral-400">
                  {member.parentStudentLinks.length === 0 ? (
                    <span className="rounded-lg border border-white/15 bg-white/[0.02] px-2 py-0.5">
                      Henüz öğrenci atanmadı
                    </span>
                  ) : (
                    member.parentStudentLinks.map((link) => (
                      <span
                        key={link.id}
                        className="rounded-lg border border-white/15 bg-white/[0.02] px-2 py-0.5"
                      >
                        {link.student.firstName} {link.student.lastName}
                      </span>
                    ))
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-neutral-500">
                    Kurumdan cikarildiginda veli hesabi ve öğrenci eslesmeleri kurum ekranindan
                    dusurulur.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <MemberStateButton member={member} />
                    <RemoveInstitutionMemberButton member={member} className="w-full sm:w-auto" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
