"use client";

// SimuPro Admin · Scenarios — restyled to Mission Board visual language.
// Functionality preserved 1:1: useCollection<Scenario>, seed via
// commitBatchUpsertNonBlocking, create+edit dialog with ScenarioForm,
// delete via deleteDocumentNonBlocking, scenarioToDbUpsert mapping,
// crypto.randomUUID for new ids, isLegacyScenarioId badge.

import * as React from "react";
import { useState } from "react";
import { useCollection, useSupabase, useMemoSupabase } from "@/supabase";
import type { Scenario } from "@/lib/types";
import { scenarioToDbUpsert } from "@/lib/db-mappers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { isLegacyScenarioId, seedScenarios } from "@/lib/scenarios-data";
import { ScenarioForm } from "@/components/scenario-form";
import {
  commitBatchUpsertNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from "@/supabase/non-blocking-updates";
import { Panel, DiffPill } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";

export default function AdminScenariosPage() {
  const client = useSupabase();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<Scenario | null>(null);

  const scenariosSpec = useMemoSupabase(
    () => (client ? { table: "scenarios" as const } : null),
    [client],
  );
  const { data: scenarios, isLoading } = useCollection<Scenario>(scenariosSpec);

  const handleSeedScenarios = async () => {
    if (!client) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Database client not available",
      });
      return;
    }
    const rows = seedScenarios.map(
      (s) => scenarioToDbUpsert(s) as unknown as Record<string, unknown>,
    );
    commitBatchUpsertNonBlocking(client, "scenarios", rows);
    toast({
      title: "Success!",
      description: `${seedScenarios.length} scenarios are being added to the database.`,
    });
  };

  const handleFormSubmit = async (
    values: Omit<Scenario, "id">,
    id?: string,
  ) => {
    if (!client) return;
    const dataToSave = { ...values };
    if (dataToSave.category === undefined) {
      delete (dataToSave as Partial<typeof dataToSave>).category;
    }
    if (id) {
      const fullScenario = {
        ...selectedScenario,
        ...dataToSave,
        id,
        status: dataToSave.status ?? selectedScenario?.status ?? "draft",
      } as Scenario;
      const dbRow = scenarioToDbUpsert(fullScenario);
      const { id: _drop, ...patch } = dbRow as Record<string, unknown>;
      updateDocumentNonBlocking(client, "scenarios", id, patch);
      toast({
        title: "Scenario updated",
        description: `"${values.title}" has been updated.`,
      });
      setDialogOpen(false);
      setSelectedScenario(null);
    } else {
      const newId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newScenarioData = {
        ...dataToSave,
        id: newId,
        status: "draft" as const,
      } as Scenario;
      try {
        const { error } = await client
          .from("scenarios")
          .insert(scenarioToDbUpsert(newScenarioData));
        if (error) throw error;
        toast({
          title: "Scenario created",
          description: `"${values.title}" has been added as a draft.`,
        });
        setDialogOpen(false);
        setSelectedScenario(null);
      } catch (error) {
        console.error("Error creating scenario:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create scenario.",
        });
      }
    }
  };

  const openEditDialog = (s: Scenario) => {
    setSelectedScenario(s);
    setDialogOpen(true);
  };
  const openCreateDialog = () => {
    setSelectedScenario(null);
    setDialogOpen(true);
  };
  const openDeleteDialog = (s: Scenario) => {
    setScenarioToDelete(s);
    setDeleteAlertOpen(true);
  };
  const handleDeleteScenario = async () => {
    if (!client || !scenarioToDelete) return;
    deleteDocumentNonBlocking(client, "scenarios", scenarioToDelete.id);
    toast({ title: "Scenario deleted" });
    setDeleteAlertOpen(false);
    setScenarioToDelete(null);
  };

  return (
    <div className="p-7 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5">
            // ADMIN · SCENARIOS · {scenarios?.length ?? "—"} TOTAL
          </div>
          <h1 className="font-display font-bold text-[30px] text-white leading-none">
            Manage scenarios
          </h1>
          <p className="text-[13px] text-[var(--text-mute)] mt-2">
            Create, edit, and delete simulation scenarios.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSeedScenarios()}
            className="cta-secondary h-9 px-3 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5"
          >
            <Icons.Refresh className="w-3.5 h-3.5" /> Seed
          </button>
          <button
            type="button"
            onClick={openCreateDialog}
            className="cta-primary h-9 px-3 rounded-md text-[13px] font-semibold inline-flex items-center gap-1.5"
          >
            <Icons.Plus className="w-3.5 h-3.5" /> New scenario
          </button>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(isOpen) => {
          setDialogOpen(isOpen);
          if (!isOpen) setSelectedScenario(null);
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedScenario ? "Edit" : "Create"} scenario
            </DialogTitle>
            <DialogDescription>
              {selectedScenario
                ? "Update the details of this scenario."
                : "Fill out the form to create a new scenario."}
            </DialogDescription>
          </DialogHeader>
          <ScenarioForm
            onSubmit={handleFormSubmit}
            defaultValues={selectedScenario}
            onCancel={() => {
              setDialogOpen(false);
              setSelectedScenario(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Panel title="Scenario list" sub="All scenarios in the system, draft and published">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--text-dim)] font-mono">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">Title</th>
                <th className="text-left font-medium px-2 py-2.5">Status</th>
                <th className="text-left font-medium px-2 py-2.5">Difficulty</th>
                <th className="text-left font-medium px-2 py-2.5">Premium</th>
                <th className="text-left font-medium px-2 py-2.5">Tags</th>
                <th className="text-right font-medium px-5 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="h-20 text-center text-[var(--text-mute)]">
                    Loading…
                  </td>
                </tr>
              )}
              {scenarios?.map((s) => (
                <tr key={s.id} className="border-t hair">
                  <td className="px-5 py-3 font-medium text-white">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {s.title}
                      {isLegacyScenarioId(s.id) && (
                        <span className="tag">Legacy</span>
                      )}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className={`tag capitalize ${
                        s.status === "published" ? "tag-emerald" : "tag-amber"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    {s.difficulty && <DiffPill level={s.difficulty as never} />}
                  </td>
                  <td className="px-2 py-3">
                    {s.isPremium ? (
                      <span className="tag tag-amber">
                        <Icons.Crown className="w-3 h-3" /> Premium
                      </span>
                    ) : (
                      <span className="tag">Standard</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-[var(--text-mute)] truncate max-w-[200px]">
                    {s.tags.join(", ")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="cta-ghost w-8 h-8 rounded-md inline-flex items-center justify-center"
                          aria-haspopup="true"
                        >
                          <span className="text-[var(--text-mute)]">⋯</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openEditDialog(s)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(s)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {!isLoading && scenarios?.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="h-24 text-center text-[var(--text-mute)]"
                  >
                    No scenarios found. Try seeding some.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the scenario{" "}
              <span className="font-bold">
                &quot;{scenarioToDelete?.title}&quot;
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteScenario()}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
