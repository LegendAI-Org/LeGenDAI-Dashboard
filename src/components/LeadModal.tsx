import { X, User, Phone, Mail, FileText, Bot, MessageCircle, Send } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import styles from './LeadModal.module.css';

type Lead = {
  id: string;
  phone: string;
  name: string;
  status: string;
  email: string | null;
  notes: string | null;
  source: string | null;
  form_data: any;
  created_at: string;
};

type Props = {
  lead: Lead;
  onClose: () => void;
  onUpdateStatus: (newStatus: string) => void;
};

type WhatsAppMessage = {
  idMessage: string;
  typeMessage: string;
  textMessage: string;
  senderId: string;
  timestamp: number;
};

export default function LeadModal({ lead, onClose, onUpdateStatus }: Props) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lead.phone) {
      fetchChatHistory();
    }
  }, [lead.phone]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      // GreenAPI returns newest first, so we reverse it for display
      if (Array.isArray(data)) {
        setMessages(data.reverse());
      }
    } catch (err: any) {
      setChatError(err.message || 'Error loading chat');
    } finally {
      setLoadingChat(false);
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
      
      // Optimistically add the message
      const optimMsg: WhatsAppMessage = {
        idMessage: Date.now().toString(),
        typeMessage: 'textMessage',
        textMessage: newMessage.trim(),
        senderId: 'me', // indicates outgoing
        timestamp: Math.floor(Date.now() / 1000)
      };
      
      setMessages(prev => [...prev, optimMsg]);
      setNewMessage('');
    } catch (err: any) {
      alert(err.message || 'Error sending message');
    } finally {
      setSending(false);
    }
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
                <MessageCircle size={18} /> התכתבות WhatsApp
              </h3>
              <div className={styles.chatBox}>
                {loadingChat ? (
                  <div className={styles.emptyData}>טוען היסטוריית שיחות...</div>
                ) : chatError ? (
                  <div className={styles.emptyData}>{chatError}</div>
                ) : messages.length === 0 ? (
                  <div className={styles.emptyData}>אין שיחות קודמות להצגה.</div>
                ) : (
                  messages.map((msg, idx) => {
                    if (msg.typeMessage !== 'textMessage' && msg.typeMessage !== 'extendedTextMessage') return null;
                    const isAgent = msg.senderId === 'me' || String(msg.senderId).startsWith(process.env.NEXT_PUBLIC_GREENAPI_ID_INSTANCE || 'none');
                    return (
                      <div key={idx} className={`${styles.chatMessage} ${isAgent ? styles.agent : styles.user}`}>
                        {msg.textMessage}
                        <span className={styles.chatTime}>
                          {new Date(msg.timestamp * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
              
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
            <div className={styles.card}>
              <h4 className={styles.cardTitle}>פרטי יצירת קשר</h4>
              <div className={styles.contactItem}>
                <Phone size={16} />
                {lead.phone ? (
                  <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noopener noreferrer" dir="ltr">{lead.phone}</a>
                ) : (
                  <span>אין מספר טלפון</span>
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
                    onClick={() => onUpdateStatus(opt)}
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
                defaultValue={lead.notes || ''}
              />
              <button className={`btn btn-primary ${styles.saveBtn}`}>שמור הערות</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
