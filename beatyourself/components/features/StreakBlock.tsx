"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StreakBlockProps {
  current: number;
  longest: number;
}

function pluralizeDays(n: number): string {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 14) return "дней";
  const last = n % 10;
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дня";
  return "дней";
}

export function StreakBlock({ current, longest }: StreakBlockProps) {
  const reduceMotion = useReducedMotion();
  const isActive = current > 0;
  const animate = isActive && !reduceMotion;

  return (
    <Card className={cn("w-full", !isActive && "bg-muted/40")}>
      <CardContent className="flex flex-col items-center gap-4 px-6 py-8 sm:flex-row sm:gap-6">
        <motion.div
          aria-hidden
          className={cn(
            "flex size-16 items-center justify-center rounded-full sm:size-20",
            isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
          animate={animate ? { scale: [1, 1.08, 1] } : undefined}
          transition={animate ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : undefined}
        >
          <Flame className="size-8 sm:size-10" />
        </motion.div>
        <div className="text-center sm:text-left">
          <div className="flex items-baseline justify-center gap-2 sm:justify-start">
            <span
              className={cn(
                "text-5xl leading-none font-semibold tabular-nums sm:text-6xl",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {current}
            </span>
            <span className="text-muted-foreground text-sm sm:text-base">
              {pluralizeDays(current)} подряд
            </span>
          </div>
          {isActive ? (
            <p className="text-muted-foreground mt-2 text-sm">
              <span aria-hidden>🏆 </span>
              Лучший: {longest} {pluralizeDays(longest)}
            </p>
          ) : (
            <p className="text-muted-foreground mt-2 text-sm font-medium">Начни сегодня!</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
