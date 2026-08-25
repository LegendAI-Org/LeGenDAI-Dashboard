"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, RefreshCw, Send, AlertTriangle, ChevronRight, Check, Undo2, FileText } from 'lucide-react';
import PushToggle from '@/components/PushToggle';
import styles from './ConversationsView.module.css';

// The official Cloud API number has no phone behind it: these conversations exist only
// here. Anything not answered on this page is not answered at all.

type Conversation = {
  phone: string;
  name: string;
  status: string;
  last_body: string;
  last_direction: string;
  last_at: string;
  /** null = מעולם לא כתב/ה לנו (שיחה שנפתחה רק בהודעה יוצאת, למשל גל). */
  last_inbound_at?: string | null;
  messages: number;
  window_open: boolean;
  needs_reply: boolean;
  dismissed?: boolean;
  /** מה הוא ביקש, כשהשיחה ממתינה למענה אנושי (בחירה 3/4). null = לא ממתינה. */
  needs_human?: string | null;
};

type ManualTemplate = { name: string; label: string; preview: string };

type Message = {
  id: number | string;
  idMessage: string;
  textMessage: string;
  direction: string;
  senderId: string;
  timestamp: number;
  type?: string;
  reactionTo?: string | null;
};

const POLL_MS = 3000;
// תקרה לבקשה בודדת. בלעדיה בקשה תקועה ברשת חלשה לא נכשלת ולא מסתיימת לעולם.
const REQUEST_TIMEOUT_MS = 15000;
// ה-route נופל ל-50 כשלא מבקשים, וזה הסתיר שיחות שלמות ביום עמוס:
// גל של 50 הודעות מילא את כל הרשימה ודחף החוצה את מי שחיכה לתשובה מאתמול.
const LIST_LIMIT = 300;

// The small palette offered when reacting to a lead's message (WhatsApp long-press).
const REACTION_EMOJIS = ['👍', '❤️', '😊', '🙏', '✅'];

// Re-anchor the WhatsApp "typing…" indicator at most this often while Liya types
// (Meta shows it for ~25s per call, so 10s keeps it alive without spamming the API).
const TYPING_THROTTLE_MS = 10_000;

function timeLabel(value: string | number) {
  const d = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

function localPhone(phone: string) {
  return phone.startsWith('972') ? '0' + phone.slice(3) : phone;
}

// A stable per-day key, so a separator is drawn only when the calendar day actually
// changes between two consecutive messages.
function dayKey(timestamp: number) {
  const d = new Date(timestamp * 1000);
  return isNaN(d.getTime()) ? '' : d.toDateString();
}

function dayLabel(timestamp: number) {
  const d = new Date(timestamp * 1000);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'היום';
  if (d.toDateString() === yesterday.toDateString()) return 'אתמול';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type Props = {
  /** איזה מספר העמוד מציג: meta = המספר הרשמי החדש, greenapi = המספר הישן. */
  channel?: 'meta' | 'greenapi';
  /** ארכיון: בלי מענה, בלי תבניות ובלי סימון-כטופל. תשובה יוצאת תמיד מהמספר של
      מטא, ולכן מענה מתוך שיחה של המספר הישן היה מגיע ללקוח ממספר זר ומבלבל. */
  readOnly?: boolean;
  title?: string;
};

export default function ConversationsView({ channel = 'meta', readOnly = false, title = 'שיחות וואטסאפ' }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ManualTemplate[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  // 24/08: גל של 200 הודעות יוצאות יצר 200 שיחות "יוצאת-בלבד" שהציפו את הרשימה,
  // ונגה לא מצאה את מי שבאמת כתב. ברירת המחדל היא לכן "כתבו לנו" — רק שיחות עם
  // לפחות הודעה נכנסת אחת; "הכל" קיים כצ'יפ ליד זה.
  const [view, setView] = useState<'waiting' | 'inbound' | 'all'>('inbound');
  const onlyWaiting = view === 'waiting';
  // חיפוש חי לפי שם או טלפון. חיפוש פעיל עוקף את בורר התצוגה בכוונה: לייה מחפשת
  // מספר מרשימת ה-30 — שיחה כזו היא לרוב יוצאת-בלבד ומוסתרת בתצוגת "כתבו לנו".
  const [search, setSearch] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);
  const lastTypingSent = useRef(0);

  // 25/08, המסך התקוע של נגה: AbortController לבדו לא הספיק. ב-iOS, כשאפליקציה
  // במסך הבית חוזרת מהרקע או שהרשת מתחלפת, יש fetch שנשאר תלוי לנצח ו-abort()
  // לא דוחה אותו. אם ה-finally תלוי בהבטחה הזאת הוא לא רץ, inFlight נשאר true,
  // כל פולינג הבא יוצא מיד בשורה הראשונה, ו"טוען שיחות…" נשאר על המסך לנצח —
  // בלי שום שגיאה, כי גם ה-catch לא רץ. שלוש הגנות בלתי תלויות מכאן:
  //   1. Promise.race מול טיימר. הטיימר תמיד מסתיים, גם אם ה-fetch לא.
  //   2. שומר סף בפולינג: בקשה תקועה מעל 30 שניות מבוטלת בכוח.
  //   3. כל חזרה לחזית מאפסת ומרעננת, כי בזמן ההקפאה גם הטיימרים קפואים.
  const inFlight = useRef(false);
  const inFlightSince = useRef(0);
  const loadConversations = useCallback(async () => {
    // הפולינג הוא כל 3 שניות ולא מחכה לתשובה. ברשת סלולרית איטית הבקשות
    // נערמות מהר יותר משהן חוזרות, ולכן מדלגים כשיש אחת באוויר.
    if (inFlight.current) return;
    inFlight.current = true;
    inFlightSince.current = Date.now();
    const ctl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // ה-race הזה, ולא ה-signal, הוא מה שמבטיח שה-finally ירוץ.
    const expired = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        ctl.abort();
        reject(new DOMException('timeout', 'AbortError'));
      }, REQUEST_TIMEOUT_MS);
    });
    try {
      const res = await Promise.race([
        fetch(`/api/whatsapp/conversations?channel=${channel}&limit=${LIST_LIMIT}&_ts=${Date.now()}`,
          { cache: 'no-store', signal: ctl.signal }),
        expired,
      ]);
      // גם קריאת הגוף נתקעת באותו תרחיש, ולכן היא מרוצה מול אותו טיימר.
      const data = await Promise.race([res.json(), expired]);
      if (!res.ok) throw new Error(data?.error || 'שגיאה בטעינת השיחות');
      setConversations(data.conversations || []);
      setError('');
    } catch (e: unknown) {
      const aborted = e instanceof DOMException && e.name === 'AbortError';
      setError(aborted ? 'החיבור איטי או נותק. מנסים שוב…'
                       : e instanceof Error ? e.message : 'שגיאה בטעינת השיחות');
    } finally {
      if (timer) clearTimeout(timer);
      inFlight.current = false;
      setLoadingList(false);
    }
  }, [channel]);

  const loadThread = useCallback(async (phone: string) => {
    try {
      const res = await fetch(`/api/whatsapp?phone=${encodeURIComponent(phone)}&channel=${channel}&_ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    }
  }, [channel]);

  useEffect(() => {
    loadConversations();
    const t = setInterval(() => {
      // האפליקציה ברקע: iOS מקפיא את ה-JS ממילא, וטיק שכן מצליח לרוץ רק שורף
      // סוללה וחבילת גלישה על רשימה של רבע מגה. מרעננים כשחוזרים.
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      // שומר סף: אם בקשה תקועה יותר מפעמיים התקרה, ה-finally שלה לא ירוץ לעולם.
      // משחררים את הדגל בכוח, אחרת המסך נעול על "טוען שיחות…" עד רענון ידני.
      if (inFlight.current && Date.now() - inFlightSince.current > REQUEST_TIMEOUT_MS * 2) {
        inFlight.current = false;
        setLoadingList(false);
        setError('החיבור נתקע. מנסים שוב…');
      }
      loadConversations();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [loadConversations]);

  // חזרה לחזית / חזרה של הרשת. בלי זה נגה פותחת את האפליקציה ורואה בדיוק את
  // המסך שנתקע לפני שעה, כי כל הטיימרים היו קפואים יחד עם הבקשה.
  useEffect(() => {
    const revive = () => {
      if (document.visibilityState !== 'visible') return;
      inFlight.current = false;
      loadConversations();
    };
    document.addEventListener('visibilitychange', revive);
    window.addEventListener('focus', revive);
    window.addEventListener('online', revive);
    return () => {
      document.removeEventListener('visibilitychange', revive);
      window.removeEventListener('focus', revive);
      window.removeEventListener('online', revive);
    };
  }, [loadConversations]);

  // The allowed list is short and never changes during a session, so fetch it once.
  // Failing quietly is right: the picker simply does not appear, and the rest of the
  // page keeps working.
  useEffect(() => {
    fetch('/api/whatsapp/template')
      .then(r => r.json())
      .then(d => setTemplates(d?.templates || []))
      .catch(() => {});
  }, []);

  // Tapping a push notification lands here with ?phone=…: open that thread straight away,
  // otherwise the alert only gets Liya to the list and she still has to hunt for the lead.
  // Once, on the first load that has the conversation — not on every poll.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || conversations.length === 0) return;
    const phone = new URLSearchParams(window.location.search).get('phone');
    if (!phone) {
      deepLinked.current = true;
      return;
    }
    const match = conversations.find(c => c.phone === phone);
    if (match) {
      deepLinked.current = true;
      setSelected(match);
      window.history.replaceState(null, '', '/conversations');
    }
  }, [conversations]);

  // Keep the open thread fresh too, so a reply that arrives while Liya is reading it
  // shows up without her having to click away and back.
  useEffect(() => {
    if (!selected) return;
    prevMsgCount.current = 0; // switching threads -> next load scrolls to the latest
    loadThread(selected.phone);
    const t = setInterval(() => loadThread(selected.phone), POLL_MS);
    return () => clearInterval(t);
  }, [selected, loadThread]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const grew = messages.length > prevMsgCount.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    // Jump to the latest on first load of a thread, or when a new message arrives while
    // she's already at the bottom — but never yank her down while she scrolls up history.
    if (prevMsgCount.current === 0 || (grew && nearBottom)) {
      el.scrollTo({ top: el.scrollHeight });
    }
    prevMsgCount.current = messages.length;
  }, [messages]);

  const send = async () => {
    if (!selected || !draft.trim() || sending) return;
    const text = draft.trim();
    setSending(true);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: selected.phone, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'השליחה נכשלה');
      setDraft('');
      await loadThread(selected.phone);
      loadConversations();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'השליחה נכשלה');
    } finally {
      setSending(false);
    }
  };

  // Clears the red "waiting" flag without answering — some conversations genuinely need
  // no reply, and leaving them lit makes the whole list stop meaning anything. The CRM
  // stores a timestamp, so a newer message from the same person lights it up again.
  const dismiss = async (conv: Conversation, undo = false) => {
    setConversations(cs => cs.map(c =>
      c.phone === conv.phone ? { ...c, needs_reply: undo, dismissed: !undo } : c));
    try {
      const res = await fetch('/api/whatsapp/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: conv.phone, undo }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'הפעולה נכשלה');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'הפעולה נכשלה');
      loadConversations();   // the optimistic row was wrong — resync
    }
  };

  const sendTemplate = async (name: string) => {
    if (!selected || sending) return;
    setSending(true);
    setTemplateOpen(false);
    try {
      const res = await fetch('/api/whatsapp/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selected.phone, template: name,
          firstName: (selected.name || '').split(' ')[0],
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.status !== 'sent') {
        throw new Error(data?.error || data?.detail || 'שליחת התבנית נכשלה');
      }
      await loadThread(selected.phone);
      loadConversations();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שליחת התבנית נכשלה');
    } finally {
      setSending(false);
    }
  };

  // Reactions are stored as their own rows carrying the target's wamid; fold them
  // into a map (last one wins, like WhatsApp) and keep only real bubbles in the list.
  const reactionsByTarget = new Map<string, string>();
  for (const m of messages) {
    if (m.type === 'reaction' && m.reactionTo) {
      if (m.textMessage) reactionsByTarget.set(m.reactionTo, m.textMessage);
      else reactionsByTarget.delete(m.reactionTo);
    }
  }
  const visibleMessages = messages.filter(m => m.type !== 'reaction');

  const sendReaction = async (msg: Message, emoji: string) => {
    if (!selected) return;
    setPickerFor(null);
    try {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selected.phone,
          reaction: { messageId: msg.idMessage, emoji },
        }),
      });
      await loadThread(selected.phone);
    } catch {}
  };

  // Shows "typing…" on the lead's WhatsApp while Liya types. Anchored to the last
  // inbound message (the API requires it); silently does nothing on a thread where
  // the lead never wrote. Fire-and-forget — the composer must never wait on it.
  const notifyTyping = () => {
    const now = Date.now();
    if (now - lastTypingSent.current < TYPING_THROTTLE_MS) return;
    const lastInbound = [...messages].reverse().find(m => m.direction === 'inbound' && m.type !== 'reaction');
    if (!lastInbound?.idMessage) return;
    lastTypingSent.current = now;
    fetch('/api/whatsapp/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: lastInbound.idMessage }),
    }).catch(() => {});
  };

  const waiting = conversations.filter(c => c.needs_reply).length;
  const wrote = conversations.filter(c => !!c.last_inbound_at);
  const query = search.trim().toLowerCase();
  const queryDigits = query.replace(/\D/g, '').replace(/^(972|0)/, '');
  const visibleConversations = query
    ? conversations.filter(c =>
        (c.name || '').toLowerCase().includes(query) ||
        (queryDigits !== '' && c.phone.includes(queryDigits)))
    : view === 'waiting' ? conversations.filter(c => c.needs_reply)
    : view === 'inbound' ? wrote
    : conversations;

  return (
    <div className={styles.page} dir="rtl">
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>
            <MessageSquare size={22} /> {title}
          </h1>
          {/* המונה הוא גם המסנן: הוא כבר מספר כמה שיחות דורשות טיפול, ולחיצה עליו
              מצמצמת את הרשימה בדיוק אליהן. כפתור נפרד היה חוזר על אותו מידע. */}
          <button
            type="button"
            onClick={() => waiting > 0 && setView(v => v === 'waiting' ? 'inbound' : 'waiting')}
            disabled={waiting === 0}
            className={`${styles.subtitle} ${waiting > 0 ? styles.subtitleAlert : ''} ${onlyWaiting ? styles.filterOn : ''}`}
          >
            {waiting > 0 && <span className={styles.dot} />}
            {waiting > 0
              ? (onlyWaiting ? ` מציג ${waiting} ממתינות — להצגת הכל` : ` ${waiting} שיחות ממתינות לתשובה`)
              : 'אין שיחות שממתינות לתשובה'}
          </button>
        </div>
        <div className={styles.headerActions}>
          {!readOnly && <PushToggle />}
          <button className={styles.refresh} onClick={loadConversations} title="רענון">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {error && <div className={styles.error}><AlertTriangle size={16} /> {error}</div>}

      {waiting > 0 && !selected && (
        <button
          type="button"
          className={`${styles.waitingBar} ${onlyWaiting ? styles.filterOn : ''}`}
          onClick={() => setView(v => v === 'waiting' ? 'inbound' : 'waiting')}
        >
          <span className={styles.dot} />
          {onlyWaiting ? `מציג ${waiting} ממתינות — להצגת הכל` : `${waiting} שיחות ממתינות לתשובה`}
        </button>
      )}

      {!selected && (
        <div className={styles.viewChips}>
          <div className={styles.searchBox}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם או טלפון…"
              className={styles.searchInput}
              dir="rtl"
            />
            {search && (
              <button type="button" className={styles.searchClear} onClick={() => setSearch('')} aria-label="ניקוי חיפוש">
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            className={view === 'inbound' && !query ? styles.chipOn : styles.chip}
            onClick={() => { setSearch(''); setView('inbound'); }}
          >
            כתבו לנו ({wrote.length})
          </button>
          <button
            type="button"
            className={view === 'all' && !query ? styles.chipOn : styles.chip}
            onClick={() => { setSearch(''); setView('all'); }}
          >
            הכל ({conversations.length})
          </button>
        </div>
      )}

      <div className={`${styles.layout} ${selected ? styles.threadOpen : ''}`}>
        <aside className={styles.list}>
          {loadingList && <div className={styles.empty}>טוען שיחות…</div>}
          {!loadingList && visibleConversations.length === 0 && (
            <div className={styles.empty}>
              {query ? 'לא נמצאו תוצאות — נסי שם אחר או ספרות מהטלפון'
                : view === 'waiting' ? 'אין שיחות שממתינות לתשובה'
                : view === 'inbound' ? 'עוד לא כתבו לנו — "הכל" מציג גם את מי שרק קיבל הודעה'
                : 'עדיין אין שיחות במספר החדש'}
            </div>
          )}
          {visibleConversations.map(c => (
            // עטיפה ולא כפתור אחד: כפתור "סימון כטופל" חייב להיות אח ולא צאצא —
            // כפתור בתוך כפתור אינו HTML תקין ודפדפנים מתעלמים מהלחיצה הפנימית.
            <div
              key={c.phone}
              className={`${styles.itemWrap} ${selected?.phone === c.phone ? styles.itemActive : ''}`}
            >
              <button onClick={() => setSelected(c)} className={styles.item}>
                <div className={styles.itemTop}>
                  <span className={styles.itemNameWrap}>
                    {c.needs_reply && <span className={styles.dot} />}
                    <span className={styles.itemName}>{c.name || localPhone(c.phone)}</span>
                  </span>
                  <span className={styles.itemTime}>{timeLabel(c.last_at)}</span>
                </div>
                <div className={styles.itemPreview}>
                  {c.last_direction === 'outbound' && <span className={styles.you}>את: </span>}
                  {c.last_body}
                </div>
                {c.needs_human ? (
                  // תווית ספציפית ולא "ממתין לתשובה" גנרי: השיחה הזו כבר קיבלה מענה
                  // אוטומטי, ומה שנשאר הוא בדיוק מה שהוא ביקש שיחזרו אליו עליו.
                  <span className={styles.badgeHuman}>{c.needs_human}</span>
                ) : c.needs_reply ? (
                  <span className={styles.badge}>ממתין לתשובה</span>
                ) : null}
                {!c.needs_reply && c.dismissed && (
                  <span className={styles.badgeMuted}>סומן כטופל</span>
                )}
              </button>
              {!readOnly && (c.needs_reply ? (
                <button
                  className={styles.dismissBtn}
                  onClick={() => dismiss(c)}
                  title="סימון כטופל — מסיר את החיווי בלי לענות"
                  aria-label="סימון כטופל"
                >
                  <Check size={15} />
                </button>
              ) : c.dismissed && (
                <button
                  className={styles.dismissBtn}
                  onClick={() => dismiss(c, true)}
                  title="ביטול הסימון"
                  aria-label="ביטול הסימון"
                >
                  <Undo2 size={15} />
                </button>
              ))}
            </div>
          ))}
        </aside>

        <section className={styles.thread}>
          {!selected && <div className={styles.empty}>בחרי שיחה מהרשימה</div>}

          {selected && (
            <>
              <div className={styles.threadHeader}>
                <div className={styles.threadHeaderStart}>
                  <button
                    className={styles.backBtn}
                    onClick={() => setSelected(null)}
                    aria-label="חזרה לרשימת השיחות"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <div>
                    <div className={styles.threadName}>{selected.name || 'ללא שם'}</div>
                    <div className={styles.threadPhone}>{localPhone(selected.phone)}</div>
                  </div>
                </div>
                {selected.status && <span className={styles.statusChip}>{selected.status}</span>}
              </div>

              <div className={styles.messages} ref={threadRef}>
                {visibleMessages.map((m, i) => {
                  const showDate = i === 0 || dayKey(m.timestamp) !== dayKey(visibleMessages[i - 1].timestamp);
                  const reaction = reactionsByTarget.get(m.idMessage);
                  return (
                    <Fragment key={m.id}>
                      {showDate && (
                        <div className={styles.dateSeparator}>
                          <span>{dayLabel(m.timestamp)}</span>
                        </div>
                      )}
                      <div
                        className={`${styles.bubble} ${m.direction === 'outbound' ? styles.mine : styles.theirs} ${reaction ? styles.hasReaction : ''}`}
                        onClick={() => {
                          if (m.direction === 'inbound' && m.idMessage) {
                            setPickerFor(pickerFor === m.idMessage ? null : m.idMessage);
                          }
                        }}
                      >
                        <div className={styles.bubbleText}>{m.textMessage}</div>
                        <div className={styles.bubbleTime}>{timeLabel(m.timestamp)}</div>
                        {reaction && <span className={styles.reactionChip}>{reaction}</span>}
                      </div>
                      {pickerFor === m.idMessage && (
                        <div className={`${styles.emojiPicker} ${m.direction === 'outbound' ? styles.mine : styles.theirs}`}>
                          {REACTION_EMOJIS.map(e => (
                            <button key={e} className={styles.emojiBtn} onClick={() => sendReaction(m, e)}>
                              {e}
                            </button>
                          ))}
                          {reaction && (
                            <button className={styles.emojiBtn} onClick={() => sendReaction(m, '')} title="הסרת תגובה">
                              ✕
                            </button>
                          )}
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>

              {/* Meta allows free text only for 24h after the person last wrote. Once that
                  closes, the only legal way back in is an approved template, so the box is
                  disabled rather than letting a send fail with a cryptic 131047. */}
              {readOnly ? (
                <div className={styles.closedWindow}>
                  <AlertTriangle size={16} />
                  ארכיון המספר הישן — לקריאה בלבד. מענה ללקוח יוצא מהעמוד "שיחות וואטסאפ".
                </div>
              ) : selected.window_open ? (
                <div className={styles.composer}>
                  <textarea
                    className={styles.input}
                    value={draft}
                    onChange={e => { setDraft(e.target.value); if (e.target.value) notifyTyping(); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                    }}
                    placeholder="כתבי תשובה…"
                    rows={2}
                  />
                  <button className={styles.sendBtn} onClick={send} disabled={sending || !draft.trim()}>
                    <Send size={18} />
                    {sending ? 'שולח…' : 'שליחה'}
                  </button>
                </div>
              ) : (
                <div className={styles.closedWrap}>
                  <div className={styles.closedWindow}>
                    <AlertTriangle size={16} />
                    חלון 24 השעות נסגר. אפשר לשלוח תבנית מאושרת, וברגע שיענו החלון ייפתח מחדש.
                  </div>
                  {templates.length > 0 && (
                    <>
                      <button
                        className={styles.templateBtn}
                        onClick={() => setTemplateOpen(o => !o)}
                        disabled={sending}
                      >
                        <FileText size={16} />
                        {sending ? 'שולח…' : 'שליחת תבנית'}
                      </button>
                      {templateOpen && (
                        <div className={styles.templateList}>
                          {templates.map(t => (
                            <button
                              key={t.name}
                              className={styles.templateItem}
                              onClick={() => sendTemplate(t.name)}
                            >
                              <span className={styles.templateLabel}>{t.label}</span>
                              <span className={styles.templatePreview}>
                                {t.preview.replace('{שם}', (selected.name || '').split(' ')[0] || 'שלום')}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
