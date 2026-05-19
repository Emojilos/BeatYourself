"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Droplet, Plus } from "lucide-react";
import { toast } from "sonner";

import { addWaterAction } from "@/actions/water";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WaterRingProps {
  consumed: number;
  goal: number;
  size?: number;
  portions?: readonly number[];
  className?: string;
}

const DEFAULT_PORTIONS = [250, 500] as const;

function formatMl(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function WaterRing({
  consumed,
  goal,
  size = 144,
  portions = DEFAULT_PORTIONS,
  className,
}: WaterRingProps) {
  const reduceMotion = useReducedMotion();
  const [pendingPortion, setPendingPortion] = React.useState<number | null>(null);
  const [optimisticDelta, setOptimisticDelta] = React.useState(0);
  const [lastSyncedConsumed, setLastSyncedConsumed] = React.useState(consumed);

  if (consumed !== lastSyncedConsumed) {
    setLastSyncedConsumed(consumed);
    setOptimisticDelta(0);
  }

  const effectiveConsumed = Math.max(0, consumed + optimisticDelta);
  const effectiveGoal = Math.max(1, goal);
  const pct = Math.min(100, Math.round((effectiveConsumed / effectiveGoal) * 100));
  const remaining = Math.max(0, effectiveGoal - effectiveConsumed);

  const stroke = Math.max(8, Math.round(size * 0.08));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(1, effectiveConsumed / effectiveGoal));

  async function handleAdd(portion: number) {
    setPendingPortion(portion);
    setOptimisticDelta((d) => d + portion);
    const result = await addWaterAction({ amountMl: portion });
    if (!result.success) {
      setOptimisticDelta((d) => d - portion);
      toast.error(result.error || "Не удалось добавить воду");
    } else {
      toast.success(`+${formatMl(portion)} мл`);
    }
    setPendingPortion(null);
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`Выпито ${formatMl(effectiveConsumed)} из ${formatMl(effectiveGoal)} миллилитров`}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-primary/15"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: reduceMotion ? dashOffset : circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeOut" }}
            className="stroke-primary"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <Droplet className="text-primary mb-1 size-5" aria-hidden />
          <div className="text-foreground text-2xl leading-none font-semibold tabular-nums">
            {pct}
            <span className="text-muted-foreground text-base font-medium">%</span>
          </div>
          <div className="text-muted-foreground mt-1 text-xs tabular-nums">
            {formatMl(effectiveConsumed)} / {formatMl(effectiveGoal)} мл
          </div>
        </div>
      </div>

      <div className="flex w-full justify-center gap-2">
        {portions.map((portion) => (
          <Button
            key={portion}
            type="button"
            variant="outline"
            size="sm"
            disabled={pendingPortion !== null}
            onClick={() => void handleAdd(portion)}
            aria-label={`Добавить ${formatMl(portion)} миллилитров`}
          >
            <Plus aria-hidden />+{formatMl(portion)} мл
          </Button>
        ))}
      </div>

      {remaining > 0 ? (
        <p className="text-muted-foreground text-xs">
          Осталось <span className="text-foreground font-medium">{formatMl(remaining)}</span> мл
        </p>
      ) : (
        <p className="text-primary text-xs font-medium">Дневная норма выполнена!</p>
      )}
    </div>
  );
}
