'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'verifying'>('idle');
  const [error, setError] = useState('');
  const { loginWithGoogle, sendMagicLink, verifyMagicLink } = useAuth();

  useEffect(() => {
    Promise.resolve().then(() => {
      if (typeof window !== 'undefined' && window.location.href.includes('apiKey=')) {
        setStatus('verifying');
        let savedEmail = window.localStorage.getItem('emailForSignIn');
        if (!savedEmail) {
          savedEmail = window.prompt('Please provide your email for confirmation');
        }
        if (savedEmail) {
          verifyMagicLink(savedEmail, window.location.href)
            .catch(err => {
              setError('Failed to verify magic link. It may have expired.');
              setStatus('idle');
            });
        } else {
          setError('Email is required to verify the magic link.');
          setStatus('idle');
        }
      }
    });
  }, [verifyMagicLink]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      // Save name so we can update profile after magic link verification
      window.localStorage.setItem('nameForSignUp', name);
      await sendMagicLink(email);
      setStatus('sent');
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
      setStatus('idle');
    }
  };

  if (status === 'verifying') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background-light dark:bg-background-dark">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verifying your magic link...</h2>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background-light dark:bg-background-dark">
      <div className="w-full max-w-md flex flex-col items-center animate-fade-in">
        <div className="size-24 rounded-3xl overflow-hidden shadow-xl shadow-primary/30 mb-8 relative">
          <Image src="/logo.png" alt="Coloring Book Studio Logo" fill sizes="96px" className="object-cover" />
        </div>

        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 text-center">Coloring Book Studio</h1>
        <p className="text-slate-500 dark:text-pink-200/70 text-center mb-8">Join the magic and start creating.</p>

        {status === 'sent' ? (
          <div className="w-full bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl p-6 flex flex-col items-center text-center animate-fade-in">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Check your email</h3>
            <p className="text-sm text-slate-500 dark:text-pink-200/70">
              We&apos;ve sent a magic link to <strong>{email}</strong>. Click the link to sign in instantly.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-6 text-sm font-bold text-primary dark:text-pink-400 hover:underline"
            >
              Try a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-pink-200/50 mb-1.5 ml-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                className={`w-full bg-white dark:bg-white/5 border ${error && !name ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-white/10 focus:border-primary focus:ring-primary'} rounded-2xl py-4 px-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:ring-1 transition-all`}
                placeholder="Jane Doe"
                disabled={status === 'loading'}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-pink-200/50 mb-1.5 ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                className={`w-full bg-white dark:bg-white/5 border ${error && email ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-white/10 focus:border-primary focus:ring-primary'} rounded-2xl py-4 px-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:ring-1 transition-all`}
                placeholder="you@example.com"
                disabled={status === 'loading'}
                suppressHydrationWarning
              />
              {error && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</p>}
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full group bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg py-4 px-8 rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:pointer-events-none"
            >
              {status === 'loading' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Send Magic Link</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="w-full my-6 flex items-center gap-4">
          <div className="h-px bg-slate-200 dark:bg-white/10 flex-1"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/30">Or continue with</span>
          <div className="h-px bg-slate-200 dark:bg-white/10 flex-1"></div>
        </div>

        <button
          onClick={loginWithGoogle}
          className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-bold text-base py-4 px-8 rounded-2xl shadow-sm hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>Google</span>
        </button>

        <p className="mt-8 text-slate-500 dark:text-pink-200/60 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-primary dark:text-pink-400 font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
