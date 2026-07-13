import Link from "next/link";
import type { UserRole } from "@/lib/prisma-shim";

import { UserRoleForm } from "@/components/admin/user-role-form";
import { UserStateForm } from "@/components/admin/user-state-form";
import { UserInstitutionForm } from "@/components/admin/user-institution-form";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";

type ListedUser = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  suspendedUntil: Date | null;
  createdAt: Date;
  institutionId: string | null;
  institution: {
    name: string;
    slug: string;
  } | null;
  _count: {
    students: number;
    documents: number;
    parentStudentLinks: number;
  };
};

type InstitutionOption = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  currentUserId: string;
  users: ListedUser[];
  institutions: InstitutionOption[];
  totalCount: number;
  filters: {
    q: string;
    role: "all" | "admin" | "institution" | "teacher" | "parent";
    scope: "all" | "independent" | string;
    state: "all" | "active" | "inactive";
  };
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function roleLabel(role: UserRole) {
  switch (role) {
    case "admin":
      return "Admin";
    case "institution":
      return "Kurum yöneticisi";
    case "teacher":
      return "Öğretmen";
    case "parent":
      return "Veli";
    default:
      return role;
  }
}

export function AdminUserManagementPanel({
  currentUserId,
  users,
  institutions,
  totalCount,
  filters,
}: Props) {
  return (
    <div className="space-y-6">
      <form className="grid gap-4 rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4 sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_repeat(3,minmax(0,0.75fr))]">
        <input type="hidden" name="section" value="kullanıcılar" />
        <Field label="Kullanıcı ara" hint="Ad veya e-posta ile filtreleyin.">
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Örnek: Ayşe veya ayse@..."
            className={inputClassName()}
          />
        </Field>

        <Field label="Rol">
          <select name="role" defaultValue={filters.role} className={inputClassName()}>
            <option value="all">Tüm roller</option>
            <option value="admin">Admin</option>
            <option value="institution">Kurum yöneticisi</option>
            <option value="teacher">Öğretmen</option>
            <option value="parent">Veli</option>
          </select>
        </Field>

        <Field label="Kurum kapsamı">
          <select name="scope" defaultValue={filters.scope} className={inputClassName()}>
            <option value="all">Tüm kurumlar</option>
            <option value="independent">Bağımsız kayıtlı</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Durum">
          <select name="state" defaultValue={filters.state} className={inputClassName()}>
            <option value="all">Tüm durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
        </Field>

        <div className="flex flex-wrap items-end gap-3 lg:col-span-4">
          <Button type="submit">Filtreyi uygula</Button>
          <Link
            href="/panel/admin?section=kullanicilar"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-[color:var(--panel-text-muted)] ring-1 ring-[color:var(--panel-border)] transition hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]"
          >
            Temizle
          </Link>
          <div className="ml-auto text-sm text-[color:var(--panel-text-soft)]">
            {totalCount} eşleşen kullanıcı
          </div>
        </div>
      </form>

      <div className="overflow-x-auto rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead>
            <tr className="text-left text-[color:var(--panel-text-soft)]">
              <th className="px-4 py-3 font-medium sm:px-5">Kullanıcı</th>
              <th className="px-4 py-3 font-medium sm:px-5">Rol ve durum</th>
              <th className="px-4 py-3 font-medium sm:px-5">Kurum</th>
              <th className="px-4 py-3 font-medium sm:px-5">Kayıt yoğunluğu</th>
              <th className="px-4 py-3 font-medium sm:px-5">Kayıt tarihi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.length > 0 ? (
              users.map((listedUser) => (
                <tr key={listedUser.id} className="align-top">
                  <td className="px-4 py-4 sm:px-5">
                    <div className="font-semibold text-[color:var(--panel-text)]">
                      {listedUser.name ?? "İsimsiz kullanıcı"}
                    </div>
                    <div className="mt-1 text-[color:var(--panel-text-soft)]">
                      {listedUser.email}
                    </div>
                    <div className="mt-2">
                      <Link
                        href={`/panel/admin?section=denetim&q=${encodeURIComponent(listedUser.email)}`}
                        className="inline-flex items-center gap-1.5 text-xs text-[color:var(--panel-text-soft)] hover:text-[color:var(--panel-text)] transition underline decoration-dotted"
                      >
                        İşlem Loglarını Gör
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-5">
                    <div className="space-y-3">
                      <UserRoleForm
                        userId={listedUser.id}
                        currentRole={listedUser.role}
                        disabled={listedUser.id === currentUserId}
                      />
                      <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--panel-text-soft)]">
                          {roleLabel(listedUser.role)}
                        </div>
                        <UserStateForm
                          userId={listedUser.id}
                          isActive={listedUser.isActive}
                          initialSuspendedUntil={listedUser.suspendedUntil ? listedUser.suspendedUntil.toISOString() : null}
                          disabled={listedUser.id === currentUserId}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-5 text-[color:var(--panel-text-muted)]">
                    <UserInstitutionForm
                      userId={listedUser.id}
                      currentInstitutionId={listedUser.institutionId}
                      institutions={institutions}
                      disabled={false}
                    />
                  </td>
                  <td className="px-4 py-4 sm:px-5 text-[color:var(--panel-text-muted)]">
                    <div>{listedUser._count.students} öğrenci</div>
                    <div className="mt-1">{listedUser._count.documents} BEP</div>
                    <div className="mt-1">
                      {listedUser._count.parentStudentLinks} veli eşleşmesi
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-5 text-[color:var(--panel-text-soft)]">
                    {formatDateTime(listedUser.createdAt)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-[color:var(--panel-text-soft)] sm:px-5"
                >
                  Bu filtrelerle eşleşen kullanıcı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
