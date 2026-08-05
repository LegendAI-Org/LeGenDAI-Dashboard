import { NextResponse } from 'next/server';

// Every dashboard route that touches WhatsApp data proxies to the CRM on Cloud Run rather
// than hitting Supabase directly, so the rules (24h window, subscription storage, VAPID
// keys) live in exactly one place. DASHBOARD_API_KEY never reaches the browser.
export async function crmPost(path: string, body: Record<string, unknown>) {
  if (!process.env.CRM_API_URL || !process.env.DASHBOARD_API_KEY) {
    return NextResponse.json({ error: 'CRM API is not configured' }, { status: 503 });
  }
  try {
    const res = await fetch(`${process.env.CRM_API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, key: process.env.DASHBOARD_API_KEY }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function crmGet(path: string) {
  if (!process.env.CRM_API_URL || !process.env.DASHBOARD_API_KEY) {
    return NextResponse.json({ error: 'CRM API is not configured' }, { status: 503 });
  }
  try {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(
      `${process.env.CRM_API_URL}${path}${sep}key=${encodeURIComponent(process.env.DASHBOARD_API_KEY)}`,
      { cache: 'no-store' }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
