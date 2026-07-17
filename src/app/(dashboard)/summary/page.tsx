import styles from './page.module.css';
import { ListChecks } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import PeriodFilter from '@/components/PeriodFilter';
import SummaryCards, { LeadRow, MeetingRow, PayerRow } from '@/components/SummaryCards';

function leadName(l: { name?: string; form_data?: Record<string, string> }): string {
  if (l.name && l.name !== 'ללא שם') return l.name;
  const fd = l.form_data || {};
  const first = fd['שם פרטי'] || '';
  const last = fd['שם משפחה'] || '';
  return `${first} ${last}`.trim() || 'ללא שם';
}

// Frontend-only canonicalization of the messy multi-language status field that has
// accumulated in Supabase over time (English/Hebrew variants from different code
// paths). Doesn't touch any stored data — safe to refine later without a migration.
const STATUS_GROUPS: Record<string, string> = {
  'ליד חדש': 'ליד חדש', 'New Lead': 'ליד חדש', 'חדש': 'ליד חדש',
  'נשלחה הודעה': 'נשלחה הודעה', 'sent message': 'נשלחה הודעה',
  'מחכה לתשובה': 'מחכה לתשובה',
  'ענה': 'ענה',
  'קיבל מידע נוסף': 'קיבל מידע נוסף',
  'נשלח פולו-אפ 24ש': 'פולו-אפ נשלח', 'נשלח פולו-אפ 48ש': 'פולו-אפ נשלח',
  'פגישה נקבעה': 'נקבעה פגישה', 'Meeting Booked': 'נקבעה פגישה', 'נשלחה תזכורת פגישה': 'נקבעה פגישה',
  'נרשם לכנס': 'נרשם לכנס',
  'נוטש כנס': 'נטש כנס',
};

function canonicalStatus(raw?: string | null): string {
  if (!raw) return 'לא ידוע';
  return STATUS_GROUPS[raw] ?? 'אחר';
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function resolveDateRange(range?: string, from?: string, to?: string): { fromDate: string; toDate: string; label: string } {
  if (from && to) {
    return { fromDate: from, toDate: to, label: `${from} — ${to}` };
  }
  const today = todayStr();
  switch (range) {
    case 'today':
      return { fromDate: today, toDate: today, label: 'היום' };
    case '14':
      return { fromDate: daysAgoStr(13), toDate: today, label: '14 יום אחרונים' };
    case '30':
      return { fromDate: daysAgoStr(29), toDate: today, label: '30 יום אחרונים' };
    case 'all':
      return { fromDate: '2020-01-01', toDate: today, label: 'כל הזמנים' };
    default:
      return { fromDate: daysAgoStr(6), toDate: today, label: '7 ימים אחרונים' };
  }
}

type MorningSummary = {
  status: string;
  revenue?: number;
  registrations?: number;
  documentCount?: number;
  payers?: PayerRow[];
  reason?: string;
};

async function fetchMorningSummary(fromDate: string, toDate: string): Promise<MorningSummary> {
  const baseUrl = process.env.CRM_AUTOMATION_HUB_URL;
  const apiKey = process.env.DASHBOARD_API_KEY;
  if (!baseUrl || !apiKey) {
    return { status: 'error', reason: 'missing_config' };
  }
  try {
    const url = `${baseUrl}/api/noga-morning-summary?from_date=${fromDate}&to_date=${toDate}&key=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return { status: 'error', reason: `http_${res.status}` };
    }
    return await res.json();
  } catch {
    return { status: 'error', reason: 'network_error' };
  }
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { range, from, to } = await searchParams;
  const { fromDate, toDate, label } = resolveDateRange(range, from, to);

  const supabase = await createClient();

  // Pipeline metrics — from Supabase (reliable, already synced live from Airtable).
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('client_id', '3_noga')
    .gte('created_at', `${fromDate}T00:00:00Z`)
    .lte('created_at', `${toDate}T23:59:59Z`)
    .order('created_at', { ascending: false });

  const totalLeads = leads?.length || 0;

  const statusCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  let scheduledMeetings = 0;

  for (const lead of leads || []) {
    const status = canonicalStatus(lead.status);
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    if (status === 'נקבעה פגישה') scheduledMeetings += 1;

    const source = lead.source || 'לא ידוע';
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  }

  const sortedStatuses = [...statusCounts.entries()].sort((a, b) => b[1] - a[1]);
  const sortedSources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]);

  // Lists for the click-to-expand drill-down under each card.
  const leadsList: LeadRow[] = (leads || []).map(l => ({
    name: leadName(l), phone: l.phone || '', status: canonicalStatus(l.status), date: l.created_at || '',
  }));
  const meetingsList: MeetingRow[] = (leads || [])
    .filter(l => canonicalStatus(l.status) === 'נקבעה פגישה')
    .map(l => ({ name: leadName(l), phone: l.phone || '', date: l.created_at || '' }));

  // Money & registrations — sourced live from Morning (Green Invoice), not from lead
  // records. Lead<->invoice matching by phone/email was verified unreliable (~1/34).
  const morning = await fetchMorningSummary(fromDate, toDate);
  const morningOk = morning.status === 'ok';
  const payersList: PayerRow[] = morning.payers || [];

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>סיכום תקופתי</h1>
          <p className={styles.subtitle}>מה קרה בעסק שלך — {label}</p>
        </div>
        <PeriodFilter />
      </header>

      <SummaryCards
        totalLeads={totalLeads}
        revenue={morning.revenue || 0}
        registrations={morning.registrations || 0}
        scheduledMeetings={scheduledMeetings}
        morningOk={morningOk}
        morningReason={morning.reason}
        leadsList={leadsList}
        meetingsList={meetingsList}
        payersList={payersList}
      />

      <div className={styles.contentGrid}>
        <div className={`glass-card ${styles.panel}`}>
          <h2 className={styles.panelTitle}>
            <ListChecks size={18} style={{ verticalAlign: 'middle', marginLeft: '0.5rem' }} />
            סטטוס טיפול
          </h2>
          {sortedStatuses.length > 0 ? (
            sortedStatuses.map(([status, count]) => (
              <div key={status} className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>{status}</span>
                <span className={styles.breakdownValue}>{count}</span>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>אין לידים בתקופה שנבחרה</div>
          )}
        </div>

        <div className={`glass-card ${styles.panel}`}>
          <h2 className={styles.panelTitle}>מקור ליד</h2>
          {sortedSources.length > 0 ? (
            sortedSources.map(([source, count]) => (
              <div key={source} className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>{source}</span>
                <span className={styles.breakdownValue}>{count}</span>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>אין לידים בתקופה שנבחרה</div>
          )}
        </div>
      </div>
    </div>
  );
}
