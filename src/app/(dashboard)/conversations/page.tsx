"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, RefreshCw, Send, AlertTriangle, ChevronRight } from 'lucide-react';
import styles from './page.module.css';

// The official Cloud API number has no phone behind it: these conversations exist only
// here. Anything not answered on this page is not answered at all.

type Conversation = {
  phone: string;
  name: string;
  status: string;
  last_body: string;
  last_direction: string;
  last_at: string;
  messages: number;
  window_open: boolean;
  needs_reply: boolean;
};

type Message = {
  id: number | string;
  textMessage: string;
  direction: string;
  senderId: string;
  timestamp: number;
};

const POLL_MS = 3000;

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

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/whatsapp/conversations?_ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'שגיאה בטעינת השיחות');
      setConversations(data.conversations || []);
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת השיחות');
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadThread = useCallback(async (phone: string) => {
    try {
      const res = await fetch(`/api/whatsapp?phone=${encodeURIComponent(phone)}&_ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const t = setInterval(loadConversations, POLL_MS);
    return () => clearInterval(t);
  }, [loadConversations]);

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

  const waiting = conversations.filter(c => c.needs_reply).length;

  return (
    <div className={styles.page} dir="rtl">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <MessageSquare size={22} /> שיחות וואטסאפ
          </h1>
          <p className={`${styles.subtitle} ${waiting > 0 ? styles.subtitleAlert : ''}`}>
            {waiting > 0 && <span className={styles.dot} />}
            {waiting > 0 ? ` ${waiting} שיחות ממתינות לתשובה` : 'אין שיחות שממתינות לתשובה'}
          </p>
        </div>
        <button className={styles.refresh} onClick={loadConversations} title="רענון">
          <RefreshCw size={18} />
        </button>
      </header>

      {error && <div className={styles.error}><AlertTriangle size={16} /> {error}</div>}

      {waiting > 0 && !selected && (
        <div className={styles.waitingBar}>
          <span className={styles.dot} />
          {waiting} שיחות ממתינות לתשובה
        </div>
      )}

      <div className={`${styles.layout} ${selected ? styles.threadOpen : ''}`}>
        <aside className={styles.list}>
          {loadingList && <div className={styles.empty}>טוען שיחות…</div>}
          {!loadingList && conversations.length === 0 && (
            <div className={styles.empty}>עדיין אין שיחות במספר החדש</div>
          )}
          {conversations.map(c => (
            <button
              key={c.phone}
              onClick={() => setSelected(c)}
              className={`${styles.item} ${selected?.phone === c.phone ? styles.itemActive : ''}`}
            >
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
              {c.needs_reply && <span className={styles.badge}>ממתין לתשובה</span>}
            </button>
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
                {messages.map((m, i) => {
                  const showDate = i === 0 || dayKey(m.timestamp) !== dayKey(messages[i - 1].timestamp);
                  return (
                    <Fragment key={m.id}>
                      {showDate && (
                        <div className={styles.dateSeparator}>
                          <span>{dayLabel(m.timestamp)}</span>
                        </div>
                      )}
                      <div
                        className={`${styles.bubble} ${m.direction === 'outbound' ? styles.mine : styles.theirs}`}
                      >
                        <div className={styles.bubbleText}>{m.textMessage}</div>
                        <div className={styles.bubbleTime}>{timeLabel(m.timestamp)}</div>
                      </div>
                    </Fragment>
                  );
                })}
              </div>

              {/* Meta allows free text only for 24h after the person last wrote. Once that
                  closes, the only legal way back in is an approved template, so the box is
                  disabled rather than letting a send fail with a cryptic 131047. */}
              {selected.window_open ? (
                <div className={styles.composer}>
                  <textarea
                    className={styles.input}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
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
                <div className={styles.closedWindow}>
                  <AlertTriangle size={16} />
                  חלון 24 השעות נסגר. אי אפשר לכתוב הודעה חופשית עד שהאדם יכתוב שוב.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
