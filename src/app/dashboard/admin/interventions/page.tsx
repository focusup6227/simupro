"use client";

// SimuPro Admin · Interventions — restyled to Mission Board visual language.
// Functionality preserved 1:1: useCollection<LegacySupabaseIntervention>,
// seed via commitBatchUpsertNonBlocking, create+edit dialog with
// InterventionForm, delete via deleteDocumentNonBlocking,
// interventionToDbInsert mapping, crypto.randomUUID for new ids.

import * as React from "react";
import { useState } from "react";
import { useCollection, useSupabase, useMemoSupabase } from "@/supabase";
import type { LegacySupabaseIntervention } from "@/lib/types";
import { interventionToDbInsert } from "@/lib/db-mappers";
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
import { useToast } from "@/hooks/use-toast";
import { seedInterventions } from "@/lib/interventions-data";
import { InterventionForm } from "@/components/intervention-form";
import {
  commitBatchUpsertNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from "@/supabase/non-blocking-updates";
import { Panel } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";

export default function AdminInterventionsPage() {
  const client = useSupabase();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntervention, setSelectedIntervention] =
    useState<LegacySupabaseIntervention | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [interventionToDelete, setInterventionToDelete] =
    useState<LegacySupabaseIntervention | null>(null);

  const interventionsSpec = useMemoSupabase(
    () => (client ? { table: "interventions" as const } : null),
    [client],
  );
  const { data: interventions, isLoading, error } =
    useCollection<LegacySupabaseIntervention>(interventionsSpec);

  const handleSeedInterventions = async () => {
    if (!client) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Database client not available",
      });
      return;
    }
    const rows = seedInterventions.map(
      (i) => interventionToDbInsert(i) as unknown as Record<string, unknown>,
    );
    commitBatchUpsertNonBlocking(client, "interventions", rows);
    toast({
      title: "Success!",
      description: `${seedInterventions.length} interventions are being seeded to the database.`,
    });
  };

  const handleFormSubmit = async (
    values: Omit<LegacySupabaseIntervention, "id">,
  ) => {
    if (!client) return;
    if (selectedIntervention) {
      const row = interventionToDbInsert({
        ...values,
        id: selectedIntervention.id,
      }) as Record<string, unknown>;
      const { id: _id, ...patch } = row;
      updateDocumentNonBlocking(
        client,
        "interventions",
        selectedIntervention.id,
        patch,
      );
      toast({
        title: "Intervention updated",
        description: `${values.name} has been updated.`,
      });
    } else {
      const newId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { error } = await client
        .from("interventions")
        .insert(interventionToDbInsert({ ...values, id: newId }));
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        toast({
          title: "Intervention created",
          description: `${values.name} has been added.`,
        });
      }
    }
    setDialogOpen(false);
    setSelectedIntervention(null);
  };

  const openEditDialog = (i: LegacySupabaseIntervention) => {
    setSelectedIntervention(i);
    setDialogOpen(true);
  };
  const openCreateDialog = () => {
    setSelectedIntervention(null);
    setDialogOpen(true);
  };
  const openDeleteDialog = (i: LegacySupabaseIntervention) => {
    setInterventionToDelete(i);
    setDeleteAlertOpen(true);
  };
  const handleDeleteIntervention = async () => {
    if (!client || !interventionToDelete) return;
    deleteDocumentNonBlocking(
      client,
      "interventions",
      interventionToDelete.id,
    );
    toast({ title: "Intervention deleted" });
    setDeleteAlertOpen(false);
    setInterventionToDelete(null);
  };

  return (
    <div className="p-7 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5">
            // ADMIN · INTERVENTIONS · {interventions?.length ?? "—"} TOTAL
          </div>
          <h1 className="font-display font-bold text-[30px] text-white leading-none">
            Manage interventions
          </h1>
          <p className="text-[13px] text-[var(--text-mute)] mt-2">
            Create, edit, and delete medical interventions.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSeedInterventions()}
            className="cta-secondary h-9 px-3 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5"
          >
            <Icons.Refresh className="w-3.5 h-3.5" /> Seed
          </button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                onClick={openCreateDialog}
                className="cta-primary h-9 px-3 rounded-md text-[13px] font-semibold inline-flex items-center gap-1.5"
              >
                <Icons.Plus className="w-3.5 h-3.5" /> New intervention
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedIntervention ? "Edit" : "Create"} intervention
                </DialogTitle>
                <DialogDescription>
                  {selectedIntervention
                    ? "Update the details of the intervention."
                    : "Fill out the form to add a new intervention."}
                </DialogDescription>
              </DialogHeader>
              <InterventionForm
                onSubmit={handleFormSubmit}
                defaultValues={selectedIntervention}
                onCancel={() => {
                  setDialogOpen(false);
                  setSelectedIntervention(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Panel
        title="Intervention list"
        sub="All interventions available in simulations"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--text-dim)] font-mono">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">Name</th>
                <th className="text-left font-medium px-2 py-2.5">Cert level</th>
                <th className="text-left font-medium px-2 py-2.5">Description</th>
                <th className="text-right font-medium px-5 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="h-20 text-center text-[var(--text-mute)]">
                    Loading…
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td
                    colSpan={4}
                    className="h-20 text-center text-[var(--danger)] font-mono text-[11px]"
                  >
                    Error: {error.message}
                  </td>
                </tr>
              )}
              {!isLoading &&
                interventions?.map((i) => (
                  <tr key={i.id} className="border-t hair">
                    <td className="px-5 py-3 font-medium text-white">{i.name}</td>
                    <td className="px-2 py-3">
                      <span className="tag capitalize">
                        {i.certificationLevel}
                      </span>
                    </td>
                    <td className="px-2 py-3 truncate max-w-md text-[var(--text-mute)]">
                      {i.description}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="cta-ghost w-8 h-8 rounded-md inline-flex items-center justify-center"
                          >
                            <span className="text-[var(--text-mute)]">⋯</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditDialog(i)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(i)}
                            className="text-destructive focus:text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              {!isLoading && interventions?.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="h-24 text-center text-[var(--text-mute)]"
                  >
                    No interventions found. Try seeding them.
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
              This action cannot be undone. This will permanently delete the intervention{" "}
              <span className="font-bold">{interventionToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteIntervention()}
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
