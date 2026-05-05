"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  active: React.ReactNode;
  archive: React.ReactNode;
  activeCount: number;
  archiveCount: number;
}

export function ChallengesTabs({ active, archive, activeCount, archiveCount }: Props) {
  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
        <TabsTrigger value="active">Активные ({activeCount})</TabsTrigger>
        <TabsTrigger value="archive">Архив ({archiveCount})</TabsTrigger>
      </TabsList>
      <TabsContent value="active" className="mt-4">
        {active}
      </TabsContent>
      <TabsContent value="archive" className="mt-4">
        {archive}
      </TabsContent>
    </Tabs>
  );
}
