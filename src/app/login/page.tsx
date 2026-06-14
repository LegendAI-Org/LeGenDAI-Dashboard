import { login } from './actions'
import { Lock } from 'lucide-react'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            boxShadow: '0 8px 16px var(--accent-glow)'
          }}>
            <Lock size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>כניסה למערכת</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>הזן את פרטי הגישה שקיבלת כדי להתחבר לדאשבורד שלך.</p>
        </div>

        {searchParams.error && (
          <div style={{ width: '100%', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            שם המשתמש או הסיסמה שגויים
          </div>
        )}

        <form style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="email" style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>אימייל</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              className="input-field" 
              placeholder="name@company.com"
              dir="ltr"
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="password" style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>סיסמה</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              className="input-field" 
              placeholder="••••••••"
              dir="ltr"
            />
          </div>

          <button 
            formAction={login} 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem', padding: '0.875rem', fontSize: '1rem' }}
          >
            התחברות
          </button>
        </form>

      </div>
    </div>
  )
}
