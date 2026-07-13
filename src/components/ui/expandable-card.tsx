"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";

interface ExpandableCardProps {
  eyebrow?: string;
  title: string;
  description?: string;
  initialLimit?: number;
  increment?: number;
  totalCount: number;
  variant?: "default" | "subtle" | "ghost" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  children: (limit: number) => React.ReactNode;
}

export function ExpandableCard({
  eyebrow,
  title,
  description,
  initialLimit = 3,
  increment = 5,
  totalCount,
  variant = "subtle",
  padding = "lg",
  className,
  children,
}: ExpandableCardProps) {
  const [limit, setLimit] = useState(initialLimit);
  const hasMore = totalCount > limit;

  const actionButton = hasMore ? (
    <Button
      variant="ghost"
      size="sm"
      className="text-neutral-400 hover:text-white hover:bg-white/5 text-xs rounded-lg font-medium"
      onClick={() => setLimit((prev) => prev + increment)}
    >
      Daha Fazlası ({totalCount - limit})
    </Button>
  ) : null;

  return (
    <Card variant={variant} padding={padding} className={className}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={actionButton}
        align="between"
      />
      <div className="mt-6">
        {children(limit)}
      </div>
    </Card>
  );
}
