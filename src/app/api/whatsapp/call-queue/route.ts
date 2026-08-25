import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// מתווך בלבד: מסתיר את מפתח ה-API ומעביר ל-CRM, שם יושבת הרשימה עצמה.
// הרשימה בשרת ולא בדפדפן כדי שגם נגה תראה אותה ושהיא תשרוד רענון.
const CRM = process.env.CRM_API_URL;
const KEY = process.env.DASHBOARD_API_KEY;

export async function GET(request: Request) {
  if (!CRM || !KEY) return NextResponse.json({ error: 'CRM API is not configured' }, { status: 503 });
  const includeCalled = new URL(request.url).searchParams.get('include_called') || '0';
  try {
    const res = await fetch(
      `${CRM}/api/noga/call-queue?key=${encodeURIComponent(KEY)}&include_called=${includeCalled}`,
      { cache: 'no-store' });
    // ה-CRM עשוי להחזיר 500 בלי גוף JSON. בלי ה-catch הזה res.json() זורק,
    // והמשתמש רואה "Unexpected token I" במקום מה שבאמת קרה.
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: data?.detail || `CRM request failed (${res.status})` }, { status: res.status });
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown error' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!CRM || !KEY) return NextResponse.json({ error: 'CRM API is not configured' }, { status: 503 });
  try {
    const body = await request.json();
    const res = await fetch(`${CRM}/api/noga/call-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, key: KEY }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: data?.detail || 'CRM request failed' }, { status: res.status });
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown error' }, { status: 502 });
  }
}
