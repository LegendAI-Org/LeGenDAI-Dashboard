import { redirect } from 'next/navigation';

// Time-clock page hidden per request (17/07). Kept as a redirect so a stale direct
// link doesn't 404 — it quietly sends the user back to the dashboard. The TimeClock
// component and this route can be restored by reverting this file.
export default function TimePage() {
  redirect('/');
}
