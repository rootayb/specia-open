"use client";

import React, { useState } from "react";
import { Button } from "./button";

interface ExpandableListProps {
  children: React.ReactNode;
  initialLimit?: number;
  increment?: number;
  emptyMessage?: React.ReactNode;
  className?: string;
}

export function ExpandableList({
  children,
  initialLimit = 3,
  increment = 5,
  emptyMessage = <div className="text-sm text-neutral-500">Kayıt bulunamadı.</div>,
  className = "grid gap-3",
}: ExpandableListProps) {
  const [limit, setLimit] = useState(initialLimit);

  // Convert children to an array to handle empty checks and slicing safely
  const childrenArray = React.Children.toArray(children).filter(Boolean);
  const visibleChildren = childrenArray.slice(0, limit);
  const hasMore = childrenArray.length > limit;

  if (childrenArray.length === 0) {
    return <>{emptyMessage}</>;
  }

  return (
    <div className="space-y-3">
      <div className={className}>
        {visibleChildren}
      </div>
      {hasMore && (
        <div className="flex justify-start">
          <Button
            variant="ghost"
            size="sm"
            className="text-neutral-400 hover:text-white px-0 hover:bg-transparent text-xs"
            onClick={() => setLimit((prev) => prev + increment)}
          >
            Daha Fazlası ({childrenArray.length - limit})
          </Button>
        </div>
      )}
    </div>
  );
}
