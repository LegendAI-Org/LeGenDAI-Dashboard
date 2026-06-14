"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Loader2, CheckCircle } from 'lucide-react';

export default function FeedbackForm() {
  const [type, setType] = useState('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !description) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('dev_feedback')
        .insert([{ type, title, description, status: 'open', created_at: new Date().toISOString() }]);
        
      if (!error) {
        setSuccess(true);
        setTitle('');
        setDescription('');
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {success && (
        <div className="animate-fade-in" style={{ 
          padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', 
          borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' 
        }}>
          <CheckCircle size={20} />
          <span>הפניה נשלחה בהצלחה לצוות הפיתוח! תודה רבה.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>סוג הפניה</label>
          <select 
            value={type} 
            onChange={e => setType(e.target.value)}
            className="input-field"
            style={{ width: '100%', maxWidth: '300px' }}
          >
            <option value="bug">🐛 דיווח על תקלה (Bug)</option>
            <option value="feature">✨ בקשה לפיצ'ר חדש</option>
            <option value="general">💬 שאלה או הערה כללית</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>כותרת קצרה</label>
          <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)}
            className="input-field"
            placeholder="למשל: כפתור השמירה לא עובד בלידים"
            required
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>תיאור מפורט</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            className="input-field"
            placeholder="תאר/י את התקלה או את הפיצ'ר שתרצה/י נוסיף למערכת..."
            rows={6}
            style={{ resize: 'vertical' }}
            required
          />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <button 
            type="submit" 
            disabled={loading || !title || !description}
            className="btn btn-primary"
            style={{ padding: '0.75rem 2rem' }}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
            שלח פניה לצוות הפיתוח
          </button>
        </div>
      </form>

    </div>
  );
}
