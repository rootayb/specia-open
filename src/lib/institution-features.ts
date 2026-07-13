export type InstitutionTypeValue =
  | "rehabilitation_center"
  | "public_special_education_practice_school";

type InstitutionScopedUser = {
  institutionId?: string | null;
  institution?: {
    type?: InstitutionTypeValue | null;
  } | null;
};

export function supportsSessionAndFinanceModules(type?: InstitutionTypeValue | null) {
  return type !== "public_special_education_practice_school";
}

export function userSupportsSessionAndFinanceModules(user: InstitutionScopedUser) {
  if (!user.institutionId) {
    return true;
  }

  return supportsSessionAndFinanceModules(user.institution?.type);
}

export const INSTITUTION_TYPE_LABELS: Record<InstitutionTypeValue, string> = {
  rehabilitation_center: "Özel Eğitim ve Rehabilitasyon Merkezi",
  public_special_education_practice_school: "Özel Eğitim Uygulama Okulu",
};
