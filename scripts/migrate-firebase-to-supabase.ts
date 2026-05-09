/**
 * Firebase → Supabase ETL (staging first).
 *
 * Required env (e.g. `.env.local`):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Firebase Admin (pick one):
 *   FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/or/relative/path/to/serviceAccount.json
 *   OR set GOOGLE_APPLICATION_CREDENTIALS to that JSON path (standard ADC).
 *
 * Optional:
 *   MIGRATE_DRY_RUN=1  — prints planned work only; skips Supabase writes.
 *
 * Auth note: Firebase password hashes (scrypt) are not portable to Supabase (bcrypt).
 * This script creates users with email_confirm true and **no password** unless you extend it.
 * Send a password-reset / magic-link campaign for learners who used email/password.
 * Google sign-in users can use Supabase Google OAuth afterward.
 */

import fs from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

import type { Scenario, LegacySupabaseIntervention, UserRole } from '@/lib/types';
import { userToProfileInsert, scenarioToDbUpsert, interventionToDbInsert } from '@/lib/db-mappers';

loadDotenv({ path: path.resolve(process.cwd(), '.env.local') });
loadDotenv({ path: path.resolve(process.cwd(), '.env') });

const dryRun = process.env.MIGRATE_DRY_RUN === '1';

function initFirebaseAdmin() {
  if (getApps().length > 0) return;
  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (p) {
    const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    const json = JSON.parse(fs.readFileSync(abs, 'utf8')) as Record<string, unknown>;
    initializeApp({ credential: cert(json) });
    return;
  }
  initializeApp({ credential: applicationDefault() });
}

function coerceIso(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return new Date(v).toISOString();
  if (typeof v === 'number') return new Date(v).toISOString();
  if (typeof v === 'object' && v !== null && 'seconds' in v) {
    const s = Number((v as { seconds: number }).seconds);
    if (!Number.isNaN(s)) return new Date(s * 1000).toISOString();
  }
  return null;
}

function coerceIsoRequired(v: unknown): string {
  return coerceIso(v) ?? new Date().toISOString();
}

async function migrateAuthUsers(
  uidMap: Map<string, string>
): Promise<void> {
  const auth = getAuth();
  const sb =
    dryRun
      ? null
      : createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
  let pageToken: string | undefined;

  console.log('[auth] Listing Firebase Auth users…');
  for (;;) {
    const res = await auth.listUsers(1000, pageToken);
    for (const u of res.users) {
      const email = u.email;
      if (!email) {
        console.warn(`[auth] skip user ${u.uid}: no email`);
        continue;
      }
      if (dryRun) {
        uidMap.set(u.uid, `dry:${u.uid}`);
        continue;
      }

      const { data, error } = await sb!.auth.admin.createUser({
        email,
        email_confirm: u.emailVerified ?? true,
        user_metadata: {
          full_name: u.displayName ?? undefined,
        },
      });

      if (error) {
        console.error(`[auth] create failed ${email}: ${error.message}`);
        continue;
      }
      if (!data?.user?.id) {
        console.error(`[auth] no user id returned for ${email}`);
        continue;
      }
      uidMap.set(u.uid, data.user.id);
      console.log(`[auth] ${u.uid} → ${data.user.id} (${email})`);
    }

    if (!res.pageToken) break;
    pageToken = res.pageToken;
  }
}

async function upsertFirebaseMappings(uidMap: Map<string, string>): Promise<void> {
  if (dryRun) return;
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  console.log('[mappings] Writing firebase_uid_mappings…');
  for (const [firebaseUid, authUserId] of uidMap) {
    const { error } = await sb.from('firebase_uid_mappings').upsert(
      { firebase_uid: firebaseUid, auth_user_id: authUserId },
      { onConflict: 'firebase_uid' }
    );
    if (error) console.error(`[mappings] ${firebaseUid}`, error.message);
  }
}

async function migrateProfiles(db: Firestore, uidMap: Map<string, string>) {
  const sb = dryRun
    ? null
    : createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

  const snap = await db.collection('users').get();
  console.log(`[profiles] users docs: ${snap.size}`);
  for (const doc of snap.docs) {
    const fbUid = doc.id;
    const supabaseId = uidMap.get(fbUid);
    if (!supabaseId) {
      console.warn(`[profiles] no auth mapping for ${fbUid}, skipping`);
      continue;
    }
    const d = doc.data();
    const row = userToProfileInsert({
      id: supabaseId,
      email: String(d.email ?? ''),
      displayName: d.displayName ?? undefined,
      photoURL: d.photoURL ?? undefined,
      role: (d.role ?? 'student') as UserRole,
      testRole: d.testRole ?? undefined,
      isAdmin: d.isAdmin ?? false,
      hasCompletedTutorial: d.hasCompletedTutorial ?? false,
    });

    if (dryRun) continue;
    const { error } = await sb!.from('profiles').upsert(row, { onConflict: 'id' });
    if (error) console.error(`[profiles] ${fbUid}`, error.message);
  }
}

async function migrateScenarios(db: Firestore) {
  const sb = dryRun
    ? null
    : createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
  const snap = await db.collection('scenarios').get();
  console.log(`[scenarios] ${snap.size}`);
  for (const doc of snap.docs) {
    const s = { id: doc.id, ...doc.data() } as Scenario;
    const row = scenarioToDbUpsert(s);
    if (dryRun) continue;
    const { error } = await sb!.from('scenarios').upsert(row, { onConflict: 'id' });
    if (error) console.error(`[scenarios] ${doc.id}`, error.message);
  }
}

async function migrateInterventions(db: Firestore) {
  const sb = dryRun
    ? null
    : createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
  const snap = await db.collection('interventions').get();
  console.log(`[interventions] ${snap.size}`);
  for (const doc of snap.docs) {
    const i = { id: doc.id, ...doc.data() } as LegacySupabaseIntervention;
    const row = interventionToDbInsert(i);
    if (dryRun) continue;
    const { error } = await sb!.from('interventions').upsert(row, { onConflict: 'id' });
    if (error) console.error(`[interventions] ${doc.id}`, error.message);
  }
}

async function migrateSupportTickets(db: Firestore, uidMap: Map<string, string>) {
  const sb = dryRun
    ? null
    : createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

  let snap = await db.collection('supportTickets').get();
  if (snap.empty) snap = await db.collection('support_tickets').get();

  console.log(`[support_tickets] ${snap.size}`);
  for (const doc of snap.docs) {
    const d = doc.data();
    const firebaseUserId = String(d.userId ?? '');
    const userId = uidMap.get(firebaseUserId);
    if (!userId) {
      console.warn(`[support_tickets] skip ${doc.id}: unknown user ${firebaseUserId}`);
      continue;
    }
    const row = {
      id: doc.id,
      user_id: userId,
      user_email: String(d.userEmail ?? ''),
      message: String(d.message ?? ''),
      scenario_id: d.scenarioId ? String(d.scenarioId) : null,
      scenario_title: d.scenarioTitle ? String(d.scenarioTitle) : null,
      created_at: coerceIsoRequired(d.createdAt ?? d.created_at),
      status: String(d.status ?? 'new'),
      responses: d.responses ?? [],
    };
    if (dryRun) continue;
    const { error } = await sb!.from('support_tickets').upsert(row, { onConflict: 'id' });
    if (error) console.error(`[support_tickets] ${doc.id}`, error.message);
  }
}

async function migrateScenarioReviews(db: Firestore, uidMap: Map<string, string>) {
  const sb = dryRun
    ? null
    : createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

  let snap = await db.collection('scenarioReviews').get();
  if (snap.empty) snap = await db.collection('scenario_reviews').get();

  console.log(`[scenario_reviews] ${snap.size}`);
  for (const doc of snap.docs) {
    const d = doc.data();
    const testerFirebase = String(d.testerId ?? '');
    const testerId = uidMap.get(testerFirebase);
    if (!testerId) {
      console.warn(`[scenario_reviews] skip ${doc.id}: unknown tester ${testerFirebase}`);
      continue;
    }
    const row = {
      id: doc.id,
      scenario_id: String(d.scenarioId ?? ''),
      tester_id: testerId,
      tester_name: String(d.testerName ?? ''),
      tested_as_role: String(d.testedAsRole ?? 'emt'),
      approved: Boolean(d.approved),
      comments: d.comments ? String(d.comments) : null,
      created_at: coerceIsoRequired(d.createdAt ?? d.created_at),
    };
    if (dryRun) continue;
    const { error } = await sb!.from('scenario_reviews').upsert(row, { onConflict: 'id' });
    if (error) console.error(`[scenario_reviews] ${doc.id}`, error.message);
  }
}

async function migrateSessions(db: Firestore, uidMap: Map<string, string>) {
  const sb = dryRun
    ? null
    : createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

  const usersSnap = await db.collection('users').get();
  console.log('[sessions] scanning simulationSessions subcollections…');

  let sessionCount = 0;
  for (const userDoc of usersSnap.docs) {
    const fbUid = userDoc.id;
    const userId = uidMap.get(fbUid);
    if (!userId) continue;

    const sessionsSnap = await userDoc.ref.collection('simulationSessions').get();
    for (const sdoc of sessionsSnap.docs) {
      sessionCount++;
      const s = sdoc.data();
      const row = {
        id: sdoc.id,
        user_id: userId,
        scenario_id: String(s.scenarioId ?? ''),
        scenario_title: String(s.scenarioTitle ?? ''),
        start_time: coerceIsoRequired(s.startTime ?? s.start_time),
        end_time: coerceIso(s.endTime ?? s.end_time),
        status: String(s.status ?? 'in-progress'),
        time_elapsed: s.timeElapsed ?? s.time_elapsed ?? null,
        actions: s.actions ?? [],
        user_role: s.userRole ?? s.user_role ?? null,
      };
      if (dryRun) continue;
      const { error } = await sb!.from('simulation_sessions').upsert(row, { onConflict: 'id' });
      if (error) {
        console.error(`[sessions] ${sdoc.id}`, error.message);
        continue;
      }

      const insightsSnap = await sdoc.ref.collection('insights').get();
      for (const idoc of insightsSnap.docs) {
        const ins = idoc.data();
        const insRow = {
          session_id: sdoc.id,
          id: idoc.id,
          assessment_score: Number(ins.assessmentScore ?? ins.assessment_score ?? 0),
          treatment_score: Number(ins.treatmentScore ?? ins.treatment_score ?? 0),
          ai_feedback: String(ins.aiFeedback ?? ins.ai_feedback ?? ''),
          reasoning: String(ins.reasoning ?? ''),
        };
        const { error: ie } = await sb!
          .from('session_insights')
          .upsert(insRow, { onConflict: 'session_id,id' });
        if (ie) console.error(`[session_insights] ${sdoc.id}/${idoc.id}`, ie.message);
      }
    }
  }
  console.log(`[sessions] total session docs seen: ${sessionCount}`);
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  initFirebaseAdmin();
  const db = getFirestore();

  const uidMap = new Map<string, string>();

  if (dryRun) {
    console.log('--- MIGRATE_DRY_RUN=1: no writes ---');
  }

  await migrateAuthUsers(uidMap);
  await upsertFirebaseMappings(uidMap);
  await migrateProfiles(db, uidMap);
  await migrateScenarios(db);
  await migrateInterventions(db);
  await migrateSessions(db, uidMap);
  await migrateSupportTickets(db, uidMap);
  await migrateScenarioReviews(db, uidMap);

  console.log('Done.');
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
