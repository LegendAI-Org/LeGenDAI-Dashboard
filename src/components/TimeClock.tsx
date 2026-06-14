"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, Square, Loader2 } from 'lucide-react';

type TimeLog = {
  id: string;
  employee_name: string;
  action: 'in' | 'out';
  timestamp: string;
};

export default function TimeClock() {
  const [employeeName, setEmployeeName] = useState('ליה');
  const [lastAction, setLastAction] = useState<'in' | 'out' | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<TimeLog[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_clock')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setLogs(data);
        if (data.length > 0) {
          setLastAction(data[0].action);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClock(action: 'in' | 'out') {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('time_clock')
        .insert([{ employee_name: employeeName, action, timestamp: new Date().toISOString() }]);
        
      if (!error) {
        setLastAction(action);
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
      
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>שלום, {employeeName}</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          {lastAction === 'in' ? 'את כרגע במשמרת.' : 'את כרגע לא במשמרת.'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
        <button 
          onClick={() => handleClock('in')}
          disabled={loading || lastAction === 'in'}
          className="btn"
          style={{ 
            background: lastAction === 'in' ? 'var(--bg-secondary)' : 'var(--success)', 
            color: lastAction === 'in' ? 'var(--text-secondary)' : 'white',
            padding: '1rem 2rem',
            fontSize: '1.2rem',
            borderRadius: 'var(--border-radius-lg)',
            opacity: lastAction === 'in' ? 0.5 : 1
          }}
        >
          {loading ? <Loader2 className="animate-spin" /> : <Play />}
          כניסה (Clock In)
        </button>

        <button 
          onClick={() => handleClock('out')}
          disabled={loading || lastAction === 'out' || lastAction === null}
          className="btn"
          style={{ 
            background: (lastAction === 'out' || lastAction === null) ? 'var(--bg-secondary)' : 'var(--danger)', 
            color: (lastAction === 'out' || lastAction === null) ? 'var(--text-secondary)' : 'white',
            padding: '1rem 2rem',
            fontSize: '1.2rem',
            borderRadius: 'var(--border-radius-lg)',
            opacity: (lastAction === 'out' || lastAction === null) ? 0.5 : 1
          }}
        >
          {loading ? <Loader2 className="animate-spin" /> : <Square />}
          יציאה (Clock Out)
        </button>
      </div>

      <div style={{ width: '100%', marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>רישומים אחרונים</h3>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-sm)' }}>
            אין רישומים להצגה
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {logs.map(log => (
              <div key={log.id} style={{ 
                display: 'flex', justifyContent: 'space-between', padding: '1rem', 
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--border-radius-sm)', borderRight: `3px solid ${log.action === 'in' ? 'var(--success)' : 'var(--danger)'}`
              }}>
                <span style={{ fontWeight: 500 }}>{log.action === 'in' ? 'כניסה' : 'יציאה'}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{new Date(log.timestamp).toLocaleString('he-IL')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
