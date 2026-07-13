"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  User as UserIcon,
  MessageSquare,
  ArrowLeft,
  Send,
  AlertCircle,
  Globe,
  Mail,
} from "lucide-react";
import { replySupportTicketAction, updateSupportTicketStatusAction, deleteSupportTicketAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";

type Reply = {
  id: string;
  message: string;
  isStaff: boolean;
  createdAt: Date;
  name: string;
  user?: {
    name: string;
    email: string;
    role: string;
  } | null;
};

type Ticket = {
  id: string;
  subject: string;
  message: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  source: string;
  createdAt: Date;
  email: string;
  name: string | null;
  replies: Reply[];
};

const statusLabels: Record<string, string> = {
  open: "Açık",
  in_progress: "İşlemde",
  resolved: "Çözüldü",
  closed: "Kapatıldı",
};

const statusClasses: Record<string, string> = {
  open: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
  in_progress: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  resolved: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  closed: "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20",
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DestekDetail({
  ticket,
  currentUser,
}: {
  ticket: Ticket;
  currentUser: { id: string; role: string };
}) {
  const router = useRouter();
  const [replyMessage, setReplyMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const isAdmin = currentUser.role === "admin";

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    startTransition(async () => {
      const result = await replySupportTicketAction({
        ticketId: ticket.id,
        message: replyMessage,
      });

      showResult(result, {
        successTitle: "Yanıt Eklendi",
        errorTitle: "Hata",
      });

      if (result.success) {
        setReplyMessage("");
        router.refresh();
      }
    });
  };

  const handleStatusChange = (newStatus: "open" | "in_progress" | "resolved" | "closed") => {
    startTransition(async () => {
      const result = await updateSupportTicketStatusAction({
        ticketId: ticket.id,
        status: newStatus,
      });

      showResult(result, {
        successTitle: "Durum Güncellendi",
        errorTitle: "Hata",
      });

      if (result.success) {
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!window.confirm("Bu destek talebini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteSupportTicketAction({
        ticketId: ticket.id,
      });

      showResult(result, {
        successTitle: "Talep Silindi",
        errorTitle: "Hata",
      });

      if (result.success) {
        router.push(isAdmin ? "/panel/admin/destek-talepleri" : "/panel/destek");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={isAdmin ? "/panel/admin/destek-talepleri" : "/panel/destek"}
          className="inline-flex items-center gap-2 text-sm text-[color:var(--panel-text-soft)] hover:text-[color:var(--panel-text)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Taleplere Geri Dön
        </Link>

        <div className="flex items-center gap-3">
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs !py-1.5 !px-3"
          >
            Talebi Sil
          </Button>

          {isAdmin && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[color:var(--panel-text-soft)]">Talep Durumu:</span>
              <select
                value={ticket.status}
                onChange={(e) =>
                  handleStatusChange(e.target.value as "open" | "in_progress" | "resolved" | "closed")
                }
                className={`${inputClassName()} !py-1.5 !px-3 !w-auto text-xs`}
                disabled={isPending}
              >
                <option value="open">Açık</option>
                <option value="in_progress">İşlemde</option>
                <option value="resolved">Çözüldü</option>
                <option value="closed">Kapatıldı</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main conversation column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Ticket Card */}
          <Card padding="md" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    statusClasses[ticket.status] || statusClasses.open
                  }`}
                >
                  {statusLabels[ticket.status] || ticket.status}
                </span>
                <h1 className="text-xl font-bold text-[color:var(--panel-text)] mt-2">
                  {ticket.subject}
                </h1>
              </div>
              <div className="text-xs text-[color:var(--panel-text-soft)] text-right space-y-1">
                <div className="flex items-center justify-end gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(ticket.createdAt)}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  {ticket.source === "email" ? (
                    <>
                      <Mail className="h-3 w-3 text-emerald-400" />
                      E-posta ile gönderildi
                    </>
                  ) : (
                    <>
                      <Globe className="h-3 w-3 text-sky-400" />
                      Web panelinden gönderildi
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Original message content */}
            <div className="text-sm text-[color:var(--panel-text)] whitespace-pre-wrap leading-relaxed py-2">
              {ticket.message || <em className="text-neutral-500">Açıklama belirtilmemiş.</em>}
            </div>

            {/* Sender Metadata */}
            <div className="flex items-center gap-3 pt-3 border-t border-white/5 text-xs text-[color:var(--panel-text-muted)]">
              <div className="h-7 w-7 rounded-full bg-white/5 flex items-center justify-center">
                <UserIcon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium text-[color:var(--panel-text-soft)]">
                  {ticket.name || "Kullanıcı"}
                </div>
                <div>{ticket.email}</div>
              </div>
            </div>
          </Card>

          {/* Message Thread */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--panel-text-soft)] flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Görüşme Geçmişi ({ticket.replies.length})
            </h3>

            <div className="space-y-4">
              {ticket.replies.length === 0 ? (
                <div className="text-center py-6 text-xs text-[color:var(--panel-text-soft)] bg-white/[0.01] rounded-2xl border border-white/5">
                  Henüz yanıt eklenmedi.
                </div>
              ) : (
                ticket.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`flex flex-col gap-2 rounded-2xl p-4 border transition-all ${
                      reply.isStaff
                        ? "bg-sky-500/[0.03] border-sky-500/10 ml-6"
                        : "bg-white/[0.02] border-white/5 mr-6"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <span className="font-semibold text-[color:var(--panel-text)] flex items-center gap-1.5">
                        {reply.isStaff ? (
                          <span className="bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded text-[10px] font-bold">
                            Destek Ekibi
                          </span>
                        ) : (
                          <span className="bg-white/5 text-[color:var(--panel-text-soft)] px-2 py-0.5 rounded text-[10px] font-bold">
                            Kullanıcı
                          </span>
                        )}
                        {reply.name}
                      </span>
                      <span className="text-[color:var(--panel-text-soft)] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(reply.createdAt)}
                      </span>
                    </div>
                    <div className="text-sm text-[color:var(--panel-text)] whitespace-pre-wrap leading-relaxed">
                      {reply.message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reply Form */}
          <Card padding="md">
            <form onSubmit={handleReplySubmit} className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-[color:var(--panel-text)]">
                  Bir Yanıt Yazın
                </h4>
                {(ticket.status === "closed" || ticket.status === "resolved") && (
                  <div className="mt-2 flex items-start gap-2 bg-amber-500/5 text-amber-400 border border-amber-500/10 rounded-xl p-3 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      Talep kapatılmış veya çözülmüş durumda. Yanıt gönderdiğinizde talep tekrar <strong>Açık</strong> duruma getirilecektir.
                    </div>
                  </div>
                )}
              </div>

              <Field label="">
                <textarea
                  className={inputClassName()}
                  rows={4}
                  required
                  placeholder="Mesajınızı buraya yazın..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  disabled={isPending}
                />
              </Field>

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending || !replyMessage.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  {isPending ? "Gönderiliyor..." : "Yanıtı Gönder"}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar Info Column */}
        <div className="space-y-6">
          <Card padding="md" className="space-y-4">
            <h3 className="text-sm font-bold text-[color:var(--panel-text)] uppercase tracking-wider border-b border-white/10 pb-2">
              Talep Detayları
            </h3>

            <div className="space-y-3 text-xs text-[color:var(--panel-text-soft)]">
              <div>
                <span className="font-semibold text-[color:var(--panel-text-muted)] block mb-1">
                  Talep ID
                </span>
                <code className="bg-white/5 px-1.5 py-0.5 rounded text-[10px]">
                  {ticket.id}
                </code>
              </div>

              <div>
                <span className="font-semibold text-[color:var(--panel-text-muted)] block mb-1">
                  Oluşturan
                </span>
                <span className="text-[color:var(--panel-text)] font-medium">
                  {ticket.name || "İsimsiz"}
                </span>
              </div>

              <div>
                <span className="font-semibold text-[color:var(--panel-text-muted)] block mb-1">
                  E-posta
                </span>
                <a
                  href={`mailto:${ticket.email}`}
                  className="text-sky-400 hover:underline"
                >
                  {ticket.email}
                </a>
              </div>

              <div>
                <span className="font-semibold text-[color:var(--panel-text-muted)] block mb-1">
                  Oluşturulma Tarihi
                </span>
                <span>{formatDateTime(ticket.createdAt)}</span>
              </div>

              <div>
                <span className="font-semibold text-[color:var(--panel-text-muted)] block mb-1">
                  Kaynak Kanalı
                </span>
                <span className="capitalize">{ticket.source}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
