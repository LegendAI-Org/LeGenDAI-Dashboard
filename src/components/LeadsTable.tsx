"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
  form_data: any;
  created_at: string;
};

export default function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

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

    return () => {
      supabase.removeChannel(channel);
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
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      (lead.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (lead.phone || '').includes(search);
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedLead) return;
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', selectedLead.id);
        
      if (!error) {
        setSelectedLead({ ...selectedLead, status: newStatus });
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="חיפוש לפי שם או טלפון..." 
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
        {loading ? (
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
                <tr key={lead.id} className={styles.row} onClick={() => setSelectedLead(lead)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className={styles.leadName}>{lead.name || 'ללא שם'}</div>
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedLead && (
        <LeadModal 
          lead={selectedLead} 
          onClose={() => setSelectedLead(null)} 
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
}
