"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, MessageSquare, CreditCard, PieChart, LogOut, CalendarRange } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };
  
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <div className={styles.logoIcon}>N</div>
        <h2 className={styles.logoText}>Noga CRM</h2>
      </div>

      <nav className={styles.nav}>
        <Link href="/leads" className={`${styles.navItem} ${pathname === '/leads' ? styles.active : ''}`}>
          <Users size={20} />
          <span>ניהול לידים</span>
        </Link>
        <Link href="/summary" className={`${styles.navItem} ${pathname === '/summary' ? styles.active : ''}`}>
          <CalendarRange size={20} />
          <span>סיכום תקופתי</span>
        </Link>
        <Link href="/feedback" className={`${styles.navItem} ${pathname === '/feedback' ? styles.active : ''}`}>
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
          <div className={styles.avatar}>N</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>צוות נגה</div>
            <div className={styles.userRole}>מנהל מערכת</div>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} title="התנתק">
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
}
