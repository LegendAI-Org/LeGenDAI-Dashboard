"use client";

import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import styles from './LeadModal.module.css';

type Props = {
  messageId: string;
  canDeleteForEveryone: boolean;
  align: 'agent' | 'user';
  onDeleted: (scope: 'me' | 'everyone') => void;
};

export default function ChatMessageMenu({ messageId, canDeleteForEveryone, align, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async (scope: 'me' | 'everyone') => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: messageId, scope })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'מחיקת ההודעה נכשלה');
        return;
      }
      onDeleted(scope);
    } catch {
      alert('מחיקת ההודעה נכשלה');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div className={styles.msgMenuWrap}>
      <button
        type="button"
        className={`${styles.msgMenuBtn} ${open ? styles.msgMenuBtnOpen : ''}`}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        aria-label="אפשרויות הודעה"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <>
          <div className={styles.msgMenuBackdrop} onClick={() => setOpen(false)} />
          <div className={`${styles.msgMenu} ${styles[align]}`}>
            <button type="button" className={styles.msgMenuItem} disabled={busy} onClick={() => handleDelete('me')}>
              מחק אצלי
            </button>
            {canDeleteForEveryone && (
              <button
                type="button"
                className={`${styles.msgMenuItem} ${styles.msgMenuItemDanger}`}
                disabled={busy}
                onClick={() => handleDelete('everyone')}
              >
                מחק אצל כולם
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
