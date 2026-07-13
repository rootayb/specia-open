import { permanentRedirect } from "next/navigation";

export default async function LegacyCourseEvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/panel/degerlendirmeler/kaba/${encodeURIComponent(id)}`);
}
