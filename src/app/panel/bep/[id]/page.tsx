import { notFound } from "next/navigation";

import { BepDetailWorkspace } from "@/components/bep/bep-detail-workspace";
import { BepApprovalActions } from "@/components/institution/bep-approval-actions";
import { PanelPageIntro } from "@/components/layout/panel-page-intro";
import { Card } from "@/components/ui/card";
import { listCurriculumCourses } from "@/lib/curriculum";
import { getBepDocumentById, shouldAskForBepCompletionFeedback } from "@/lib/data";
import {
  canApproveBep,
  canCreateBep,
  isParentRole,
  shouldShowBepApprovalFlow,
} from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export default async function BepDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feedback?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { feedback } = await searchParams;

  // Yerel sürüm: BEP devir (transfer) mantığı kaldırıldı.
  const [document, shouldAskForFeedback] = await Promise.all([
    getBepDocumentById(user, id),
    shouldAskForBepCompletionFeedback(user, id),
  ]);

  if (!document) {
    notFound();
  }

  const showApprovalFlow = shouldShowBepApprovalFlow(user);
  const canEdit = !isParentRole(user.role);

  return (
    <div className="grid gap-6">
      <PanelPageIntro
        eyebrow="BEP"
        title={document.title}
        aside={
          <Card variant="subtle" className="h-full">
            <div className="grid gap-4">
              <div>
                <div className="text-[12px] font-medium uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                  Belge özeti
                </div>
                <div className="mt-2 text-xl font-semibold text-[color:var(--panel-text)]">
                  {document.student.firstName} {document.student.lastName}
                </div>
                <div className="mt-1 text-sm text-[color:var(--panel-text-muted)]">
                  Hazırlayan: {document.owner.name ?? document.owner.email}
                </div>
              </div>
            </div>
          </Card>
        }
      />

      {showApprovalFlow ? (
        <BepApprovalActions
          documentId={document.id}
          approvalStatus={document.approvalStatus as "pending" | "approved" | "rejected"}
          approvedByName={document.approvedByName}
          approvedAt={document.approvedAt}
          rejectedByName={document.rejectedByName}
          rejectedAt={document.rejectedAt}
          rejectionReason={document.rejectionReason}
          canManage={canApproveBep(user.role)}
        />
      ) : null}

      <BepDetailWorkspace
        documentId={document.id}
        documentTitle={document.title}
        studentName={`${document.student.firstName} ${document.student.lastName}`}
        defaultValues={document.formValues}
        curriculumOptions={listCurriculumCourses()}
        canDelete={canEdit && canCreateBep(user.role)}
        canEdit={canEdit}
        initialShowFeedbackPrompt={
          canEdit && feedback === "1" && canCreateBep(user.role) && shouldAskForFeedback
        }
      />
    </div>
  );
}
