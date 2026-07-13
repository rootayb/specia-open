import { permanentRedirect } from "next/navigation";

export default async function LegacyNewEvaluationPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
  permanentRedirect(`/panel/degerlendirmeler/ogretim-sonu/yeni${query}`);
}
