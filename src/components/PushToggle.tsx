"use client";

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import styles from './PushToggle.module.css';

// Turns this browser into an alert target for inbound WhatsApp messages. The Cloud API
// number has no handset: a lead who writes in is invisible until someone opens this page,
// which is exactly why the automation stayed switched off until now.

type State = 'checking' | 'unsupported' | 'off' | 'on' | 'blocked';

// The applicationServerKey must be raw bytes; the CRM hands us the standard base64url text.
function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// iOS only delivers web push to a PWA that was actually added to the home screen — in
// plain Safari the permission prompt never appears and nothing explains why.
function isIosSafariNotInstalled() {
  if (typeof window === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

export default function PushToggle() {
  const [state, setState] = useState<State>('checking');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const register = useCallback(async () => {
    return navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }, []);

  // Re-send the stored subscription on every load. Browsers quietly reissue endpoints,
  // and a stale row in the database looks identical to a working one until a real lead
  // writes in and nothing rings.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setState('unsupported');
        return;
      }
      try {
        const reg = await register();
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (Notification.permission === 'denied') {
          setState('blocked');
          return;
        }
        if (sub) {
          setState('on');
          fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub.toJSON(), label: navigator.platform || '' }),
          }).catch(() => {});
        } else {
          setState('off');
        }
      } catch {
        if (!cancelled) setState('unsupported');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [register]);

  const enable = async () => {
    setBusy(true);
    setNote('');
    try {
      if (isIosSafariNotInstalled()) {
        setNote('באייפון צריך קודם להתקין את האפליקציה: שיתוף ← "הוספה למסך הבית", ואז לפתוח משם.');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'off');
        return;
      }
      const keyRes = await fetch('/api/push/key');
      const { key } = await keyRes.json();
      if (!key) {
        setNote('השרת לא מחזיר מפתח התראות. צריך להגדיר VAPID_PUBLIC_KEY.');
        return;
      }
      const reg = await register();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), label: navigator.platform || '' }),
      });
      if (!res.ok) {
        setNote('ההרשמה להתראות נכשלה בשרת.');
        return;
      }
      setState('on');
      setNote('התראות פעילות במכשיר הזה. אפשר ללחוץ על הפעמון לשליחת בדיקה.');
    } catch (e) {
      setNote(`ההרשמה נכשלה: ${e instanceof Error ? e.message : 'שגיאה לא ידועה'}`);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setNote('');
    try {
      const reg = await register();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setState('off');
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setNote('');
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();
      setNote(
        data.sent > 0
          ? `נשלחה התראת בדיקה ל-${data.sent} מכשירים. אם היא לא הגיעה — ההתראות של הדפדפן חסומות במערכת ההפעלה.`
          : 'אין מכשירים רשומים להתראות.'
      );
    } catch {
      setNote('שליחת הבדיקה נכשלה.');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'checking' || state === 'unsupported') return null;

  const message =
    note ||
    (state === 'blocked'
      ? 'ההתראות חסומות בדפדפן. להפעלה: הגדרות האתר בכרום ← התראות ← אישור, ואז לרענן.'
      : '');

  return (
    <>
      <div className={styles.wrap}>
        {state === 'on' ? (
          <>
            <button
              className={`${styles.button} ${styles.on}`}
              onClick={sendTest}
              disabled={busy}
              title="שליחת התראת בדיקה"
            >
              <BellRing size={18} />
            </button>
            <button className={styles.button} onClick={disable} disabled={busy} title="כיבוי התראות">
              <BellOff size={18} />
            </button>
          </>
        ) : (
          <button
            className={`${styles.button} ${styles.off}`}
            onClick={enable}
            disabled={busy || state === 'blocked'}
            title="הפעלת התראות במכשיר הזה"
          >
            <Bell size={18} />
          </button>
        )}
      </div>
      {/* A toast rather than a block in the header: this component lives inside a flex
          row, and an inline message there would shove the title around on every click. */}
      {message && (
        <div
          className={`${styles.toast} ${state === 'on' && !!note ? styles.toastOk : ''}`}
          onClick={() => setNote('')}
          role="status"
        >
          {message}
        </div>
      )}
    </>
  );
}
