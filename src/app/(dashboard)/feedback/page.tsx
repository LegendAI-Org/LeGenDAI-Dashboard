import FeedbackForm from '@/components/FeedbackForm';
import { MessageSquare } from 'lucide-react';

export default function FeedbackPage() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
        }}>
          <MessageSquare size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>בקשות פיתוח ודיווחי באגים</h1>
          <p style={{ color: 'var(--text-secondary)' }}>יש לך רעיון לפיצ'ר חדש? מצאת באג? דווח לנו ישירות מכאן.</p>
        </div>
      </header>

      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <FeedbackForm />
      </div>
    </div>
  );
}
