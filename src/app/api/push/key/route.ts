import { crmGet } from '@/lib/crm';

export const dynamic = 'force-dynamic';

// The VAPID public key. Fetched from the CRM instead of being duplicated into a Vercel
// env var, so the key pair has one owner and rotating it can't leave the two out of sync.
export async function GET() {
  return crmGet('/api/noga/push/key');
}
