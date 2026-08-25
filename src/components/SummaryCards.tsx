"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, DollarSign, UserCheck, Calendar, ChevronDown, Check } from 'lucide-react';
import styles from '../app/(dashboard)/summary/page.module.css';

export type LeadRow = { name: string; phone: string; status: string; date: string };
export type MeetingRow = { name: string; phone: string; date: string };
export type PayerRow = { name: string; amount: number; date: string };

type CardKey = 'leads' | 'payers' | 'meetings';

export default function SummaryCards({
  totalLeads,
  revenue,
  registrations,
  scheduledMeetings,
  morningOk,
  morningReason,
  leadsList,
  meetingsList,
  payersList,
}: {
  totalLeads: number;
  revenue: number;
  registrations: number;
  scheduledMeetings: number;
  morningOk: boolean;
  morningReason?: string;
  leadsList: LeadRow[];
  meetingsList: MeetingRow[];
  payersList: PayerRow[];
}) {
  const [open, setOpen] = useState<CardKey | null>(null);

  // 25/08, בקשת איתי: לייה מסמנת אנשים להתקשר אליהם גם מכאן ולא רק מעמוד
  // השיחות — היא עוברת על הסיכום היומי ומסמנת תוך כדי. אותה רשימה בדיוק,
  // ולכן סימון כאן מופיע שם ולהפך.
  const [queued, setQueued] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch('/api/whatsapp/call-queue', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setQueued(new Set(((d.rows || []) as { phone: string }[]).map(r => r.phone))))
      .catch(() => {});   // נכשל בשקט: הכפתורים פשוט יופיעו כלא-מסומנים
  }, []);

  const toggleCall = async (phone: string, name: string) => {
    const d = (phone || '').replace(/\D/g, '');
    const intl = d.startsWith('972') ? d : `972${d.replace(/^0/, '')}`;
    const on = queued.has(intl);
    setQueued(q => {
      const next = new Set(q);
      if (on) next.delete(intl); else next.add(intl);
      return next;
    });
    try {
      const res = await fetch('/api/whatsapp/call-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: intl, name, undo: on }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      setQueued(q => {                       // הסימון האופטימי היה שגוי
        const next = new Set(q);
        if (on) next.add(intl); else next.delete(intl);
        return next;
      });
    }
  };
  const isQueued = (phone: string) => {
    const d = (phone || '').replace(/\D/g, '');
    return queued.has(d.startsWith('972') ? d : `972${d.replace(/^0/, '')}`);
  };

  const toggle = (key: CardKey) => setOpen(prev => (prev === key ? null : key));
  const fmtDate = (d: string) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '');
  // 25/08, בקשת איתי: לחיצה על ליד פותחת את השיחה איתו. עד עכשיו השורות האלה
  // היו מתות — לייה ראתה שם וטלפון וצריכה הייתה לעבור לעמוד השיחות ולחפש ידנית.
  // עמוד השיחות כבר יודע לקבל ?phone= (הוא נבנה עבור לחיצה על התראת פוש).
  const chatHref = (phone: string) => {
    const d = (phone || '').replace(/\D/g, '');
    if (!d) return undefined;
    return `/conversations?phone=${d.startsWith('972') ? d : `972${d.replace(/^0/, '')}`}`;
  };

  return (
    <>
      <div className={styles.statsGrid}>
        <button
          type="button"
          className={`glass-card ${styles.statCard} ${styles.clickable} ${open === 'leads' ? styles.active : ''}`}
          onClick={() => toggle('leads')}
        >
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}>
              <Users size={24} />
            </div>
            <span className={styles.statLabel}>לידים חדשים</span>
            <ChevronDown size={16} className={`${styles.chevron} ${open === 'leads' ? styles.chevronOpen : ''}`} />
          </div>
          <div className={styles.statValue}>{totalLeads}</div>
          <div className={styles.statNote}>לחיצה לרשימה המלאה</div>
        </button>

        <button
          type="button"
          className={`glass-card ${styles.statCard} ${styles.clickable} ${open === 'payers' ? styles.active : ''}`}
          onClick={() => morningOk && toggle('payers')}
        >
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <DollarSign size={24} />
            </div>
            <span className={styles.statLabel}>הכנסה מאומתת (מורנינג)</span>
            {morningOk && <ChevronDown size={16} className={`${styles.chevron} ${open === 'payers' ? styles.chevronOpen : ''}`} />}
          </div>
          {morningOk ? (
            <>
              <div className={styles.statValue}>₪{revenue.toLocaleString()}</div>
              <div className={styles.statNote}>לחיצה לפירוט המשלמים</div>
            </>
          ) : (
            <div className={styles.errorNote}>לא זמין כרגע ({morningReason})</div>
          )}
        </button>

        <button
          type="button"
          className={`glass-card ${styles.statCard} ${styles.clickable} ${open === 'payers' ? styles.active : ''}`}
          onClick={() => morningOk && toggle('payers')}
        >
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(96, 165, 250, 0.1)', color: 'var(--accent-secondary)' }}>
              <UserCheck size={24} />
            </div>
            <span className={styles.statLabel}>נרשמו ושילמו</span>
            {morningOk && <ChevronDown size={16} className={`${styles.chevron} ${open === 'payers' ? styles.chevronOpen : ''}`} />}
          </div>
          {morningOk ? <div className={styles.statValue}>{registrations}</div> : <div className={styles.errorNote}>לא זמין</div>}
          <div className={styles.statNote}>לחיצה לרשימה</div>
        </button>

        <button
          type="button"
          className={`glass-card ${styles.statCard} ${styles.clickable} ${open === 'meetings' ? styles.active : ''}`}
          onClick={() => toggle('meetings')}
        >
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <Calendar size={24} />
            </div>
            <span className={styles.statLabel}>פגישות שנקבעו</span>
            <ChevronDown size={16} className={`${styles.chevron} ${open === 'meetings' ? styles.chevronOpen : ''}`} />
          </div>
          <div className={styles.statValue}>{scheduledMeetings}</div>
          <div className={styles.statNote}>לחיצה לרשימה</div>
        </button>
      </div>

      {open && (
        <div className={`glass-card ${styles.drillPanel}`}>
          {open === 'leads' && (
            <DrillList
              onToggleCall={toggleCall}
              isQueued={isQueued}
              title="לידים חדשים בתקופה"
              rows={leadsList.map(l => ({ main: l.name || 'ללא שם', sub: l.phone, tag: l.status, side: fmtDate(l.date), href: chatHref(l.phone) }))}
              empty="אין לידים בתקופה שנבחרה"
            />
          )}
          {open === 'payers' && (
            <DrillList
              title="מי נרשם ושילם (מורנינג)"
              rows={payersList.map(p => ({ main: p.name, sub: fmtDate(p.date), tag: '', side: `₪${p.amount.toLocaleString()}` }))}
              empty="אין תשלומים בתקופה שנבחרה"
            />
          )}
          {open === 'meetings' && (
            <DrillList
              onToggleCall={toggleCall}
              isQueued={isQueued}
              title="פגישות שנקבעו"
              rows={meetingsList.map(m => ({ main: m.name || 'ללא שם', sub: m.phone, tag: '', side: fmtDate(m.date), href: chatHref(m.phone) }))}
              empty="אין פגישות בתקופה שנבחרה"
            />
          )}
        </div>
      )}
    </>
  );
}

function DrillList({
  title,
  rows,
  empty,
  onToggleCall,
  isQueued,
}: {
  title: string;
  rows: { main: string; sub: string; tag: string; side: string; href?: string }[];
  empty: string;
  onToggleCall?: (phone: string, name: string) => void;
  isQueued?: (phone: string) => boolean;
}) {
  return (
    <>
      <div className={styles.drillHeader}>
        <h3 className={styles.panelTitle} style={{ margin: 0 }}>{title}</h3>
        <span className={styles.drillCount}>{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div className={styles.emptyState}>{empty}</div>
      ) : (
        <div className={styles.drillRows}>
          {rows.map((r, i) => {
            const inner = (
              <>
                <div>
                  <div className={styles.drillMain}>{r.main}</div>
                  {r.sub && <div className={styles.drillSub}>{r.sub}</div>}
                </div>
                <div className={styles.drillRight}>
                  {r.tag && <span className={styles.drillTag}>{r.tag}</span>}
                  {r.side && <span className={styles.drillSide}>{r.side}</span>}
                </div>
              </>
            );
            // בלי טלפון אין למה לקשר, ושורה שנראית לחיצה ולא עושה כלום גרועה
            // משורה שלא נראית לחיצה בכלל. תשלומים למשל מגיעים בלי טלפון.
            // כפתור ה-וי יושב *מחוץ* לקישור ולא בתוכו: קישור עוטף בולע את
            // הלחיצה ומנווט לצ'אט במקום לסמן, וזה בדיוק סוג הבאג שמתגלה רק
            // אצל המשתמש. לכן השורה מחולקת לשניים.
            const mark = onToggleCall && r.sub ? (
              <button
                type="button"
                className={`${styles.markBtn} ${isQueued?.(r.sub) ? styles.markOn : ''}`}
                onClick={() => onToggleCall(r.sub, r.main)}
                title={isQueued?.(r.sub) ? 'ברשימת החיוג — לחיצה מסירה' : 'הוספה לרשימת החיוג'}
                aria-label="רשימת חיוג"
              >
                <Check size={15} />
              </button>
            ) : null;
            return (
              <div key={i} className={styles.drillRowWrap}>
                {r.href ? (
                  <Link href={r.href} className={`${styles.drillRow} ${styles.drillRowLink} ${styles.drillRowGrow}`}>
                    {inner}
                  </Link>
                ) : (
                  <div className={`${styles.drillRow} ${styles.drillRowGrow}`}>{inner}</div>
                )}
                {mark}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
