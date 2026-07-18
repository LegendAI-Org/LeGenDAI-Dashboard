import { redirect } from 'next/navigation';

// The old "דאשבורד ראשי" home is hidden per request (17/07): its revenue was based on
// per-lead deal_value (a form-based estimate, not verified), which overlaps with — and is
// less accurate than — the periodic summary, whose money comes verified from Morning.
// Home now sends users straight to the verified summary. The previous dashboard code is
// preserved in git history and can be restored by reverting this file.
export default function Home() {
  redirect('/summary');
}
