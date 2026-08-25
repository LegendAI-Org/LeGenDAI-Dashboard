import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// הורדת האקסל. הקובץ נבנה ב-CRM (openpyxl) ומועבר כאן כמו שהוא, כדי שהמפתח
// לא ייחשף בכתובת שהדפדפן פותח.
export async function GET(request: Request) {
  const CRM = process.env.CRM_API_URL;
  const KEY = process.env.DASHBOARD_API_KEY;
  if (!CRM || !KEY) return NextResponse.json({ error: 'CRM API is not configured' }, { status: 503 });
  const includeCalled = new URL(request.url).searchParams.get('include_called') || '0';
  try {
    const res = await fetch(
      `${CRM}/api/noga/call-queue.xlsx?key=${encodeURIComponent(KEY)}&include_called=${includeCalled}`,
      { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'CRM request failed' }, { status: res.status });
    }
    const today = new Date().toISOString().slice(0, 10);
    return new NextResponse(await res.arrayBuffer(), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="call-list-${today}.xlsx"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown error' }, { status: 502 });
  }
}
