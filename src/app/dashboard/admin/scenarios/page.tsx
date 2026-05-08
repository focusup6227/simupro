"use client"

import { useState } from "react";
import { useCollection, useSupabase, useMemoSupabase } from "@/supabase";
import type { Scenario } from "@/lib/types";
import { scenarioToDbUpsert } from "@/lib/db-mappers";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast";
import { seedScenarios } from "@/lib/scenarios-data";
import { ScenarioForm } from "@/components/scenario-form";
import { Badge } from "@/components/ui/badge";
import { commitBatchUpsertNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/supabase/non-blocking-updates";

export default function AdminScenariosPage() {
    const client = useSupabase();
    const { toast } = useToast();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [scenarioToDelete, setScenarioToDelete] = useState<Scenario | null>(null);

    const scenariosSpec = useMemoSupabase(
        () => (client ? { table: 'scenarios' as const } : null),
        [client]
    );
    const { data: scenarios, isLoading } = useCollection<Scenario>(scenariosSpec);

    const handleSeedScenarios = async () => {
        if (!client) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Database client not available'
            });
            return;
        }

        const rows = seedScenarios.map((s) => scenarioToDbUpsert(s) as unknown as Record<string, unknown>);
        commitBatchUpsertNonBlocking(client, 'scenarios', rows);

        toast({
            title: 'Success!',
            description: `${seedScenarios.length} scenarios are being added to the database.`
        });
    };

    const handleFormSubmit = async (values: Omit<Scenario, 'id'>, id?: string) => {
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
              status: dataToSave.status ?? selectedScenario?.status ?? 'draft',
            } as Scenario;
            const dbRow = scenarioToDbUpsert(fullScenario);
            const { id: _drop, ...patch } = dbRow as Record<string, unknown>;
            updateDocumentNonBlocking(client, 'scenarios', id, patch as Record<string, unknown>);
            toast({ title: 'Scenario Updated', description: `"${values.title}" has been updated.` });
            setDialogOpen(false);
            setSelectedScenario(null);
        } else {
            const newId =
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

            const newScenarioData = {
              ...dataToSave,
              id: newId,
              status: 'draft' as const,
            } as Scenario;

            try {
                const { error } = await client.from('scenarios').insert(scenarioToDbUpsert(newScenarioData));
                if (error) throw error;
                toast({ title: 'Scenario Created', description: `"${values.title}" has been added as a draft.` });
                setDialogOpen(false);
                setSelectedScenario(null);
            } catch (error) {
                console.error("Error creating scenario:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to create scenario.' });
            }
        }
    };

    const openEditDialog = (scenario: Scenario) => {
        setSelectedScenario(scenario);
        setDialogOpen(true);
    };

    const openCreateDialog = () => {
        setSelectedScenario(null);
        setDialogOpen(true);
    };

    const openDeleteDialog = (scenario: Scenario) => {
        setScenarioToDelete(scenario);
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
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Scenarios</h1>
                    <p className="text-muted-foreground">
                        Create, edit, and delete simulation scenarios.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleSeedScenarios} variant="outline">
                        <UploadCloud className="mr-2" /> Seed Scenarios
                    </Button>
                    <Button onClick={openCreateDialog}>
                        <PlusCircle className="mr-2" /> Create Scenario
                    </Button>
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={(isOpen) => {
                setDialogOpen(isOpen);
                if (!isOpen) {
                    setSelectedScenario(null);
                }
            }}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedScenario ? 'Edit' : 'Create'} Scenario</DialogTitle>
                        <DialogDescription>
                            {selectedScenario ? 'Update the details of this scenario.' : 'Fill out the form to create a new scenario.'}
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

             <Card>
                <CardHeader>
                    <CardTitle>Scenario List</CardTitle>
                    <CardDescription>A list of all available scenarios in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead>Premium</TableHead>
                            <TableHead>Tags</TableHead>
                            <TableHead>
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>}
                            {scenarios?.map(s => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.title}</TableCell>
                                    <TableCell><Badge variant={s.status === 'published' ? 'default' : 'secondary'} className="capitalize">{s.status}</Badge></TableCell>
                                    <TableCell><Badge variant="outline">{s.difficulty}</Badge></TableCell>
                                    <TableCell>
                                      {s.isPremium ? (
                                        <Badge variant="secondary">Premium</Badge>
                                      ) : (
                                        <Badge variant="outline">Standard</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="space-x-1">{s.tags.join(', ')}</TableCell>
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
                                                <DropdownMenuItem onClick={() => openEditDialog(s)}>Edit</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => openDeleteDialog(s)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && scenarios?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center">No scenarios found. Try seeding some.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the scenario
                            <span className="font-bold"> &quot;{scenarioToDelete?.title}&quot;</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void handleDeleteScenario()} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}
