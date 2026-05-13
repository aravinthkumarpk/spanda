"use client";

import type { ComponentProps } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StaleBeatDialogTriggerProps = ComponentProps<typeof Button> & {
  staleCount: number;
  queuedCount: number;
};

export function StaleBeatDialogTrigger({
  staleCount,
  queuedCount,
  className,
  ...props
}: StaleBeatDialogTriggerProps) {
  return (
    <Button
      {...props}
      type="button"
      size="sm"
      variant={staleCount > 0 ? "secondary" : "outline"}
      className={cn("h-8 gap-1.5", className)}
      data-testid="stale-beats-dialog-trigger"
    >
      <Sparkles className="size-3.5" />
      <span>Stale Beats</span>
      <Badge variant="outline" className="h-4 rounded-sm text-[10px]">
        {staleCount}
      </Badge>
      {queuedCount > 0 && (
        <Badge className="h-4 rounded-sm text-[10px]">
          Queued {queuedCount}
        </Badge>
      )}
    </Button>
  );
}
