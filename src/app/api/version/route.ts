import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Returns the server's build stamp. AutoReload compares it with the stamp baked
// into the client bundle — a mismatch means a newer deploy is live, so the page
// reloads itself. This is what finally delivers fixes to a PWA that has been
// sitting open on Noga's phone since before the deploy (25/08: she stayed stuck
// on a broken bundle for hours after the fix shipped).
export async function GET() {
  return NextResponse.json({ v: process.env.NEXT_PUBLIC_BUILD_TS || 'dev' });
}
