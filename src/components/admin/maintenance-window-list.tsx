"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sendMaintenanceWindowNotificationAction,
  updateMaintenanceWindowStatusAction,
  deleteMaintenanceWindowAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2, Play, Ban, Calendar, Mail } from "lucide-react";

type MaintenanceWindow = {
  id: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  autoActivate: boolean;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  createdBy: {
    name: string;
    email: string;
  };
};

type Props = {
  windows: MaintenanceWindow[];
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getStatusBadge(status: MaintenanceWindow["status"]) {
  switch (status) {
    case "scheduled":
      return <Badge tone="info">Planlandı</Badge>;
    case "in_progress":
      return <Badge tone="warning">Devam Ediyor</Badge>;
    case "completed":
      return <Badge tone="success">Tamamlandı</Badge>;
    case "cancelled":
      return <Badge tone="danger">İptal Edildi</Badge>;
    default:
      return null;
  }
}

export function MaintenanceWindowList({ windows }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const handleUpdateStatus = (id: string, status: MaintenanceWindow["status"]) => {
    if (confirm("Bu bakım penceresinin durumunu güncellemek istediğinizden emin misiniz?")) {
      startTransition(async () => {
        const result = await updateMaintenanceWindowStatusAction(id, status);
        showResult(result, {
          successTitle: "Durum Güncellendi",
          errorTitle: "Durum Güncellenemedi",
        });
        if (result.success) {
          router.refresh();
        }
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Bu bakım penceresini kalıcı olarak silmek istediğinizden emin misiniz?")) {
      startTransition(async () => {
        const result = await deleteMaintenanceWindowAction(id);
        showResult(result, {
          successTitle: "Bakım Penceresi Silindi",
          errorTitle: "Bakım Penceresi Silinemedi",
        });
        if (result.success) {
          router.refresh();
        }
      });
    }
  };

  const handleSendNotification = (id: string) => {
    if (confirm("Bu bakım planı için tüm aktif kullanıcılara bilgilendirme e-postası göndermek istediğinizden emin misiniz?")) {
      startTransition(async () => {
        const result = await sendMaintenanceWindowNotificationAction(id);
        showResult(result, {
          successTitle: "E-posta Gönderimi Başlatıldı",
          errorTitle: "E-posta Gönderilemedi",
        });
      });
    }
  };

  if (windows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="size-10 text-neutral-600 mb-3" />
        <p className="text-sm text-neutral-400">Planlanmış veya geçmiş bakım penceresi bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-neutral-400">
            <th className="py-3 px-4">Başlık / Açıklama</th>
            <th className="py-3 px-4">Tarih Aralığı</th>
            <th className="py-3 px-4">Oto-Aktif</th>
            <th className="py-3 px-4">Durum</th>
            <th className="py-3 px-4 text-right">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-sm text-neutral-200">
          {windows.map((w) => (
            <tr key={w.id} className="hover:bg-white/[0.01] transition-colors duration-150">
              <td className="py-4 px-4 max-w-xs">
                <div className="font-semibold text-white">{w.title}</div>
                {w.description && (
                  <div className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    {w.description}
                  </div>
                )}
                <div className="text-[10px] text-neutral-500 mt-1.5">
                  Planlayan: {w.createdBy.name}
                </div>
              </td>
              <td className="py-4 px-4 whitespace-nowrap">
                <div className="text-xs">
                  <div className="text-neutral-400">Başlangıç: <span className="text-neutral-200">{formatDateTime(w.startsAt)}</span></div>
                  <div className="text-neutral-400 mt-0.5">Bitiş: <span className="text-neutral-200">{formatDateTime(w.endsAt)}</span></div>
                </div>
              </td>
              <td className="py-4 px-4 whitespace-nowrap text-xs">
                {w.autoActivate ? (
                  <span className="text-emerald-400">Aktif</span>
                ) : (
                  <span className="text-neutral-500">Pasif</span>
                )}
              </td>
              <td className="py-4 px-4 whitespace-nowrap">
                {getStatusBadge(w.status)}
              </td>
              <td className="py-4 px-4 whitespace-nowrap text-right">
                <div className="inline-flex gap-2">
                  {(w.status === "scheduled" || w.status === "in_progress") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      className="size-8 p-0 flex items-center justify-center"
                      title="Mail gönder"
                      onClick={() => handleSendNotification(w.id)}
                    >
                      <Mail className="size-4 text-sky-400" />
                    </Button>
                  )}
                  {w.status === "scheduled" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      className="size-8 p-0 flex items-center justify-center"
                      title="Başlat"
                      onClick={() => handleUpdateStatus(w.id, "in_progress")}
                    >
                      <Play className="size-4 text-amber-400" />
                    </Button>
                  )}
                  {w.status === "in_progress" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      className="size-8 p-0 flex items-center justify-center"
                      title="Tamamla"
                      onClick={() => handleUpdateStatus(w.id, "completed")}
                    >
                      <CheckCircle2 className="size-4 text-emerald-400" />
                    </Button>
                  )}
                  {(w.status === "scheduled" || w.status === "in_progress") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      className="size-8 p-0 flex items-center justify-center"
                      title="İptal Et"
                      onClick={() => handleUpdateStatus(w.id, "cancelled")}
                    >
                      <Ban className="size-4 text-rose-400" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    className="size-8 p-0 flex items-center justify-center"
                    title="Sil"
                    onClick={() => handleDelete(w.id)}
                  >
                    <Trash2 className="size-4 text-neutral-400 hover:text-rose-400" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
