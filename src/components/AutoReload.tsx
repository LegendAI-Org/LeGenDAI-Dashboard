'use client';

import { useEffect } from 'react';

// רענון עצמי כשיש פריסה חדשה. הלקח מ-25/08: תיקון קריטי נפרס ב-11:22, ונגה
// נשארה תקועה על הבאנדל השבור עוד שעות — כי קוד תקוע לא מושך את התיקון של
// עצמו. מכאן: כל דקה (וכל חזרה לחזית) משווים את חותמת הבנייה של הבאנדל הרץ
// מול השרת; פער = פריסה חדשה = רענון. הבדיקה רצה רק כשהעמוד גלוי, ורענון
// קורה רק כשמתקבלת תשובה תקינה — כשל רשת לעולם לא מרענן.
const CHECK_MS = 60_000;

export default function AutoReload() {
  useEffect(() => {
    const mine = process.env.NEXT_PUBLIC_BUILD_TS;
    if (!mine) return;
    let reloading = false;

    const check = async () => {
      if (reloading || document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`/api/version?_ts=${Date.now()}`, { cache: 'no-store' });
        const { v } = await res.json();
        if (v && v !== 'dev' && v !== mine) {
          reloading = true;
          location.reload();
        }
      } catch {
        /* אין רשת — ננסה בטיק הבא */
      }
    };

    const t = setInterval(check, CHECK_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('online', check);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('online', check);
    };
  }, []);

  return null;
}
