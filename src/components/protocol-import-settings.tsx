'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  acknowledgeProtocolImportResolution,
  clearActiveProtocolImports,
  createProtocolWorkplace,
  deleteProtocolImport,
  deleteWorkplaceProtocolImport,
  joinProtocolWorkplace,
  leaveProtocolWorkplace,
  setActiveProtocolImport,
  setActiveWorkplaceProtocolImport,
  uploadProtocolPdf,
  uploadWorkplaceProtocolPdf,
} from '@/app/protocol-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  useCollection,
  useDashboardProfile,
  useDoc,
  useMemoSupabase,
  useSupabase,
  useUser,
} from '@/supabase';
import { Copy, FileUp, Loader2, Star, Trash2, Users } from 'lucide-react';

type ImportListRow = {
  id: string;
  status: string;
  display_name: string;
  original_filename: string;
  created_at: string;
  resolution_message_for_user?: string | null;
  admin_resolved_at?: string | null;
};

function protocolImportMatchesSearch(row: ImportListRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${row.display_name} ${row.original_filename}`.toLowerCase();
  return hay.includes(q);
}

type ResolutionAckRow = {
  import_scope: string;
  import_id: string;
};

type MemberRow = {
  role: string;
  workplace_id: string;
};

type WorkplaceRow = {
  name: string;
  join_code: string;
};

export function ProtocolImportSettings() {
  const router = useRouter();
  const { toast } = useToast();
  const client = useSupabase();
  const { user: authUser } = useUser();
  const { data: userData } = useDashboardProfile();
  const [isBusy, startTransition] = useTransition();
  const [workplaceName, setWorkplaceName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [personalImportSearch, setPersonalImportSearch] = useState('');
  const [workplaceImportSearch, setWorkplaceImportSearch] = useState('');

  const workplaceId = userData?.protocolWorkplaceId ?? null;

  const workplaceDocSpec = useMemoSupabase(
    () =>
      client && workplaceId
        ? { table: 'protocol_workplaces' as const, id: workplaceId, live: true }
        : null,
    [client, workplaceId],
  );
  const { data: workplaceDoc } = useDoc<WorkplaceRow>(workplaceDocSpec);

  const memberSpec = useMemoSupabase(
    () =>
      client && authUser
        ? {
            table: 'protocol_workplace_members' as const,
            columns: 'role,workplace_id',
            eq: { user_id: authUser.id },
            live: true,
          }
        : null,
    [client, authUser],
  );
  const { data: memberRows } = useCollection<MemberRow>(memberSpec);
  const myMembership = memberRows?.[0];
  const isWorkplaceAdmin = myMembership?.role === 'admin';

  const importsSpec = useMemoSupabase(
    () =>
      client && authUser
        ? {
            table: 'user_protocol_imports' as const,
            columns:
              'id,status,display_name,original_filename,created_at,resolution_message_for_user,admin_resolved_at',
            eq: { user_id: authUser.id },
            order: { column: 'created_at', ascending: false },
            live: true,
          }
        : null,
    [client, authUser],
  );

  const wpImportsSpec = useMemoSupabase(
    () =>
      client && workplaceId
        ? {
            table: 'workplace_protocol_imports' as const,
            columns:
              'id,status,display_name,original_filename,created_at,resolution_message_for_user,admin_resolved_at',
            eq: { workplace_id: workplaceId },
            order: { column: 'created_at', ascending: false },
            live: true,
          }
        : null,
    [client, workplaceId],
  );

  const ackSpec = useMemoSupabase(
    () =>
      client && authUser
        ? {
            table: 'protocol_import_resolution_acks' as const,
            columns: 'import_scope,import_id',
            eq: { user_id: authUser.id },
            live: true,
          }
        : null,
    [client, authUser],
  );

  const { data: imports, isLoading } = useCollection<ImportListRow>(importsSpec);
  const { data: wpImports, isLoading: wpLoading } = useCollection<ImportListRow>(wpImportsSpec);
  const { data: resolutionAcks } = useCollection<ResolutionAckRow>(ackSpec);

  const activePersonalId = userData?.activeProtocolImportId ?? null;
  const activeWorkplaceImportId = userData?.activeWorkplaceProtocolImportId ?? null;
  const usingAgencyMerge = Boolean(activeWorkplaceImportId || activePersonalId);

  const sortedImports = useMemo(() => imports ?? [], [imports]);
  const sortedWpImports = useMemo(() => wpImports ?? [], [wpImports]);

  const filteredPersonalImports = useMemo(
    () => sortedImports.filter((r) => protocolImportMatchesSearch(r, personalImportSearch)),
    [sortedImports, personalImportSearch],
  );
  const filteredWorkplaceImports = useMemo(
    () => sortedWpImports.filter((r) => protocolImportMatchesSearch(r, workplaceImportSearch)),
    [sortedWpImports, workplaceImportSearch],
  );

  const resolutionNotices = useMemo(() => {
    const ackSet = new Set(
      (resolutionAcks ?? []).map((a) => `${a.import_scope}:${a.import_id}`),
    );
    const out: {
      scope: 'user' | 'workplace';
      id: string;
      message: string;
      displayName: string;
      originalFilename: string;
    }[] = [];
    for (const r of sortedImports) {
      if (
        r.resolution_message_for_user?.trim() &&
        r.admin_resolved_at &&
        !ackSet.has(`user:${r.id}`)
      ) {
        out.push({
          scope: 'user',
          id: r.id,
          message: r.resolution_message_for_user.trim(),
          displayName: r.display_name,
          originalFilename: r.original_filename,
        });
      }
    }
    for (const r of sortedWpImports) {
      if (
        r.resolution_message_for_user?.trim() &&
        r.admin_resolved_at &&
        !ackSet.has(`workplace:${r.id}`)
      ) {
        out.push({
          scope: 'workplace',
          id: r.id,
          message: r.resolution_message_for_user.trim(),
          displayName: r.display_name,
          originalFilename: r.original_filename,
        });
      }
    }
    return out;
  }, [sortedImports, sortedWpImports, resolutionAcks]);

  const activeProtocolSummary = useMemo(() => {
    if (activeWorkplaceImportId) {
      const row = sortedWpImports.find((r) => r.id === activeWorkplaceImportId);
      return {
        kind: 'workplace' as const,
        label: row?.display_name ?? row?.original_filename ?? 'Workplace shared PDF',
      };
    }
    if (activePersonalId) {
      const row = sortedImports.find((r) => r.id === activePersonalId);
      return {
        kind: 'personal' as const,
        label: row?.display_name ?? row?.original_filename ?? 'Personal PDF',
      };
    }
    return null;
  }, [
    activeWorkplaceImportId,
    activePersonalId,
    sortedWpImports,
    sortedImports,
  ]);

  const copyJoinCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Join code copied' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not copy',
        description: 'Copy the code manually.',
      });
    }
  };

  if (!userData?.isPremium) {
    return null;
  }

  return (
    <>
      {resolutionNotices.map((n) => (
        <Alert key={`${n.scope}-${n.id}`} className="border-green-600/40 bg-green-50/80 dark:bg-green-950/20">
          <AlertTitle>Protocol import update: {n.displayName}</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p className="text-xs text-muted-foreground">File: {n.originalFilename}</p>
            <p>{n.message}</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isBusy}
              onClick={() => {
                startTransition(() => {
                  void (async () => {
                    const res = await acknowledgeProtocolImportResolution(n.scope, n.id);
                    if (res.ok) {
                      toast({ title: 'Thanks — we will not show this notice again.' });
                    } else {
                      toast({
                        variant: 'destructive',
                        title: 'Could not dismiss',
                        description: res.error,
                      });
                    }
                    router.refresh();
                  })();
                });
              }}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      ))}

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="h-5 w-5" />
          Agency protocol PDF
        </CardTitle>
        <CardDescription>
          Give each upload a short name so you can search your list. Upload a protocol book for yourself, or share
          one PDF for your whole workplace so coworkers do not duplicate storage. Shared libraries use a join code.
          Only one import can be active at a time (workplace or personal).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section
          className={`rounded-lg border p-4 ${usingAgencyMerge ? 'border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20' : 'bg-muted/25'}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">What you see in scenarios</p>
              <p className="text-xs text-muted-foreground">
                {activeProtocolSummary ? (
                  <>
                    Your{' '}
                    <span className="font-medium text-foreground">
                      {activeProtocolSummary.kind === 'workplace' ? 'team' : 'uploaded'}
                    </span>{' '}
                    protocol PDF is on:{' '}
                    <span className="break-all font-medium text-foreground">
                      {activeProtocolSummary.label}
                    </span>
                    . Treatments and grading use it together with Simu-Pro&apos;s standard protocols.
                  </>
                ) : (
                  <>
                    You&apos;re on{' '}
                    <span className="font-medium text-foreground">Simu-Pro&apos;s standard protocols</span>{' '}
                    only. Turn on an agency PDF below anytime.
                  </>
                )}
              </p>
            </div>
            {usingAgencyMerge ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isBusy}
                className="shrink-0"
                onClick={() => {
                  startTransition(() => {
                    void (async () => {
                      const res = await clearActiveProtocolImports();
                      if (res.ok) {
                        toast({
                          title: 'Back to standard protocols',
                          description: "Scenarios will use Simu-Pro's default treatment list and grading.",
                        });
                      } else {
                        toast({
                          variant: 'destructive',
                          title: 'Could not update',
                          description: res.error,
                        });
                      }
                      router.refresh();
                    })();
                  });
                }}
              >
                Use standard protocols only
              </Button>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Workplace library</h3>
          </div>

          {!workplaceId ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
                <p className="text-sm font-medium">Create a workplace</p>
                <p className="text-xs text-muted-foreground">
                  You become the admin and get a join code to share with coworkers.
                </p>
                <Input
                  placeholder="e.g. Medic 12 / North Station"
                  value={workplaceName}
                  onChange={(e) => setWorkplaceName(e.target.value)}
                  disabled={isBusy}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={isBusy || workplaceName.trim().length < 2}
                  onClick={() => {
                    startTransition(() => {
                      void (async () => {
                        const res = await createProtocolWorkplace(workplaceName.trim());
                        if (res.ok) {
                          toast({
                            title: 'Workplace created',
                            description: `Share this join code with coworkers: ${res.joinCode}`,
                          });
                          setWorkplaceName('');
                        } else {
                          toast({ variant: 'destructive', title: 'Could not create', description: res.error });
                        }
                        router.refresh();
                      })();
                    });
                  }}
                >
                  Create workplace
                </Button>
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
                <p className="text-sm font-medium">Join with a code</p>
                <p className="text-xs text-muted-foreground">Paste the code from your workplace admin.</p>
                <Input
                  placeholder="Join code"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  disabled={isBusy}
                  className="font-mono uppercase"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isBusy || joinCodeInput.trim().length < 4}
                  onClick={() => {
                    startTransition(() => {
                      void (async () => {
                        const res = await joinProtocolWorkplace(joinCodeInput.trim());
                        if (res.ok) {
                          toast({ title: 'Joined workplace' });
                          setJoinCodeInput('');
                        } else {
                          toast({ variant: 'destructive', title: 'Could not join', description: res.error });
                        }
                        router.refresh();
                      })();
                    });
                  }}
                >
                  Join workplace
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{workplaceDoc?.name ?? 'Workplace'}</p>
                  {workplaceDoc?.join_code ? (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      Join code:{' '}
                      <span className="text-foreground">{workplaceDoc.join_code}</span>
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {workplaceDoc?.join_code ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void copyJoinCode(workplaceDoc.join_code)}
                    >
                      <Copy className="mr-1 h-4 w-4" />
                      Copy code
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={isBusy}
                    onClick={() => {
                      startTransition(() => {
                        void (async () => {
                          const res = await leaveProtocolWorkplace();
                          if (res.ok) {
                            toast({ title: 'Left workplace' });
                          } else {
                            toast({ variant: 'destructive', title: 'Could not leave', description: res.error });
                          }
                          router.refresh();
                        })();
                      });
                    }}
                  >
                    Leave workplace
                  </Button>
                </div>
              </div>

              {isWorkplaceAdmin ? (
                <form
                  className="space-y-3 border-t pt-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    startTransition(() => {
                      void (async () => {
                        const res = await uploadWorkplaceProtocolPdf(fd);
                        if (res.ok) {
                          toast({
                            title: 'Shared import ready',
                            description: 'Coworkers can activate it below.',
                          });
                          e.currentTarget.reset();
                        } else {
                          toast({
                            variant: 'destructive',
                            title: 'Upload failed',
                            description: res.error,
                          });
                        }
                        router.refresh();
                      })();
                    });
                  }}
                >
                  <p className="text-sm font-medium">Upload for everyone (admin)</p>
                  <div className="space-y-1">
                    <label htmlFor="workplace-protocol-display-name" className="text-xs font-medium text-muted-foreground">
                      Name (searchable)
                    </label>
                    <Input
                      id="workplace-protocol-display-name"
                      name="display_name"
                      placeholder="e.g. Regional EMS protocols 2024"
                      minLength={2}
                      maxLength={120}
                      required
                      disabled={isBusy}
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1 space-y-1">
                      <label htmlFor="workplace-protocol-pdf" className="text-xs font-medium text-muted-foreground">
                        PDF file
                      </label>
                      <input
                        id="workplace-protocol-pdf"
                        name="pdf"
                        type="file"
                        accept="application/pdf"
                        required
                        disabled={isBusy}
                        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5"
                      />
                    </div>
                    <Button type="submit" disabled={isBusy} className="shrink-0">
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <FileUp className="mr-2 h-4 w-4" />
                          Upload shared
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="border-t pt-3 text-xs text-muted-foreground">
                  Only a workplace admin can upload or delete shared PDFs. Ask your admin to add the protocol
                  book here.
                </p>
              )}

              <div className="space-y-2 border-t pt-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <p className="text-sm font-medium">Shared imports</p>
                  {sortedWpImports.length > 0 ? (
                    <Input
                      type="search"
                      placeholder="Search by name or file…"
                      value={workplaceImportSearch}
                      onChange={(e) => setWorkplaceImportSearch(e.target.value)}
                      disabled={wpLoading}
                      className="sm:max-w-xs"
                      aria-label="Search shared protocol imports"
                    />
                  ) : null}
                </div>
                {wpLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : sortedWpImports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shared uploads yet.</p>
                ) : filteredWorkplaceImports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shared imports match your search.</p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {filteredWorkplaceImports.map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-medium">{row.display_name}</span>
                            {row.id === activeWorkplaceImportId ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-yellow-300/60 bg-yellow-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300">
                                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                Active
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground" title={row.original_filename}>
                            {row.original_filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(row.created_at).toLocaleString()} ·{' '}
                            <span className="capitalize">{row.status}</span>
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {row.status === 'ready' && row.id !== activeWorkplaceImportId ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={isBusy}
                              onClick={() => {
                                startTransition(() => {
                                  void (async () => {
                                    const res = await setActiveWorkplaceProtocolImport(row.id);
                                    if (res.ok) {
                                      toast({ title: 'Using shared protocol' });
                                    } else {
                                      toast({
                                        variant: 'destructive',
                                        title: 'Could not activate',
                                        description: res.error,
                                      });
                                    }
                                    router.refresh();
                                  })();
                                });
                              }}
                            >
                              Activate
                            </Button>
                          ) : null}
                          {row.id === activeWorkplaceImportId ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => {
                                startTransition(() => {
                                  void (async () => {
                                    const res = await setActiveWorkplaceProtocolImport(null);
                                    if (res.ok) {
                                      toast({ title: 'Shared protocol off' });
                                    } else {
                                      toast({
                                        variant: 'destructive',
                                        title: 'Update failed',
                                        description: res.error,
                                      });
                                    }
                                    router.refresh();
                                  })();
                                });
                              }}
                            >
                              Deactivate
                            </Button>
                          ) : null}
                          {isWorkplaceAdmin ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              disabled={isBusy}
                              onClick={() => {
                                startTransition(() => {
                                  void (async () => {
                                    const res = await deleteWorkplaceProtocolImport(row.id);
                                    if (res.ok) {
                                      toast({ title: 'Shared import deleted' });
                                    } else {
                                      toast({
                                        variant: 'destructive',
                                        title: 'Delete failed',
                                        description: res.error,
                                      });
                                    }
                                    router.refresh();
                                  })();
                                });
                              }}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4 border-t pt-6">
          <h3 className="text-sm font-semibold">Personal uploads</h3>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(() => {
                void (async () => {
                  const res = await uploadProtocolPdf(fd);
                  if (res.ok) {
                    toast({
                      title: 'Import ready',
                      description: 'Activate it below to use in simulations.',
                    });
                    e.currentTarget.reset();
                  } else {
                    toast({
                      variant: 'destructive',
                      title: 'Import failed',
                      description: res.error,
                    });
                  }
                  router.refresh();
                })();
              });
            }}
          >
            <div className="space-y-1">
              <label htmlFor="protocol-display-name" className="text-sm font-medium">
                Name (searchable)
              </label>
              <Input
                id="protocol-display-name"
                name="display_name"
                placeholder="e.g. County EMS protocols 2024"
                minLength={2}
                maxLength={120}
                required
                disabled={isBusy}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1">
                <label htmlFor="protocol-pdf" className="text-sm font-medium">
                  PDF file (private to you)
                </label>
                <input
                  id="protocol-pdf"
                  name="pdf"
                  type="file"
                  accept="application/pdf"
                  required
                  disabled={isBusy}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5"
                />
                <p className="text-xs text-muted-foreground">Max 15 MB. Text-based PDFs work best.</p>
              </div>
              <Button type="submit" disabled={isBusy} className="shrink-0">
                {isBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" />
                    Upload &amp; extract
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-sm font-medium">Your imports</p>
              {sortedImports.length > 0 ? (
                <Input
                  type="search"
                  placeholder="Search by name or file…"
                  value={personalImportSearch}
                  onChange={(e) => setPersonalImportSearch(e.target.value)}
                  disabled={isLoading}
                  className="sm:max-w-xs"
                  aria-label="Search your protocol imports"
                />
              ) : null}
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : sortedImports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No uploads yet.</p>
            ) : filteredPersonalImports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No imports match your search.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {filteredPersonalImports.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{row.display_name}</span>
                        {row.id === activePersonalId ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-yellow-300/60 bg-yellow-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            Active
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground" title={row.original_filename}>
                        {row.original_filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()} ·{' '}
                        <span className="capitalize">{row.status}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {row.status === 'ready' && row.id !== activePersonalId ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={isBusy}
                          onClick={() => {
                            startTransition(() => {
                              void (async () => {
                                const res = await setActiveProtocolImport(row.id);
                                if (res.ok) {
                                  toast({ title: 'Using personal protocol' });
                                } else {
                                  toast({
                                    variant: 'destructive',
                                    title: 'Could not activate',
                                    description: res.error,
                                  });
                                }
                                router.refresh();
                              })();
                            });
                          }}
                        >
                          Activate
                        </Button>
                      ) : null}
                      {row.id === activePersonalId ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => {
                            startTransition(() => {
                              void (async () => {
                                const res = await setActiveProtocolImport(null);
                                if (res.ok) {
                                  toast({ title: 'Personal protocol off' });
                                } else {
                                  toast({
                                    variant: 'destructive',
                                    title: 'Update failed',
                                    description: res.error,
                                  });
                                }
                                router.refresh();
                              })();
                            });
                          }}
                        >
                          Deactivate
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={isBusy}
                        onClick={() => {
                          startTransition(() => {
                            void (async () => {
                              const res = await deleteProtocolImport(row.id);
                              if (res.ok) {
                                toast({ title: 'Import deleted' });
                              } else {
                                toast({
                                  variant: 'destructive',
                                  title: 'Delete failed',
                                  description: res.error,
                                });
                              }
                              router.refresh();
                            })();
                          });
                        }}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </CardContent>
      <CardFooter className="border-t text-xs text-muted-foreground">
        Extracted data is for training only and may be incomplete. Always follow your agency&apos;s current
        protocols and medical direction.
      </CardFooter>
    </Card>
    </>
  );
}
