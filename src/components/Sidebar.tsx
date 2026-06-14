import Link from 'next/link';
import { LayoutDashboard, Users, Clock, MessageSquare, CreditCard, PieChart } from 'lucide-react';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <div className={styles.logoIcon}>N</div>
        <h2 className={styles.logoText}>Noga CRM</h2>
      </div>

      <nav className={styles.nav}>
        <Link href="/" className={`${styles.navItem} ${styles.active}`}>
          <LayoutDashboard size={20} />
          <span>דאשבורד ראשי</span>
        </Link>
        <Link href="/leads" className={styles.navItem}>
          <Users size={20} />
          <span>ניהול לידים</span>
        </Link>
        <Link href="/time" className={styles.navItem}>
          <Clock size={20} />
          <span>שעון נוכחות</span>
        </Link>
        <Link href="/feedback" className={styles.navItem}>
          <MessageSquare size={20} />
          <span>בקשות פיתוח</span>
        </Link>
        
        <div className={styles.divider}></div>
        <div className={styles.sectionTitle}>בקרוב</div>

        <Link href="#" className={`${styles.navItem} ${styles.disabled}`}>
          <CreditCard size={20} />
          <span>ניהול פיננסי</span>
        </Link>
        <Link href="#" className={`${styles.navItem} ${styles.disabled}`}>
          <PieChart size={20} />
          <span>קמפיינים Meta</span>
        </Link>
      </nav>
      
      <div className={styles.footer}>
        <div className={styles.userProfile}>
          <div className={styles.avatar}></div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>צוות נגה</div>
            <div className={styles.userRole}>מנהל מערכת</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
