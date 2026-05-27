'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '48px', width: '100%', maxWidth: '400px', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>💧</div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0d2137', margin: '0 0 4px 0' }}>DewaPrice</h1>
          <p style={{ color: '#666', fontSize: '14px', margin: '0 0 16px 0' }}>Dewatering Price & Estimator Tool</p>
          <div style={{ width: '48px', height: '3px', background: '#1565C0', margin: '0 auto', borderRadius: '2px' }}/>
        </div>

        {error && (
          <div style={{ background: '#ffebee', border: '1px solid #ffcdd2', color: '#c62828', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>Email address</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', color: '#000', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', color: '#000', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', padding: '13px', background: loading ? '#90CAF9' : 'linear-gradient(135deg, #1565C0, #0288D1)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '⏳ Signing in...' : 'Sign in →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#aaa', marginTop: '24px' }}>
          🇵🇭 Philippines BU — Internal tool
        </p>
      </div>
    </div>
  );
}
