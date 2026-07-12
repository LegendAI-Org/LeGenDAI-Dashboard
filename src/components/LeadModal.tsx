import { X, User, Phone, Mail, FileText, Bot, MessageCircle, Send, DollarSign } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from './LeadModal.module.css';
import ChatMessageMenu from './ChatMessageMenu';

type Lead = {
  id: string;
  phone: string;
  name: string;
  status: string;
  email: string | null;
  notes: string | null;
  source: string | null;
  client_id: string;
  form_data: any;
  created_at: string;
  deal_value?: number;
};

type Props = {
  lead: Lead;
  onClose: () => void;
  onUpdateStatus: (newStatus: string) => void;
};

type WhatsAppMessage = {
  id?: string;
  idMessage: string;
  typeMessage: string;
  textMessage: string;
  senderId: string;
  timestamp: number;
  direction?: 'inbound' | 'outbound';
  status?: string;
  extendedTextMessage?: { text: string };
  deletedForEveryone?: boolean;
};

// GreenAPI/WhatsApp only allow deleting a sent message "for everyone" within
// roughly an hour of sending — mirror that in the UI so the option doesn't
// appear for messages the server would reject anyway.
const DELETE_FOR_EVERYONE_WINDOW_SEC = 60 * 60;
const canDeleteForEveryone = (msg: WhatsAppMessage) =>
  msg.direction === 'outbound' &&
  !!msg.id &&
  !msg.deletedForEveryone &&
  (Date.now() / 1000 - msg.timestamp) < DELETE_FOR_EVERYONE_WINDOW_SEC;

const statusOptions = [
  'ליד חדש',
  'נשלחה הודעה',
  'ענה',
  'נקבעה פגישה',
  'לא רלוונטי',
  'עסקה נסגרה'
];

export default function LeadModal({ lead, onClose, onUpdateStatus }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  
  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isRelevant, setIsRelevant] = useState<boolean | null>(null);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  
  const [dealValue, setDealValue] = useState(lead.deal_value || 0);
  const [savingDeal, setSavingDeal] = useState(false);
  
  const chatBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lead.phone) {
      fetchChatHistory();
    }
  }, [lead.phone]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchChatHistory = async () => {
    setLoadingChat(true);
    setChatError('');
    try {
      const res = await fetch(`/api/whatsapp?phone=${lead.phone}`);
      if (!res.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await res.json();
      // API returns messages in chronological order (ascending) — no need to reverse
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (err: any) {
      setChatError(err.message || 'Error loading chat');
    } finally {
      setLoadingChat(false);
    }
  };

  const handleUpdateDealValue = async () => {
    setSavingDeal(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ deal_value: dealValue })
        .eq('id', lead.id);
      
      if (error) throw error;
      // You could show a success toast here
    } catch (err) {
      console.error('Error saving deal value:', err);
    } finally {
      setSavingDeal(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: lead.phone, message: newMessage.trim() })
      });
      
      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage('');
      await fetchChatHistory(); // refetch so the new message has a real db id (needed to delete it)
    } catch (err: any) {
      alert(err.message || 'Error sending message');
    } finally {
      setSending(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAiAnalysis(null);
    setFeedbackSent(false);
    setIsRelevant(null);
    setFeedbackText('');
    
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, messages })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze');
      }

      if (!res.body) throw new Error('No response body');
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamedText = '';

      // Initialize with empty text
      setAiAnalysis({ rawText: '' });

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });
        streamedText += chunkValue;
        
        setAiAnalysis({ rawText: streamedText });
      }

      // After streaming finishes, try to extract the draft message if it exists
      const draftMatch = streamedText.match(/טיוטת וואטסאפ:\*?\*?\n([\s\S]*)/i) || streamedText.match(/טיוטה:\*?\*?\n([\s\S]*)/i);
      if (draftMatch && draftMatch[1]) {
        setNewMessage(draftMatch[1].trim());
      }
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendFeedback = async () => {
    if (isRelevant === null || !feedbackText.trim()) {
      alert('יש לבחור האם רלוונטי ולהזין משוב');
      return;
    }
    setSendingFeedback(true);
    try {
      const res = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lead, 
          previousAnalysis: aiAnalysis?.analysis,
          previousDraft: aiAnalysis?.whatsapp_draft,
          isRelevant,
          feedbackText
        })
      });
      if (!res.ok) throw new Error('Failed to send feedback');
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingFeedback(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (!status || status === '') return 'var(--info)';
    switch(status) {
      case 'ליד חדש': return 'var(--info)';
      case 'מחכה לתשובה': return 'var(--warning)';
      case 'נשלחה הודעה': return 'var(--accent-primary)';
      case 'התקבלה הודעה': return 'var(--warning)';
      case 'ענה': return 'var(--warning)';
      case 'נקבעה פגישה': return 'var(--success)';
      case 'נרשם לכנס': return 'var(--success)';
      case 'נרשם לתוכנית הכשרה': return 'var(--success)';
      case 'לא רלוונטי': return 'var(--text-secondary)';
      default: return 'var(--text-secondary)';
    }
  };

  const statusOptions = ['ליד חדש', 'התקבלה הודעה', 'מחכה לתשובה', 'נשלחה הודעה', 'ענה', 'נקבעה פגישה', 'נרשם לכנס', 'נרשם לתוכנית הכשרה', 'לא רלוונטי'];

  const renderFormData = () => {
    if (!lead.form_data) return <div className={styles.emptyData}>לא קיים מידע מטופס הרשמה</div>;
    
    let parsedData = lead.form_data;
    if (typeof parsedData === 'string') {
      try {
        parsedData = JSON.parse(parsedData);
      } catch(e) {
        return <div className={styles.emptyData}>תקלה בפענוח נתוני הטופס</div>;
      }
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
    <div className={styles.overlay} onClick={onClose}>
      <div className={`glass-panel ${styles.modal}`} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={styles.avatar}>
              <User size={28} color="white" />
            </div>
            <div>
              <h2 className={styles.title}>{lead.name || 'ללא שם'}</h2>
              <div className={styles.subtitle}>
                <span>{lead.phone}</span>
                <span className={styles.badge}>{lead.source || 'לא ידוע'}</span>
              </div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.mainCol}>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <FileText size={18} /> תשובות לשאלות מהטופס
              </h3>
              {renderFormData()}
            </section>
            <section className={styles.section} style={{ marginTop: '2rem' }}>
              <h3 className={styles.sectionTitle}>
                <MessageCircle size={18} /> התכתבות (WhatsApp)
              </h3>
              
              {loadingChat ? (
                <div className={styles.emptyData}>טוען היסטוריית שיחות...</div>
              ) : chatError ? (
                <div className={styles.emptyData}>שגיאה בטעינת היסטוריה: {chatError}</div>
              ) : messages.length === 0 ? (
                <div className={styles.emptyData}>אין היסטוריה</div>
              ) : (
                <div className={styles.chatBox} ref={chatBoxRef}>
                  {(() => {
                    let lastDateStr = '';
                    return messages.map((msg, idx) => {
                      // Skip non-text messages
                      const msgText = msg.textMessage || msg.extendedTextMessage?.text;
                      if (!msgText) return null;
                      
                      const timestamp = Number(msg.timestamp);
                      const msgDate = isNaN(timestamp) || !timestamp ? null : new Date(timestamp * 1000);
                      
                      // Format date for separator safely
                      let currentDateStr = 'תאריך לא ידוע';
                      if (msgDate && !isNaN(msgDate.getTime())) {
                        currentDateStr = msgDate.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
                      }
                      
                      const showSeparator = currentDateStr !== lastDateStr;
                      lastDateStr = currentDateStr;

                      const isAgent = msg.direction === 'outbound' || msg.senderId === 'me' || String(msg.senderId).startsWith(process.env.NEXT_PUBLIC_GREENAPI_ID_INSTANCE || 'none');
                      const align = isAgent ? 'agent' : 'user';

                      return (
                        <React.Fragment key={idx}>
                          {showSeparator && (
                            <div className={styles.dateSeparator}>
                              <span>{currentDateStr}</span>
                            </div>
                          )}
                          <div className={`${styles.chatMessage} ${isAgent ? styles.agent : styles.user}`}>
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
                            <div
                              className={`${styles.chatText} ${msg.deletedForEveryone ? styles.deletedMessage : ''}`}
                              style={{ whiteSpace: 'pre-wrap' }}
                            >
                              {msgText}
                            </div>
                            <span className={styles.chatTime}>
                              {msgDate && !isNaN(msgDate.getTime()) ? msgDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>
              )}

              <div className={styles.chatInputWrapper}>
                <input 
                  type="text" 
                  className={`input-field ${styles.chatInput}`}
                  placeholder="הקלד הודעה ללקוח..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  disabled={sending}
                />
                <button 
                  className={styles.sendBtn} 
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                >
                  <Send size={18} />
                </button>
              </div>
            </section>
          </div>
          <div className={styles.sideCol}>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <User size={18} /> פרטי לקוח
              </h3>
              <div className={styles.detailRow}>
                <Phone size={16} className={styles.detailIcon} />
                <span>{lead.phone}</span>
              </div>
              {lead.email && (
                <div className={styles.detailRow}>
                  <Mail size={16} className={styles.detailIcon} />
                  <span>{lead.email}</span>
                </div>
              )}
            </section>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>עדכון סטטוס</h3>
              <div className={styles.statusDropdownContainer}>
                <select 
                  className={styles.statusDropdown}
                  value={lead.status}
                  onChange={(e) => onUpdateStatus(e.target.value)}
                  style={{ borderLeftColor: getStatusColor(lead.status) }}
                >
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </section>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <DollarSign size={18} /> שווי עסקה (₪)
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="number" 
                  className="input-field" 
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)' }}
                  value={dealValue}
                  onChange={e => setDealValue(Number(e.target.value))}
                  onBlur={handleUpdateDealValue}
                />
                {savingDeal && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>שומר...</span>}
              </div>
            </section>
          </div>
        </div>

        {/* AI Section Moved Outside Grid for Full Width */}
        <div className={styles.fullWidthSection}>
            <section className={styles.section}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>
                  <Bot size={18} /> תובנות והמלצות AI
                </h3>
                <button 
                  className={`btn ${styles.analyzeBtn}`} 
                  onClick={handleAnalyze} 
                  disabled={analyzing || loadingChat}
                >
                  {analyzing ? 'מנתח...' : 'נתח ליד עכשיו'}
                </button>
              </div>
              
              {aiAnalysis ? (
                <div className={styles.aiBox}>
                  <div className={styles.aiIndicator}></div>
                  <div className={styles.aiContent}>
                    <div className={styles.streamedText} style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {aiAnalysis.rawText}
                    </div>
                  </div>
                  
                  {!analyzing && (
                    <div className={styles.feedbackSection}>
                      <h4>האם התשובה הייתה טובה? עזור לסוכן להשתפר</h4>
                      <div className={styles.feedbackControls}>
                        <button 
                          className={`${styles.feedbackThumb} ${isRelevant === true ? styles.activeYes : ''}`}
                          onClick={() => setIsRelevant(true)}
                        >
                          👍 רלוונטי
                        </button>
                        <button 
                          className={`${styles.feedbackThumb} ${isRelevant === false ? styles.activeNo : ''}`}
                          onClick={() => setIsRelevant(false)}
                        >
                          👎 לא רלוונטי
                        </button>
                      </div>
                      <textarea 
                        className={`input-field ${styles.feedbackInput}`}
                        placeholder="הזן הערות למודל כדי שילמד להבא... (למשל: 'הודעת הטיוטה הייתה רשמית מדי')"
                        value={feedbackText}
                        onChange={e => setFeedbackText(e.target.value)}
                      />
                      <button 
                        className={`btn btn-primary ${styles.feedbackSubmit}`}
                        onClick={handleSendFeedback}
                        disabled={sendingFeedback || feedbackSent}
                      >
                        {sendingFeedback ? 'שולח...' : feedbackSent ? 'הזיכרון עודכן ✓' : 'עדכן זיכרון לטווח ארוך'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.emptyData}>
                  {analyzing ? 'טוען ניתוח וזיכרון לטווח ארוך...' : 'לחץ על "נתח ליד עכשיו" לקבלת המלצות מבוססות שיחה וטופס.'}
                </div>
              )}
            </section>
        </div>


      </div>
    </div>
  );
}
