"use client";

import { useState } from 'react';
import { Users, DollarSign, UserCheck, Calendar, ChevronDown } from 'lucide-react';
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

  const toggle = (key: CardKey) => setOpen(prev => (prev === key ? null : key));
  const fmtDate = (d: string) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '');

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
              title="לידים חדשים בתקופה"
              rows={leadsList.map(l => ({ main: l.name || 'ללא שם', sub: l.phone, tag: l.status, side: fmtDate(l.date) }))}
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
              title="פגישות שנקבעו"
              rows={meetingsList.map(m => ({ main: m.name || 'ללא שם', sub: m.phone, tag: '', side: fmtDate(m.date) }))}
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
}: {
  title: string;
  rows: { main: string; sub: string; tag: string; side: string }[];
  empty: string;
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
          {rows.map((r, i) => (
            <div key={i} className={styles.drillRow}>
              <div>
                <div className={styles.drillMain}>{r.main}</div>
                {r.sub && <div className={styles.drillSub}>{r.sub}</div>}
              </div>
              <div className={styles.drillRight}>
                {r.tag && <span className={styles.drillTag}>{r.tag}</span>}
                {r.side && <span className={styles.drillSide}>{r.side}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
