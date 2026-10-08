'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { ApiError } from '../../lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      router.push('/recipes');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-gradient-to-br from-amber-50 via-cream-50 to-orange-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-amber-100 bg-white p-8 shadow-xl shadow-orange-100/50">
        <div className="text-center">
          <span className="text-4xl" role="img" aria-label="">
            🍳
          </span>
          <h1 className="mt-2 font-display text-2xl font-bold text-neutral-900">Welcome back</h1>
          <p className="mt-1 text-sm text-neutral-500">Log in to cook up your next recipe.</p>
        </div>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-orange-500 px-3 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            {busy ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-500">
          New here?{' '}
          <Link href="/register" className="font-medium text-orange-600 hover:underline">
            Create an account
          </Link>
        </p>
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-neutral-500">
          Demo account: <code>demo@recipes.local</code> / <code>ChangeMe123!</code>
        </p>
      </div>
    </main>
  );
}
