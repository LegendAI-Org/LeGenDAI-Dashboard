"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter } from 'lucide-react';

const PRESETS: { value: string; label: string }[] = [
  { value: 'today', label: 'היום' },
  { value: '7', label: '7 ימים אחרונים' },
  { value: '14', label: '14 יום אחרונים' },
  { value: '30', label: '30 יום אחרונים' },
  { value: 'all', label: 'כל הזמנים' },
  { value: 'custom', label: 'טווח מותאם אישית' },
];

export default function PeriodFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasCustomRange = !!(searchParams.get('from') && searchParams.get('to'));
  const currentRange = hasCustomRange ? 'custom' : (searchParams.get('range') || '7');

  const [showCustom, setShowCustom] = useState(hasCustomRange);
  const [fromDate, setFromDate] = useState(searchParams.get('from') || '');
  const [toDate, setToDate] = useState(searchParams.get('to') || '');

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'custom') {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    const params = new URLSearchParams();
    params.set('range', value);
    router.push(`?${params.toString()}`);
  };

  const applyCustomRange = () => {
    if (!fromDate || !toDate) return;
    const params = new URLSearchParams();
    params.set('from', fromDate);
    params.set('to', toDate);
    router.push(`?${params.toString()}`);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        padding: '0.25rem 0.75rem',
        width: 'fit-content'
      }}>
        <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
        <select
          value={currentRange}
          onChange={handlePresetChange}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {PRESETS.map(p => (
            <option key={p.value} value={p.value} style={{ background: '#121214' }}>{p.label}</option>
          ))}
        </select>
      </div>

      {showCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '0.4rem 0.6rem',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>עד</span>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '0.4rem 0.6rem',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          />
          <button
            onClick={applyCustomRange}
            disabled={!fromDate || !toDate}
            style={{
              background: 'var(--accent-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.4rem 0.9rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: fromDate && toDate ? 'pointer' : 'not-allowed',
              opacity: fromDate && toDate ? 1 : 0.5,
            }}
          >
            הצג
          </button>
        </div>
      )}
    </div>
  );
}
