import { permanentRedirect } from "next/navigation";

export default async function LegacyEvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/panel/degerlendirmeler/ogretim-sonu/${encodeURIComponent(id)}`);
}
