'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/lib/primitives';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    const next = params.get('next') || '/dashboard';
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <div className="auth-error">{error}</div>}
      <label className="auth-label">Email</label>
      <input
        className="sx-input"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <label className="auth-label">Password</label>
      <input
        className="sx-input"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      <Button kind="primary" size="lg" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
