import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** Public read: whether annual checkout is wired (STRIPE_PRICE_ID_ANNUAL). No secrets returned. */
export async function GET() {
  const annualAvailable = Boolean(process.env.STRIPE_PRICE_ID_ANNUAL?.trim());
  return NextResponse.json({ annualAvailable });
}
