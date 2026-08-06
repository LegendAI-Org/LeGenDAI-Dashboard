import LeadsTable from '@/components/LeadsTable';
import { Users } from 'lucide-react';

export default function LeadsPage() {
  return (
    // minWidth:0 הוא מה שמאפשר לילד גמיש להתכווץ. בלעדיו הטבלה הרחבה מותחת את
    // העמוד מעבר לרוחב המסך, וסרגל הניווט התחתון נחתך יחד איתו.
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0, maxWidth: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          boxShadow: '0 4px 12px var(--accent-glow)'
        }}>
          <Users size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>ניהול לידים</h1>
          <p style={{ color: 'var(--text-secondary)' }}>צפייה, ניהול ועדכון הסטטוס של כל הלידים שלך במערכת אחת מתקדמת.</p>
        </div>
      </header>

      <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '600px', minWidth: 0, maxWidth: '100%' }}>
        <LeadsTable />
      </div>
    </div>
  );
}
