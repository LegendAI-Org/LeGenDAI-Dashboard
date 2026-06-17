"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from './LeadsTable.module.css';
import { Search, Filter, MoreHorizontal, MessageCircle } from 'lucide-react';
import LeadModal from './LeadModal';

type Lead = {
  id: string;
  phone: string;
  name: string;
  status: string;
  email: string | null;
  notes: string | null;
  source: string | null;
  client_id: string;
  form_data: any;
  created_at: string;
};

export default function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    fetchLeads();
    
    // Set up Realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('Real-time update received!', payload);
          fetchLeads(); // Simple approach: refetch on change to keep order and filters intact
        }
      )
      .subscribe();

    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  async function fetchLeads() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setLeads(data || []);
      setErrorMsg('');
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      setErrorMsg('Error loading leads: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const getDisplayName = (lead: Lead) => {
    let name = lead.name;
    if (!name || name === 'ללא שם') {
      try {
        const form = typeof lead.form_data === 'string' ? JSON.parse(lead.form_data) : lead.form_data;
        const first = form?.['שם פרטי'] || '';
        const last = form?.['שם משפחה'] || '';
        const full = form?.['Full Name'] || form?.['שם מלא'] || '';
        if (first || last) {
          name = `${first} ${last}`.trim();
        } else if (full) {
          name = full;
        }
      } catch(e) {}
    }
    return name || 'ללא שם';
  };

  const filteredLeads = leads.filter(lead => {
    const s = search.toLowerCase();
    const dName = getDisplayName(lead).toLowerCase();
    const lName = (lead.name || '').toLowerCase();
    const email = (lead.email || '').toLowerCase();
    const phone = (lead.phone || '').toLowerCase();
    
    const matchesSearch = dName.includes(s) || lName.includes(s) || email.includes(s) || phone.includes(s);
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Handle status updates from within the table if needed (currently done inside the lead page)
  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);
        
      if (!error) {
        fetchLeads();
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead({ ...selectedLead, status: newStatus });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.statsCounter}>
          <span>סה״כ לידים:</span>
          <strong>{filteredLeads.length}</strong>
        </div>
      </div>
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="חיפוש לפי שם, טלפון או מייל..." 
            className={`input-field ${styles.searchInput}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className={styles.filterBox}>
          <Filter size={18} className={styles.filterIcon} />
          <select 
            className={`input-field ${styles.selectInput}`}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">כל הסטטוסים</option>
            <option value="ליד חדש">ליד חדש</option>
            <option value="נשלחה הודעה">נשלחה הודעה</option>
            <option value="ענה">ענה</option>
            <option value="נקבעה פגישה">נקבעה פגישה</option>
            <option value="לא רלוונטי">לא רלוונטי</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        {errorMsg ? (
          <div className={styles.emptyState}>{errorMsg}</div>
        ) : loading ? (
          <div className={styles.loadingState}>טוען נתונים...</div>
        ) : filteredLeads.length === 0 ? (
          <div className={styles.emptyState}>לא נמצאו לידים תואמים.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>שם לקוח</th>
                <th>מקור הגעה</th>
                <th>טלפון</th>
                <th>סטטוס</th>
                <th>תאריך קבלה</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <React.Fragment key={lead.id}>
                <tr className={styles.row} onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)} style={{ cursor: 'pointer', backgroundColor: selectedLead?.id === lead.id ? 'rgba(255,255,255,0.05)' : '' }}>
                  <td>
                    <div className={styles.leadName}>{getDisplayName(lead)}</div>
                    <div className={styles.leadEmail}>{lead.email}</div>
                  </td>
                  <td>
                    <span className={styles.sourceBadge}>{lead.source || 'לא ידוע'}</span>
                  </td>
                  <td>
                    <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noopener noreferrer" className={styles.phoneLink}>
                      <MessageCircle size={14} />
                      {lead.phone}
                    </a>
                  </td>
                  <td>
                    <span 
                      className={styles.statusBadge}
                      style={{ 
                        backgroundColor: `${getStatusColor(lead.status)}20`,
                        color: getStatusColor(lead.status),
                        border: `1px solid ${getStatusColor(lead.status)}40`
                      }}
                    >
                      {lead.status || 'חדש'}
                    </span>
                  </td>
                  <td>{new Date(lead.created_at).toLocaleDateString('he-IL')}</td>
                  <td>
                    <button className={styles.actionBtn}>
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
                {selectedLead?.id === lead.id && (
                  <tr>
                    <td colSpan={6} style={{ padding: 0, borderBottom: '1px solid var(--glass-border)' }}>
                      <LeadModal
                        lead={selectedLead}
                        onClose={() => setSelectedLead(null)}
                        onUpdateStatus={(newStatus) => handleUpdateStatus(selectedLead.id, newStatus)}
                      />
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button 
        className={`${styles.scrollTopBtn} ${showScrollTop ? styles.showScrollBtn : ''}`}
        onClick={scrollToTop}
        title="חזרה למעלה"
      >
        ↑
      </button>
    </div>
  );
}
