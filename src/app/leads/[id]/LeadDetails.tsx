"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, Phone, Mail, FileText, Bot, MessageCircle } from 'lucide-react';
import styles from '@/components/LeadModal.module.css';
import ChatMessageMenu from '@/components/ChatMessageMenu';

interface ChatMessage {
  id?: string;
  idMessage: string;
  textMessage: string;
  senderId: string;
  timestamp: number;
  direction: 'inbound' | 'outbound';
  deletedForEveryone?: boolean;
}

// GreenAPI/WhatsApp only allow deleting a sent message "for everyone" within
// roughly an hour of sending — mirror that in the UI so the option doesn't
// appear for messages the server would reject anyway.
const DELETE_FOR_EVERYONE_WINDOW_SEC = 60 * 60;
const canDeleteForEveryone = (msg: ChatMessage) =>
  msg.direction === 'outbound' &&
  !!msg.id &&
  !msg.deletedForEveryone &&
  (Date.now() / 1000 - msg.timestamp) < DELETE_FOR_EVERYONE_WINDOW_SEC;

export default function LeadDetails({ initialLead }: { initialLead: any }) {
  const [lead, setLead] = useState(initialLead);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notes, setNotes] = useState(lead.notes || '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchMessages = () => {
    if (!lead.phone) return;
    setChatLoading(true);
    return fetch(`/api/whatsapp?phone=${lead.phone}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setMessages(data); })
      .catch(() => {})
      .finally(() => setChatLoading(false));
  };

  useEffect(() => { fetchMessages(); }, [lead.phone]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: lead.phone, message: newMessage })
      });
      if (res.ok) {
        setNewMessage('');
        await fetchMessages(); // refetch so the new message has a real db id (needed to delete it)
      }
    } catch {}
    setSending(false);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ליד חדש': return 'var(--info)';
      case 'נשלחה הודעה': return 'var(--accent-primary)';
      case 'ענה': return 'var(--warning)';
      case 'נקבעה פגישה': return 'var(--success)';
      case 'לא רלוונטי': return 'var(--text-secondary)';
      default: return 'var(--text-secondary)';
    }
  };

  const statusOptions = ['ליד חדש', 'נשלחה הודעה', 'ענה', 'נקבעה פגישה', 'לא רלוונטי'];

  const handleUpdateStatus = async (newStatus: string) => {
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id);
    if (!error) setLead({ ...lead, status: newStatus });
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const { error } = await supabase.from('leads').update({ notes }).eq('id', lead.id);
    setSavingNotes(false);
    if (!error) setLead({ ...lead, notes });
  };

  const renderFormData = () => {
    let parsedData = lead.form_data;
    if (typeof parsedData === 'string') {
      try { parsedData = JSON.parse(parsedData); } catch(e) {}
    }
    if (!parsedData || typeof parsedData !== 'object') {
      return <div className={styles.emptyData}>אין נתונים נוספים להצגה</div>;
    }
    const entries = Object.entries(parsedData);
    if (entries.length === 0) return <div className={styles.emptyData}>אין נתונים נוספים להצגה</div>;

    return (
      <div className={styles.formGrid}>
        {entries.map(([key, value]) => (
          <div key={key} className={styles.formItem}>
            <span className={styles.formKey}>{key}</span>
            <span className={styles.formValue}>{String(value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`glass-panel`} style={{ padding: 0, overflow: 'hidden' }}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.avatar}>
            <User size={32} color="white" />
          </div>
          <div>
            <h2 className={styles.title}>{lead.name || 'ללא שם'}</h2>
            <div className={styles.subtitle}>
              <span>נקלט ב: {new Date(lead.created_at).toLocaleString('he-IL')}</span>
              {lead.source && <span className={styles.badge}>{lead.source}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainCol}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <FileText size={18} /> תשובות לשאלות מהטופס
            </h3>
            {renderFormData()}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Bot size={18} /> תובנות והמלצות AI
            </h3>
            <div className={styles.aiBox}>
              <div className={styles.aiIndicator}></div>
              <div className={styles.aiContent}>
                <p><strong>ניתוח הליד:</strong> הלקוח מגלה עניין גבוה על סמך התשובות שמסר בטופס. הוא ציין מטרה ברורה שמערכת השעות שלנו יכולה לפתור.</p>
                <p><strong>פעולה מומלצת:</strong> כדאי לשלוח הודעת ווטסאפ שמתייחסת ישירות לנקודת הכאב שציין.</p>
              </div>
            </div>
          </section>

          <section className={styles.section} style={{ marginTop: '2rem' }}>
            <h3 className={styles.sectionTitle}>
              <MessageCircle size={18} /> היסטוריית שיחות WhatsApp
            </h3>
            {chatLoading ? (
              <div className={styles.emptyData}>טוען שיחות...</div>
            ) : messages.length === 0 ? (
              <div className={styles.emptyData}>אין היסטוריית שיחות</div>
            ) : (
              <div className={styles.chatBox} ref={chatBoxRef}>
                {messages.map((msg, idx) => {
                  if (!msg.textMessage) return null;
                  const isAgent = msg.direction === 'outbound' || msg.senderId === 'me';
                  const time = msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '';
                  const align = isAgent ? 'agent' : 'user';
                  return (
                    <div key={msg.idMessage || idx} className={`${styles.chatMessage} ${isAgent ? styles.agent : styles.user}`}>
                      {msg.id && (
                        <ChatMessageMenu
                          messageId={msg.id}
                          align={align}
                          canDeleteForEveryone={canDeleteForEveryone(msg)}
                          onDeleted={(scope) => {
                            setMessages(prev => scope === 'me'
                              ? prev.filter(m => m.id !== msg.id)
                              : prev.map(m => m.id === msg.id ? { ...m, deletedForEveryone: true, textMessage: '🚫 הודעה זו נמחקה' } : m));
                          }}
                        />
                      )}
                      <div style={{ whiteSpace: 'pre-wrap' }} className={msg.deletedForEveryone ? styles.deletedMessage : undefined}>
                        {msg.textMessage}
                      </div>
                      <span className={styles.chatTime}>{time}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="כתוב הודעה..."
                style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'inherit', direction: 'rtl' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer', opacity: sending || !newMessage.trim() ? 0.5 : 1 }}
              >
                {sending ? '...' : 'שלח'}
              </button>
            </div>
          </section>
        </div>

        <div className={styles.sideCol}>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>פרטי יצירת קשר</h4>
            <div className={styles.contactItem}>
              <Phone size={16} />
              {lead.phone ? (
                <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noopener noreferrer" dir="ltr">{lead.phone}</a>
              ) : (
                <span>אין טלפון</span>
              )}
            </div>
            {lead.email && (
              <div className={styles.contactItem}>
                <Mail size={16} />
                <span>{lead.email}</span>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h4 className={styles.cardTitle}>עדכון סטטוס</h4>
            <div className={styles.statusSelect}>
              {statusOptions.map(opt => (
                <button 
                  key={opt}
                  onClick={() => handleUpdateStatus(opt)}
                  className={`${styles.statusBtn} ${lead.status === opt ? styles.activeStatus : ''}`}
                  style={{ 
                    borderColor: lead.status === opt ? getStatusColor(opt) : 'transparent',
                    color: lead.status === opt ? getStatusColor(opt) : 'inherit',
                    background: lead.status === opt ? `${getStatusColor(opt)}15` : 'rgba(255,255,255,0.05)'
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <h4 className={styles.cardTitle}>הערות פנימיות</h4>
            <textarea 
              className={`input-field ${styles.notesBox}`} 
              placeholder="הכנס הערות נוספות לליד..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <button 
              className={`btn btn-primary ${styles.saveBtn}`}
              onClick={handleSaveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? 'שומר...' : 'שמור הערות'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
