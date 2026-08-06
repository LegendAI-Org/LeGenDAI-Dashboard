import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET  — the approved templates the team may send by hand.
// POST — sends one. This is the ONLY way to reach someone whose 24h window has closed:
// Meta rejects free-form text there with error 131047, so without it a conversation that
// went quiet for two days is a dead end from the dashboard.
export async function GET() {
  if (!process.env.CRM_API_URL || !process.env.DASHBOARD_API_KEY) {
    return NextResponse.json({ error: 'CRM API is not configured' }, { status: 500 });
  }
  try {
    const res = await fetch(
      `${process.env.CRM_API_URL}/api/noga/templates?key=${encodeURIComponent(process.env.DASHBOARD_API_KEY)}`,
      { cache: 'no-store' }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const { phone, template, firstName } = await request.json();
    if (!phone || !template) {
      return NextResponse.json({ error: 'phone and template are required' }, { status: 400 });
    }
    if (!process.env.CRM_API_URL || !process.env.DASHBOARD_API_KEY) {
      return NextResponse.json({ error: 'CRM API is not configured' }, { status: 500 });
    }
    const res = await fetch(`${process.env.CRM_API_URL}/api/noga/send-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone, template, first_name: firstName || '',
        key: process.env.DASHBOARD_API_KEY,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data?.detail || 'CRM request failed' }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
