import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Marks a conversation as handled without replying, so it stops showing the red
// "waiting" flag. The rule lives on the CRM (a timestamp, not a boolean, so a newer
// inbound message re-raises the flag) — this route only relays and hides the API key.
export async function POST(request: Request) {
  try {
    const { phone, undo } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }
    if (!process.env.CRM_API_URL || !process.env.DASHBOARD_API_KEY) {
      return NextResponse.json({ error: 'CRM API is not configured' }, { status: 500 });
    }
    const crmRes = await fetch(`${process.env.CRM_API_URL}/api/noga/conversations/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, undo: !!undo, key: process.env.DASHBOARD_API_KEY }),
    });
    const data = await crmRes.json().catch(() => ({}));
    if (!crmRes.ok) {
      return NextResponse.json({ error: data?.detail || 'CRM request failed' }, { status: crmRes.status });
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
