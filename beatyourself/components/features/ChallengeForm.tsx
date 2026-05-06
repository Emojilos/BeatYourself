"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChallengeType, Difficulty, Metric } from "@prisma/client";
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

import { createChallengeAction } from "@/actions/challenges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { createChallengeSchema, type CreateChallengeInput } from "@/lib/validation/challenge";
import { cn } from "@/lib/utils";

type FormValues = CreateChallengeInput;

const TYPE_OPTIONS: { value: ChallengeType; label: string; description: string }[] = [
  {
    value: "cumulative",
    label: "Накопительный",
    description: "Суммировать прогресс за весь период",
  },
  {
    value: "single_day",
    label: "За один день",
    description: "Достичь цели в любой один день периода",
  },
];

const METRIC_OPTIONS: { value: Metric; label: string; defaultUnit: string }[] = [
  { value: "distance_km", label: "Дистанция", defaultUnit: "км" },
  { value: "steps", label: "Шаги", defaultUnit: "шагов" },
  { value: "duration_min", label: "Длительность", defaultUnit: "мин" },
  { value: "runs_count", label: "Число пробежек", defaultUnit: "пробежек" },
  { value: "custom", label: "Своя метрика", defaultUnit: "" },
];

const DIFFICULTY_OPTIONS: {
  value: Difficulty;
  label: string;
  swatch: string;
  selected: string;
}[] = [
  {
    value: "easy",
    label: "Легко",
    swatch: "bg-green-100 text-green-900",
    selected: "ring-green-600",
  },
  {
    value: "medium",
    label: "Средне",
    swatch: "bg-amber-100 text-amber-900",
    selected: "ring-amber-600",
  },
  {
    value: "hard",
    label: "Сложно",
    swatch: "bg-red-100 text-red-900",
    selected: "ring-red-600",
  },
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

const ICON_BY_VALUE: Record<string, LucideIcon> = Object.fromEntries(
  ICON_PRESETS.map(({ value, Icon }) => [value, Icon]),
);

const DEFAULT_METRIC: Metric = "distance_km";
function defaultUnitFor(metric: Metric): string {
  return METRIC_OPTIONS.find((m) => m.value === metric)?.defaultUnit ?? "";
}

function todayPlusDays(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function dateInputValue(d: Date | undefined): string {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function pluralizeDays(n: number): string {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 14) return "дней";
  const last = n % 10;
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дня";
  return "дней";
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function ChallengeForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [unitTouched, setUnitTouched] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(createChallengeSchema) as unknown as Resolver<FormValues>,
    mode: "onTouched",
    defaultValues: {
      title: "",
      description: undefined,
      type: "cumulative",
      metric: DEFAULT_METRIC,
      targetValue: undefined as unknown as number,
      unit: defaultUnitFor(DEFAULT_METRIC),
      difficulty: "medium",
      startDate: todayPlusDays(0),
      endDate: todayPlusDays(30),
      color: undefined,
      icon: undefined,
    },
  });

  const watchedMetric = form.watch("metric");
  const watchedStartDate = form.watch("startDate");

  React.useEffect(() => {
    if (unitTouched) return;
    const next = defaultUnitFor(watchedMetric);
    form.setValue("unit", next, { shouldValidate: false });
  }, [watchedMetric, unitTouched, form]);

  React.useEffect(() => {
    if (form.formState.touchedFields.endDate) {
      void form.trigger("endDate");
    }
  }, [watchedStartDate, form]);

  async function onSubmit(values: FormValues) {
    setPending(true);
    const payload = {
      ...values,
      description: values.description?.trim() ? values.description.trim() : undefined,
      color: values.color ? values.color : undefined,
      icon: values.icon ? values.icon : undefined,
    };
    const result = await createChallengeAction(payload);
    if (result.success) {
      toast.success("Челлендж создан");
      router.push(`/challenges/${result.data.id}`);
      router.refresh();
      return;
    }
    setPending(false);
    toast.error(result.error || "Не удалось создать челлендж");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Основное</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Например, Пробежать 100 км за месяц"
                        autoComplete="off"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Тип и метрика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип челленджа</FormLabel>
                    <FormControl>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {TYPE_OPTIONS.map((opt) => {
                          const active = field.value === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(opt.value)}
                              className={cn(
                                "flex flex-col gap-1 rounded-md border p-3 text-left text-sm transition-colors",
                                active
                                  ? "border-primary bg-primary/5"
                                  : "border-input hover:bg-accent",
                              )}
                              aria-pressed={active}
                            >
                              <span className="font-medium">{opt.label}</span>
                              <span className="text-muted-foreground text-xs">
                                {opt.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="metric"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Метрика</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="border-input focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
                        >
                          {METRIC_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Единица измерения</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="км, шагов, мин..."
                          autoComplete="off"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            setUnitTouched(true);
                            field.onChange(e);
                          }}
                        />
                      </FormControl>
                      <FormDescription>Подставится автоматически по метрике.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="targetValue"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Целевое значение</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min={0}
                        placeholder="100"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === "" ? undefined : Number(v));
                        }}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        name={field.name}
                      />
                    </FormControl>
                    {fieldState.error ? (
                      <FormMessage>{fieldState.error.message}</FormMessage>
                    ) : null}
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Сроки и сложность</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сложность</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {DIFFICULTY_OPTIONS.map((opt) => {
                          const active = field.value === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(opt.value)}
                              className={cn(
                                "rounded-md px-3 py-1.5 text-sm font-medium transition-shadow",
                                opt.swatch,
                                active && `ring-2 ring-offset-2 ${opt.selected}`,
                              )}
                              aria-pressed={active}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="startDate"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Дата начала</FormLabel>
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
                      {fieldState.error ? (
                        <FormMessage>{fieldState.error.message}</FormMessage>
                      ) : null}
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
                      {fieldState.error ? (
                        <FormMessage>{fieldState.error.message}</FormMessage>
                      ) : null}
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Внешний вид</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
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
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/challenges")}
              disabled={pending}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Сохраняем..." : "Создать"}
            </Button>
          </div>
        </div>

        <PreviewColumn form={form} />
      </form>
    </Form>
  );
}

function PreviewColumn({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  const values = form.watch();
  return (
    <aside className="space-y-3 lg:sticky lg:top-6 lg:col-span-1 lg:self-start">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Превью</p>
      <PreviewCard values={values} />
    </aside>
  );
}

function PreviewCard({ values }: { values: FormValues }) {
  const target = Number.isFinite(values.targetValue) ? Number(values.targetValue) : 0;
  const Icon = values.icon ? ICON_BY_VALUE[values.icon] : undefined;
  const difficultyLabel = DIFFICULTY_OPTIONS.find((d) => d.value === values.difficulty)?.label;
  const difficultyClass = DIFFICULTY_OPTIONS.find((d) => d.value === values.difficulty)?.swatch;

  let deadline = "";
  if (values.startDate && values.endDate) {
    const ms = values.endDate.getTime() - values.startDate.getTime();
    if (ms < 0) {
      deadline = "Дата окончания раньше начала";
    } else {
      const days = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
      deadline = `Период ${days} ${pluralizeDays(days)}`;
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {Icon ? (
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: values.color || "#C96442" }}
              >
                <Icon className="size-4" />
              </span>
            ) : values.color ? (
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: values.color }}
                aria-hidden
              />
            ) : null}
            <CardTitle className="truncate text-base leading-tight">
              {values.title.trim() ? values.title : "Название челленджа"}
            </CardTitle>
          </div>
          {difficultyLabel ? (
            <Badge className={cn(difficultyClass, "hover:bg-current/0")}>{difficultyLabel}</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium tabular-nums">
            0 из {formatNumber(target)} {values.unit || "—"}
          </span>
          <span className="text-muted-foreground tabular-nums">0%</span>
        </div>
        <Progress value={0} aria-label="Прогресс 0 процентов" />
        <p className="text-muted-foreground text-xs">{deadline || "Период не указан"}</p>
        {values.description?.trim() ? (
          <p className="text-muted-foreground line-clamp-3 text-xs">{values.description.trim()}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
