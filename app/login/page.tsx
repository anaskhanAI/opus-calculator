'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type View = 'login' | 'signup' | 'signup-done' | 'forgot' | 'forgot-sent'

const ALLOWED_DOMAIN = 'aaico.com'

function isDomainAllowed(email: string) {
  return email.trim().toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

export default function LoginPage() {
  const router = useRouter()
  const [view,      setView]      = useState<View>('login')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [fullName,  setFullName]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  function switchView(v: View) {
    setView(v)
    setError('')
  }

  // ── Sign in ────────────────────────────────────────────────────────────────
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!isDomainAllowed(email)) {
      setError(`Access is restricted to @${ALLOWED_DOMAIN} accounts.`)
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/calculator')
      router.refresh()
    }
  }

  // ── Sign up ────────────────────────────────────────────────────────────────
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!isDomainAllowed(email)) {
      setError(`Access is restricted to @${ALLOWED_DOMAIN} accounts.`)
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/calculator`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // If email confirmation is disabled in Supabase, the session is live immediately
    if (data.session) {
      router.push('/calculator')
      router.refresh()
    } else {
      // Email confirmation is enabled — show the "check your email" screen
      setView('signup-done')
      setLoading(false)
    }
  }

  // ── Forgot password ────────────────────────────────────────────────────────
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!isDomainAllowed(email)) {
      setError(`Access is restricted to @${ALLOWED_DOMAIN} accounts.`)
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setView('forgot-sent')
      setLoading(false)
    }
  }

  // ── Shared fields ──────────────────────────────────────────────────────────
  const emailField = (
    <div>
      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
        Email address
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={`you@${ALLOWED_DOMAIN}`}
        className={inputCls}
      />
    </div>
  )

  const passwordField = (autoComplete: string, label = 'Password') => (
    <div>
      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id="password"
        type="password"
        required
        autoComplete={autoComplete}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        className={inputCls}
      />
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="mb-8 text-center">
          <img src="/OpusLogo.png" alt="Opus" className="h-10 w-auto mx-auto mb-4" />
          <p className="text-sm text-gray-500">Solutions Delivery Pricing Calculator</p>
        </div>

        <div className="border border-gray-200 bg-white p-8 shadow-sm">

          {/* ── Tab switcher (login / signup) ──────────────────────────── */}
          {(view === 'login' || view === 'signup') && (
            <div className="flex bg-gray-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => switchView('login')}
                className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                  view === 'login'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchView('signup')}
                className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                  view === 'signup'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Create account
              </button>
            </div>
          )}

          {/* ── Sign in ──────────────────────────────────────────────────── */}
          {view === 'login' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              {emailField}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView('forgot')}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {/* ── Create account ────────────────────────────────────────────── */}
          {view === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full name
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className={inputCls}
                />
              </div>
              {emailField}
              {passwordField('new-password', 'Password (min. 8 characters)')}

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>

              <p className="text-xs text-center text-gray-400">
                New accounts are created as <span className="font-medium text-gray-500">Seller</span> by default.
                Contact your admin to get elevated access.
              </p>
            </form>
          )}

          {/* ── Sign-up confirmation (email verify enabled) ────────────── */}
          {view === 'signup-done' && (
            <div className="text-center py-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 mb-4">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Confirm your email</h2>
              <p className="text-sm text-gray-500">
                We sent a confirmation link to{' '}
                <span className="font-medium text-gray-700">{email}</span>.
                Click it to activate your account.
              </p>
              <button
                onClick={() => switchView('login')}
                className="mt-4 text-sm text-indigo-600 hover:text-indigo-800"
              >
                Back to sign in
              </button>
            </div>
          )}

          {/* ── Forgot password ───────────────────────────────────────────── */}
          {view === 'forgot' && (
            <>
              <button
                onClick={() => switchView('login')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 mb-4 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Sign in
              </button>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Reset your password</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <form onSubmit={handleForgot} className="space-y-4">
                {emailField}
                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          {/* ── Reset email sent ──────────────────────────────────────────── */}
          {view === 'forgot-sent' && (
            <div className="text-center py-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
              <p className="text-sm text-gray-500">
                A reset link was sent to{' '}
                <span className="font-medium text-gray-700">{email}</span>.
                Click it to set a new password.
              </p>
              <button
                onClick={() => switchView('login')}
                className="mt-4 text-sm text-indigo-600 hover:text-indigo-800"
              >
                Back to sign in
              </button>
            </div>
          )}

        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Internal use only
        </p>
      </div>
    </div>
  )
}
