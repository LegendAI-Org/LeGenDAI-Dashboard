import { crmPost } from '@/lib/crm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { endpoint } = await request.json().catch(() => ({}));
  return crmPost('/api/noga/push/unsubscribe', { endpoint });
}
