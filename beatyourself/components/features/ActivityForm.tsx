"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActivityType } from "@prisma/client";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { createActivityAction } from "@/actions/activities";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createActivitySchema, type CreateActivityInput } from "@/lib/validation/activity";
import { cn } from "@/lib/utils";

type FormValues = CreateActivityInput;

const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "run", label: "Бег" },
  { value: "walk", label: "Ходьба" },
  { value: "other", label: "Другое" },
];

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateInputValue(d: Date | undefined): string {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatPace(
  distanceKm: number | undefined,
  durationMin: number | undefined,
): string | null {
  if (!distanceKm || distanceKm <= 0) return null;
  if (!durationMin || durationMin <= 0) return null;
  const paceMin = durationMin / distanceKm;
  if (!Number.isFinite(paceMin)) return null;
  const totalSeconds = Math.round(paceMin * 60);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${String(ss).padStart(2, "0")} мин/км`;
}

const DESKTOP_BREAKPOINT = "(min-width: 1024px)";

interface ActivityFormProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function ActivityForm({ trigger, onSuccess }: ActivityFormProps) {
  const [open, setOpen] = React.useState(false);
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia(DESKTOP_BREAKPOINT);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const handleSuccess = React.useCallback(() => {
    setOpen(false);
    onSuccess?.();
  }, [onSuccess]);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новая активность</DialogTitle>
            <DialogDescription>Запиши тренировку, прогулку или любую активность.</DialogDescription>
          </DialogHeader>
          <ActivityFormFields onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Новая активность</SheetTitle>
          <SheetDescription>Запиши тренировку, прогулку или любую активность.</SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <ActivityFormFields onSuccess={handleSuccess} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface ActivityFormFieldsProps {
  onSuccess: () => void;
}

function defaultFormValues(): FormValues {
  return {
    activityType: "run",
    distanceKm: undefined,
    durationMin: undefined,
    steps: undefined,
    activityDate: todayDate(),
    note: undefined,
  };
}

export function ActivityFormFields({ onSuccess }: ActivityFormFieldsProps) {
  const [pending, setPending] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(createActivitySchema) as unknown as Resolver<FormValues>,
    mode: "onTouched",
    defaultValues: defaultFormValues(),
  });

  const watchedDistance = form.watch("distanceKm");
  const watchedDuration = form.watch("durationMin");
  const pace = formatPace(watchedDistance, watchedDuration);

  async function onSubmit(values: FormValues) {
    setPending(true);
    const payload = {
      ...values,
      note: values.note?.trim() ? values.note.trim() : undefined,
    };
    const result = await createActivityAction(payload);
    if (result.success) {
      toast.success("Активность добавлена");
      form.reset(defaultFormValues());
      setPending(false);
      onSuccess();
      return;
    }
    setPending(false);
    toast.error(result.error || "Не удалось добавить активность");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="activityType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Тип активности</FormLabel>
              <FormControl>
                <div className="grid grid-cols-3 gap-2">
                  {ACTIVITY_TYPE_OPTIONS.map((opt) => {
                    const active = field.value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          "rounded-md border p-2 text-sm font-medium transition-colors",
                          active
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-input hover:bg-accent",
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

        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={form.control}
            name="distanceKm"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Дистанция (км)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={0}
                    placeholder="5"
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
                {fieldState.error ? <FormMessage>{fieldState.error.message}</FormMessage> : null}
              </FormItem>
            )}
          />
          <Controller
            control={form.control}
            name="durationMin"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Длительность (мин)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min={0}
                    placeholder="30"
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
                {fieldState.error ? <FormMessage>{fieldState.error.message}</FormMessage> : null}
              </FormItem>
            )}
          />
        </div>

        {pace ? (
          <p className="text-muted-foreground text-xs" aria-live="polite">
            Темп: <span className="text-foreground font-medium">{pace}</span>
          </p>
        ) : null}

        <Controller
          control={form.control}
          name="steps"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Шаги</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min={0}
                  placeholder="10000"
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
              {fieldState.error ? <FormMessage>{fieldState.error.message}</FormMessage> : null}
            </FormItem>
          )}
        />

        <Controller
          control={form.control}
          name="activityDate"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Дата</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={dateInputValue(field.value as Date | undefined)}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? todayDate() : new Date(`${v}T00:00:00`));
                  }}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  name={field.name}
                />
              </FormControl>
              {fieldState.error ? <FormMessage>{fieldState.error.message}</FormMessage> : null}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Заметка</FormLabel>
              <FormControl>
                <textarea
                  rows={2}
                  placeholder="Как прошло (опционально)"
                  className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>До 500 символов.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Сохраняем..." : "Сохранить"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
