"use client"

import { useState } from "react";
import { useCollection, useSupabase, useMemoSupabase } from "@/supabase";
import type { LegacySupabaseIntervention } from "@/lib/types";
import { interventionToDbInsert } from "@/lib/db-mappers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { seedInterventions } from "@/lib/interventions-data";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { InterventionForm } from "@/components/intervention-form";
import { commitBatchUpsertNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/supabase/non-blocking-updates";


export default function AdminInterventionsPage() {
    const client = useSupabase();
    const { toast } = useToast();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedIntervention, setSelectedIntervention] = useState<LegacySupabaseIntervention | null>(null);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [interventionToDelete, setInterventionToDelete] = useState<LegacySupabaseIntervention | null>(null);

    const interventionsSpec = useMemoSupabase(
        () => (client ? { table: 'interventions' as const } : null),
        [client]
    );
    const { data: interventions, isLoading, error } = useCollection<LegacySupabaseIntervention>(interventionsSpec);

    const handleSeedInterventions = async () => {
        if (!client) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Database client not available'
            });
            return;
        }

        const rows = seedInterventions.map((i) => interventionToDbInsert(i) as unknown as Record<string, unknown>);
        commitBatchUpsertNonBlocking(client, 'interventions', rows);

        toast({
            title: 'Success!',
            description: `${seedInterventions.length} interventions are being seeded to the database.`
        });
    };

    const handleFormSubmit = async (values: Omit<LegacySupabaseIntervention, 'id'>) => {
        if (!client) return;

        if (selectedIntervention) {
            const row = interventionToDbInsert({
              ...values,
              id: selectedIntervention.id,
            }) as Record<string, unknown>;
            const { id: _id, ...patch } = row;
            updateDocumentNonBlocking(client, 'interventions', selectedIntervention.id, patch);
            toast({ title: 'Intervention Updated', description: `${values.name} has been updated.` });
        } else {
            const newId =
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const { error } = await client.from('interventions').insert(
              interventionToDbInsert({ ...values, id: newId })
            );
            if (error) {
               toast({ variant: 'destructive', title: 'Error', description: error.message });
            } else {
               toast({ title: 'Intervention Created', description: `${values.name} has been added.` });
            }
        }
        setDialogOpen(false);
        setSelectedIntervention(null);
    };

    const openEditDialog = (intervention: LegacySupabaseIntervention) => {
        setSelectedIntervention(intervention);
        setDialogOpen(true);
    };

    const openCreateDialog = () => {
        setSelectedIntervention(null);
        setDialogOpen(true);
    };

    const openDeleteDialog = (intervention: LegacySupabaseIntervention) => {
        setInterventionToDelete(intervention);
        setDeleteAlertOpen(true);
    };

    const handleDeleteIntervention = async () => {
        if (!client || !interventionToDelete) return;

        deleteDocumentNonBlocking(client, "interventions", interventionToDelete.id);

        toast({ title: "Intervention deleted" });
        setDeleteAlertOpen(false);
        setInterventionToDelete(null);
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Interventions</h1>
                    <p className="text-muted-foreground">
                        Create, edit, and delete medical interventions.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleSeedInterventions} variant="outline">
                        <UploadCloud className="mr-2" /> Seed Interventions
                    </Button>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openCreateDialog}>
                                <PlusCircle className="mr-2" /> Create Intervention
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
                             <DialogHeader>
                                <DialogTitle>{selectedIntervention ? 'Edit' : 'Create'} Intervention</DialogTitle>
                                <DialogDescription>
                                    {selectedIntervention ? 'Update the details of the intervention.' : 'Fill out the form to add a new intervention.'}
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

             <Card>
                <CardHeader>
                    <CardTitle>Intervention List</CardTitle>
                    <CardDescription>A list of all interventions available in simulations.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Certification Level</TableHead>
                            <TableHead>Description</TableHead>
                             <TableHead>
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>}
                            {error && <TableRow><TableCell colSpan={4} className="text-destructive">Error: {error.message}</TableCell></TableRow>}
                            {!isLoading && interventions?.map(i => (
                                <TableRow key={i.id}>
                                    <TableCell className="font-medium">{i.name}</TableCell>
                                    <TableCell><Badge variant="secondary" className="capitalize">{i.certificationLevel}</Badge></TableCell>
                                    <TableCell className="truncate max-w-sm">{i.description}</TableCell>
                                    <TableCell>
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => openEditDialog(i)}>Edit</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => openDeleteDialog(i)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && interventions?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No interventions found. Try seeding them.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the intervention
                            <span className="font-bold"> {interventionToDelete?.name}</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void handleDeleteIntervention()} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
