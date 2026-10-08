'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

export function NavBar() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-amber-100 bg-cream-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold text-neutral-900">
          <span className="text-2xl leading-none" role="img" aria-label="">
            🍳
          </span>
          Recipe System
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/recipes" className="font-medium text-neutral-600 transition-colors hover:text-orange-600">
            Browse
          </Link>
          {!loading && user && (
            <>
              <Link
                href="/recipes/new"
                className="rounded-full bg-orange-500 px-4 py-1.5 font-medium text-white shadow-sm transition-colors hover:bg-orange-600"
              >
                + New Recipe
              </Link>
              <span className="hidden text-neutral-400 sm:inline">{user.email}</span>
              <button onClick={() => logout()} className="text-neutral-600 transition-colors hover:text-orange-600">
                Log out
              </button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link href="/login" className="font-medium text-neutral-600 transition-colors hover:text-orange-600">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-neutral-900 px-4 py-1.5 font-medium text-white shadow-sm transition-colors hover:bg-neutral-700"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
