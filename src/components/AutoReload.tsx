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

    // 25/08, המסך התקוע של נגה: Vercel לא שומר נכסים של בנייה קודמת — קובץ
    // JS של בילד ישן מוחזר 404. כשנפרסות כמה גרסאות ברצף בזמן שהעמוד פתוח,
    // הרענון שלמעלה מבקש chunk שכבר נמחק, React לא עולה בכלל, ומה שנשאר על
    // המסך הוא ה-HTML הראשוני מהשרת: "טוען שיחות…" עם 0, בלי שגיאה ובלי
    // פולינג. מבחוץ זה נראה בדיוק כמו תקלת שרת, ורק רענון קשיח ידני מציל.
    //
    // ChunkLoadError הוא סימן חד-משמעי לכך, ורענון פותר אותו — הדפדפן ימשוך
    // HTML חדש שמצביע על ה-chunks החדשים. sessionStorage מונע לולאה: אם גם
    // הרענון נכשל, לא מנסים שוב אלא נותנים לשגיאה להופיע.
    const RELOADED = 'chunk-reload-attempted';
    const onChunkError = (ev: Event | PromiseRejectionEvent) => {
      const msg = String(
        (ev as ErrorEvent)?.message ||
        (ev as PromiseRejectionEvent)?.reason?.message ||
        (ev as PromiseRejectionEvent)?.reason || '');
      if (!/ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed/i.test(msg)) return;
      if (reloading || sessionStorage.getItem(RELOADED)) return;
      reloading = true;
      sessionStorage.setItem(RELOADED, '1');
      location.reload();
    };
    // הגענו לכאן ⇒ הבאנדל עלה בהצלחה, אז הדגל מתאפס ורענון יהיה זמין שוב
    // בפעם הבאה שנתקע.
    sessionStorage.removeItem(RELOADED);
    window.addEventListener('error', onChunkError);
    window.addEventListener('unhandledrejection', onChunkError);

    const t = setInterval(check, CHECK_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('online', check);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('online', check);
      window.removeEventListener('error', onChunkError);
      window.removeEventListener('unhandledrejection', onChunkError);
    };
  }, []);

  return null;
}
