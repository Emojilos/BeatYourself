"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Challenge, ChallengeStatus } from "@prisma/client";
import {
  Activity,
  Bike,
  Check,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  Mountain,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { deleteChallengeAction, updateChallengeAction } from "@/actions/challenges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateChallengeSchema, type UpdateChallengeInput } from "@/lib/validation/challenge";
import { cn } from "@/lib/utils";

type FormValues = {
  description?: string;
  endDate: Date;
  color?: string;
  icon?: string;
  status: ChallengeStatus;
};

const TYPE_LABEL: Record<Challenge["type"], string> = {
  cumulative: "Накопительный",
  single_day: "За один день",
};

const METRIC_LABEL: Record<Challenge["metric"], string> = {
  distance_km: "Дистанция",
  steps: "Шаги",
  duration_min: "Длительность",
  runs_count: "Число пробежек",
  custom: "Своя метрика",
};

const DIFFICULTY_LABEL: Record<Challenge["difficulty"], string> = {
  easy: "Легко",
  medium: "Средне",
  hard: "Сложно",
};

const DIFFICULTY_CLASSNAME: Record<Challenge["difficulty"], string> = {
  easy: "bg-green-100 text-green-900 hover:bg-green-100",
  medium: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  hard: "bg-red-100 text-red-900 hover:bg-red-100",
};

const STATUS_OPTIONS: { value: ChallengeStatus; label: string; description: string }[] = [
  { value: "active", label: "Активный", description: "Цель в работе." },
  { value: "archived", label: "В архиве", description: "Скрыт из активного списка." },
];

const COLOR_PRESETS: { value: string; label: string }[] = [
  { value: "#C96442", label: "Терракота" },
  { value: "#3B82F6", label: "Синий" },
  { value: "#10B981", label: "Изумруд" },
  { value: "#F59E0B", label: "Янтарь" },
  { value: "#8B5CF6", label: "Фиолетовый" },
  { value: "#EC4899", label: "Розовый" },
  { value: "#64748B", label: "Графит" },
];

const ICON_PRESETS: { value: string; Icon: LucideIcon; label: string }[] = [
  { value: "Footprints", Icon: Footprints, label: "Шаги" },
  { value: "Activity", Icon: Activity, label: "Активность" },
  { value: "Bike", Icon: Bike, label: "Велосипед" },
  { value: "Dumbbell", Icon: Dumbbell, label: "Сила" },
  { value: "Mountain", Icon: Mountain, label: "Гора" },
  { value: "Flame", Icon: Flame, label: "Огонь" },
  { value: "Trophy", Icon: Trophy, label: "Кубок" },
  { value: "Target", Icon: Target, label: "Цель" },
  { value: "Heart", Icon: Heart, label: "Сердце" },
];

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function dateInputValue(d: Date | undefined): string {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatRussianDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function isEditableStatus(status: ChallengeStatus): boolean {
  return status === "active" || status === "archived";
}

export function EditChallengeForm({ challenge }: { challenge: Challenge }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(updateChallengeSchema) as unknown as Resolver<FormValues>,
    mode: "onTouched",
    defaultValues: {
      description: challenge.description ?? "",
      endDate: challenge.endDate,
      color: challenge.color ?? undefined,
      icon: challenge.icon ?? undefined,
      status: challenge.status,
    },
  });

  async function onSubmit(values: FormValues) {
    if (values.endDate.getTime() < challenge.startDate.getTime()) {
      form.setError("endDate", {
        type: "manual",
        message: "Дата окончания не может быть раньше начала",
      });
      return;
    }

    setPending(true);

    const description = values.description?.trim();
    const payload: UpdateChallengeInput = {
      description: description ? description : undefined,
      endDate: values.endDate,
      color: values.color ? values.color : undefined,
      icon: values.icon ? values.icon : undefined,
      status: values.status,
    };

    const result = await updateChallengeAction(challenge.id, payload);
    if (result.success) {
      toast.success("Челлендж обновлён");
      router.push(`/challenges/${result.data.id}`);
      router.refresh();
      return;
    }

    setPending(false);
    toast.error(result.error || "Не удалось обновить челлендж");
  }

  async function onConfirmDelete() {
    setDeleting(true);
    const result = await deleteChallengeAction(challenge.id);
    if (result.success) {
      toast.success("Челлендж удалён");
      setConfirmOpen(false);
      router.push("/challenges");
      router.refresh();
      return;
    }
    setDeleting(false);
    toast.error(result.error || "Не удалось удалить челлендж");
  }

  const statusEditable = isEditableStatus(challenge.status);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Параметры челленджа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReadonlyRow label="Название" value={challenge.title} />
            <ReadonlyRow label="Тип" value={TYPE_LABEL[challenge.type]} />
            <ReadonlyRow label="Метрика" value={METRIC_LABEL[challenge.metric]} />
            <ReadonlyRow
              label="Цель"
              value={`${formatNumber(challenge.targetValue)} ${challenge.unit}`}
            />
            <ReadonlyRow label="Дата начала" value={formatRussianDate(challenge.startDate)} />
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                Сложность
              </p>
              <Badge className={DIFFICULTY_CLASSNAME[challenge.difficulty]}>
                {DIFFICULTY_LABEL[challenge.difficulty]}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Эти поля заданы при создании и не могут быть изменены.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Что можно изменить</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <textarea
                      rows={3}
                      placeholder="Зачем это нужно, на что ориентироваться (опционально)"
                      className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>До 500 символов.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="endDate"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Дата окончания</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={dateInputValue(field.value as Date | undefined)}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? undefined : new Date(`${v}T00:00:00`));
                      }}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      name={field.name}
                    />
                  </FormControl>
                  <FormDescription>
                    Не раньше {formatRussianDate(challenge.startDate)}.
                  </FormDescription>
                  {fieldState.error ? <FormMessage>{fieldState.error.message}</FormMessage> : null}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Цвет</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => field.onChange(undefined)}
                        aria-label="Без цвета"
                        aria-pressed={!field.value}
                        className={cn(
                          "border-input flex size-8 items-center justify-center rounded-full border bg-transparent text-xs",
                          !field.value && "ring-ring ring-2 ring-offset-2",
                        )}
                      >
                        ✕
                      </button>
                      {COLOR_PRESETS.map((c) => {
                        const active = field.value === c.value;
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => field.onChange(c.value)}
                            aria-label={c.label}
                            aria-pressed={active}
                            className={cn(
                              "flex size-8 items-center justify-center rounded-full transition-shadow",
                              active && "ring-foreground ring-2 ring-offset-2",
                            )}
                            style={{ backgroundColor: c.value }}
                          >
                            {active ? <Check className="size-4 text-white" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Иконка</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => field.onChange(undefined)}
                        aria-label="Без иконки"
                        aria-pressed={!field.value}
                        className={cn(
                          "border-input flex size-9 items-center justify-center rounded-md border text-xs",
                          !field.value && "ring-ring ring-2 ring-offset-2",
                        )}
                      >
                        ✕
                      </button>
                      {ICON_PRESETS.map(({ value, Icon, label }) => {
                        const active = field.value === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            aria-label={label}
                            aria-pressed={active}
                            className={cn(
                              "border-input flex size-9 items-center justify-center rounded-md border transition-colors",
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "hover:bg-accent",
                            )}
                          >
                            <Icon className="size-4" />
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Статус</FormLabel>
                  <FormControl>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {STATUS_OPTIONS.map((opt) => {
                        const active = field.value === opt.value;
                        const disabled = !statusEditable && opt.value !== challenge.status;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={disabled}
                            onClick={() => field.onChange(opt.value)}
                            className={cn(
                              "flex flex-col gap-1 rounded-md border p-3 text-left text-sm transition-colors",
                              active
                                ? "border-primary bg-primary/5"
                                : "border-input hover:bg-accent",
                              disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                            )}
                            aria-pressed={active}
                          >
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-muted-foreground text-xs">{opt.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  {!statusEditable ? (
                    <FormDescription>
                      Челлендж в финальном состоянии — статус нельзя сменить из формы.
                    </FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={pending || deleting}
          >
            Удалить челлендж
          </Button>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/challenges/${challenge.id}`)}
              disabled={pending || deleting}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={pending || deleting}>
              {pending ? "Сохраняем..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </form>

      <Dialog open={confirmOpen} onOpenChange={(o) => (deleting ? null : setConfirmOpen(o))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить челлендж?</DialogTitle>
            <DialogDescription>
              «{challenge.title}» будет удалён без возможности восстановить. Связанные активности
              останутся.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Удаляем..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}

function ReadonlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
