import { crmPost } from '@/lib/crm';

export const dynamic = 'force-dynamic';

// Sends a real push to every registered device. Granting permission proves nothing on its
// own — the delivery chain only counts as working once it lands on the handset.
export async function POST() {
  return crmPost('/api/noga/push/test', {});
}
