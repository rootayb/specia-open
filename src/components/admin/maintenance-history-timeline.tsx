"use client";

import { Activity, User } from "lucide-react";

type HistoryItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: any;
  createdAt: Date;
  actor: {
    name: string;
    email: string;
  } | null;
};

type Props = {
  history: HistoryItem[];
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function MaintenanceHistoryTimeline({ history }: Props) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className="size-10 text-neutral-600 mb-3" />
        <p className="text-sm text-neutral-400">Herhangi bir bakım geçmişi kaydı bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="relative border-l border-white/10 pl-6 ml-3 space-y-6">
      {history.map((item) => (
        <div key={item.id} className="relative">
          <span className="absolute -left-[31px] top-1.5 size-4 rounded-full border-2 border-white/20 bg-neutral-900 flex items-center justify-center">
            <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
          </span>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-neutral-400 font-medium">
                {formatDateTime(item.createdAt)}
              </span>
              {item.actor && (
                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                  <User className="size-3" />
                  {item.actor.name}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-200 mt-1.5 font-medium leading-relaxed">
              {item.summary}
            </p>
            {item.metadata && typeof item.metadata === "object" && Object.keys(item.metadata).length > 0 && (
              <div className="mt-2 text-xs text-neutral-400 bg-white/[0.02] border border-white/5 rounded-lg p-2 max-w-lg overflow-x-auto font-mono">
                {JSON.stringify(item.metadata, null, 2)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
