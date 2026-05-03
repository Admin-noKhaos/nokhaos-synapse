'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/lib/primitives';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      // Auto-confirmed: grant free credits via API then go to dashboard.
      await fetch('/api/auth/post-signup', { method: 'POST' });
      router.push('/dashboard');
      router.refresh();
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="auth-success">
        Check your inbox to confirm your email. Once confirmed, sign in and you'll get $5 in free credits.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <div className="auth-error">{error}</div>}
      <label className="auth-label">Your name</label>
      <input
        className="sx-input"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ marginBottom: 12 }}
      />
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
        autoComplete="new-password"
        minLength={8}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      <Button kind="primary" size="lg" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
        {busy ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
