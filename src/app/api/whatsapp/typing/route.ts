import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Relays "Liya is typing" from the dashboard composer to the lead's WhatsApp.
// Best-effort by design: the composer must never block or error on this.
export async function POST(request: Request) {
  try {
    const { messageId } = await request.json();
    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }
    if (!process.env.CRM_API_URL || !process.env.DASHBOARD_API_KEY) {
      return NextResponse.json({ error: 'CRM API is not configured' }, { status: 500 });
    }
    const crmRes = await fetch(`${process.env.CRM_API_URL}/api/noga/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId, key: process.env.DASHBOARD_API_KEY }),
    });
    const crmData = await crmRes.json().catch(() => ({}));
    return NextResponse.json({ success: crmRes.ok && crmData.status === 'ok' });
  } catch {
    return NextResponse.json({ success: false });
  }
}
