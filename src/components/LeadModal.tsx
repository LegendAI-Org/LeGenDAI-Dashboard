import { X, User, Phone, Mail, FileText, Bot, Clock, MapPin } from 'lucide-react';
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

export default function LeadModal({ lead, onClose, onUpdateStatus }: Props) {
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

  // format form data nicely
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
          </div>

          <div className={styles.sideCol}>
            <div className={styles.card}>
              <h4 className={styles.cardTitle}>פרטי יצירת קשר</h4>
              <div className={styles.contactItem}>
                <Phone size={16} />
                <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noopener noreferrer" dir="ltr">{lead.phone}</a>
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
