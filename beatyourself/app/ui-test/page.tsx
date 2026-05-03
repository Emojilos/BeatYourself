"use client";

import { Activity, Settings, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UiTestPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
      <Toaster />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          UI primitives — TASK-002 visual verification
        </h1>
        <p className="text-muted-foreground text-sm">
          Warm gray background, terracotta accent, Inter sans, soft borders.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>variants & sizes</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="settings">
            <Settings />
          </Button>
          <Button disabled>Disabled</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form primitives</CardTitle>
          <CardDescription>Label + Input</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-test">Email</Label>
            <Input id="email-test" type="email" placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="disabled-test">Disabled</Label>
            <Input id="disabled-test" placeholder="Не редактируется" disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Badges & Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
          <Progress value={42} />
          <Progress value={88} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabs</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Активные</TabsTrigger>
              <TabsTrigger value="archive">Архив</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              <p className="text-muted-foreground text-sm">Активные челленджи будут здесь.</p>
            </TabsContent>
            <TabsContent value="archive">
              <p className="text-muted-foreground text-sm">Архив будет здесь.</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overlays</CardTitle>
          <CardDescription>Dialog, Sheet, Dropdown menu, Toast</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Открыть Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Заголовок диалога</DialogTitle>
                <DialogDescription>Описание диалога — короткий текст.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button>OK</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Открыть Sheet (mobile bottom)</Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Bottom sheet</SheetTitle>
                <SheetDescription>Открывается снизу — паттерн для мобильных форм.</SheetDescription>
              </SheetHeader>
              <SheetFooter>
                <Button>Сохранить</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <UserIcon /> Меню
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Аккаунт</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Activity /> Активность
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings /> Настройки
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="secondary" onClick={() => toast.success("Активность добавлена")}>
            Показать toast
          </Button>
        </CardContent>
        <CardFooter className="text-muted-foreground text-xs">
          Все компоненты — TASK-002.
        </CardFooter>
      </Card>
    </div>
  );
}
