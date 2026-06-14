import styles from './page.module.css';
import { Users, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

export default function Home() {
  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>ברוכים הבאים, צוות נגה 👋</h1>
          <p className={styles.subtitle}>הנה סקירה של מה שקורה היום בעסק שלך.</p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={`glass-card ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}>
              <Users size={24} />
            </div>
            <span className={styles.statLabel}>סך הכל לידים</span>
          </div>
          <div className={styles.statValue}>1,248</div>
          <div className={styles.statTrend} style={{ color: 'var(--success)' }}>
            <TrendingUp size={16} />
            <span>+12% מהחודש שעבר</span>
          </div>
        </div>

        <div className={`glass-card ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <Calendar size={24} />
            </div>
            <span className={styles.statLabel}>פגישות שנקבעו</span>
          </div>
          <div className={styles.statValue}>42</div>
          <div className={styles.statTrend} style={{ color: 'var(--success)' }}>
            <TrendingUp size={16} />
            <span>+5% משבוע שעבר</span>
          </div>
        </div>

        <div className={`glass-card ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <AlertCircle size={24} />
            </div>
            <span className={styles.statLabel}>דורשים טיפול</span>
          </div>
          <div className={styles.statValue}>12</div>
          <div className={styles.statTrend} style={{ color: 'var(--text-secondary)' }}>
            <span>לידים שממתינים למענה</span>
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={`glass-card ${styles.mainPanel}`}>
          <h2 className={styles.panelTitle}>פעילות אחרונה</h2>
          <div className={styles.emptyState}>
            טוען נתונים מ-Supabase...
          </div>
        </div>
        
        <div className={`glass-card ${styles.sidePanel}`}>
          <h2 className={styles.panelTitle}>תזכורות AI</h2>
          <div className={styles.aiAlerts}>
            <div className={styles.aiAlert}>
              <div className={styles.aiIndicator}></div>
              <div>
                <strong>רונית לוי</strong> התעניינה בכנס Restoring, כדאי לשלוח הודעת פולו-אפ.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
