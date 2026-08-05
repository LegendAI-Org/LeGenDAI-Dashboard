import { crmPost } from '@/lib/crm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { subscription, label } = await request.json().catch(() => ({}));
  if (!subscription?.endpoint) {
    return Response.json({ error: 'subscription is required' }, { status: 400 });
  }
  return crmPost('/api/noga/push/subscribe', {
    subscription,
    label,
    user_agent: request.headers.get('user-agent') || '',
  });
}
