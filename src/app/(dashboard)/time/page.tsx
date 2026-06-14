import TimeClock from '@/components/TimeClock';
import { Clock } from 'lucide-react';

export default function TimePage() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
        }}>
          <Clock size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>שעון נוכחות</h1>
          <p style={{ color: 'var(--text-secondary)' }}>החתמת כרטיס מהירה ופשוטה לרישום שעות עבודה.</p>
        </div>
      </header>

      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <TimeClock />
      </div>
    </div>
  );
}
