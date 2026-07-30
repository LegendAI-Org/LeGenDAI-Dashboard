import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// The conversation list lives on the CRM backend (Cloud Run), not here, because it also
// decides whether Meta's 24h reply window is still open for each conversation. Keeping
// that rule in one place stops the dashboard and the sender from disagreeing about who
// can be answered with free text.
const CRM_API_URL = process.env.CRM_API_URL;
const CRM_API_KEY = process.env.DASHBOARD_API_KEY;

export async function GET(request: Request) {
  if (!CRM_API_URL || !CRM_API_KEY) {
    return NextResponse.json(
      { error: 'CRM_API_URL / DASHBOARD_API_KEY are not configured on this deployment' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '50';

  try {
    const res = await fetch(
      `${CRM_API_URL}/api/noga/conversations?key=${encodeURIComponent(CRM_API_KEY)}&limit=${limit}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.detail || 'CRM request failed' }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error('[Conversations] CRM fetch failed:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
