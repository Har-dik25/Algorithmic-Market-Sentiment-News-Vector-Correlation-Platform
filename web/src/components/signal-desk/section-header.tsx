"use client";

import * as React from "react";

export function SectionHeader({
  id,
  title,
  description,
  icon: Icon,
  action,
}: {
  id?: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div id={id} className="flex flex-wrap items-end justify-between gap-3 scroll-mt-20">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/40">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-[11px] text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
