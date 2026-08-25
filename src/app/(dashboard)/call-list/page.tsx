"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Phone, MessageCircle, Download, Check, X, RefreshCw } from 'lucide-react';
import styles from './page.module.css';

type Row = {
  phone: string;
  name?: string;
  note?: string;
  added_at?: string;
  called?: boolean;
  called_at?: string;
};

const intl = (p: string) => {
  const d = (p || '').replace(/\D/g, '');
  return d.startsWith('972') ? d : `972${d.replace(/^0/, '')}`;
};
const local = (p: string) => `0${intl(p).slice(3)}`;
const fmt = (d?: string) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '');

export default function CallListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [includeCalled, setIncludeCalled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/whatsapp/call-queue?include_called=${includeCalled ? 1 : 0}`,
        { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'שגיאה בטעינת הרשימה');
      setRows(data.rows || []);
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הרשימה');
    } finally {
      setLoading(false);
    }
  }, [includeCalled]);

  useEffect(() => { load(); }, [load]);

  const act = async (phone: string, body: Record<string, unknown>) => {
    // עדכון אופטימי, אחרת יש השהיה מורגשת על כל לחיצה. כישלון מסנכרן בחזרה.
    setRows(rs => body.undo
      ? rs.filter(r => r.phone !== phone)
      : rs.map(r => (r.phone === phone ? { ...r, called: true } : r)));
    try {
      const res = await fetch('/api/whatsapp/call-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, ...body }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'הפעולה נכשלה');
      if (body.called && !includeCalled) setRows(rs => rs.filter(r => r.phone !== phone));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'הפעולה נכשלה');
      load();
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.icon}><Phone size={22} /></div>
          <div>
            <h1 className={styles.title}>לחייג</h1>
            <p className={styles.subtitle}>
              אנשים שסומנו מתוך השיחות. אפשר להוריד אקסל ולהעביר למי שמתקשר בפועל.
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          <a className={styles.primaryBtn}
             href={`/api/whatsapp/call-queue/xlsx?include_called=${includeCalled ? 1 : 0}`}>
            <Download size={16} /> הורדת אקסל ({rows.length})
          </a>
          <button type="button" className={styles.ghostBtn} onClick={load}>
            <RefreshCw size={16} /> רענון
          </button>
          <button type="button"
                  className={includeCalled ? styles.chipOn : styles.chip}
                  onClick={() => setIncludeCalled(v => !v)}>
            {includeCalled ? 'מציג גם שבוצעו' : 'רק שלא בוצעו'}
          </button>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.empty}>טוען…</div>
      ) : rows.length === 0 ? (
        <div className={styles.empty}>
          הרשימה ריקה. בעמוד השיחות יש כפתור טלפון על כל שיחה שמוסיף אותה לכאן.
        </div>
      ) : (
        <div className={styles.list}>
          {rows.map(r => (
            <div key={r.phone} className={`${styles.row} ${r.called ? styles.done : ''}`}>
              <div className={styles.who}>
                <Link href={`/conversations?phone=${intl(r.phone)}`} className={styles.name}>
                  {r.name || 'ללא שם'}
                </Link>
                <div className={styles.phone} dir="ltr">{local(r.phone)}</div>
                {r.note && <div className={styles.note}>{r.note}</div>}
              </div>
              <div className={styles.right}>
                <span className={styles.date}>{fmt(r.added_at)}</span>
                {/* wa.me ו-tel: פותחים את המכשיר של מי שלוחץ, וזו הכוונה:
                    הרשימה נועדה למי שמתקשר מטלפון רגיל, לא למענה מהמספר העסקי. */}
                <a className={styles.iconBtn} title="וואטסאפ" target="_blank" rel="noopener noreferrer"
                   href={`https://wa.me/${intl(r.phone)}`}>
                  <MessageCircle size={16} />
                </a>
                <a className={styles.iconBtn} title="חיוג" href={`tel:+${intl(r.phone)}`}>
                  <Phone size={16} />
                </a>
                {!r.called && (
                  <button type="button" className={styles.iconBtn} title="בוצע"
                          onClick={() => act(r.phone, { called: true })}>
                    <Check size={16} />
                  </button>
                )}
                <button type="button" className={styles.iconBtnDanger} title="הסרה מהרשימה"
                        onClick={() => act(r.phone, { undo: true })}>
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
