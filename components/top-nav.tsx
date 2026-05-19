'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Bell, User, MoreVertical } from 'lucide-react';
import { useAuth } from './auth-provider';
import { useNotifications } from './notification-provider';
import { shouldHideTopNav } from '@/lib/navigation';

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  if (shouldHideTopNav(pathname, Boolean(user))) {
    return null;
  }

  const isCreateFlow = pathname.startsWith('/create');
  const isReview = pathname.includes('/review');

  return (
    <div className="flex items-center px-6 py-4 justify-between sticky top-0 z-30 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl border-b border-primary/10 dark:border-white/5">
      {isCreateFlow || isReview ? (
        <button onClick={() => router.back()} className="text-slate-900 dark:text-pink-100 flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors active:scale-95">
          <ArrowLeft className="w-6 h-6" />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl overflow-hidden relative shadow-lg shadow-primary/30">
            <Image src="/logo.png" alt="Coloring Book Studio Logo" fill sizes="36px" className="object-cover" />
          </div>
          <span className="font-bold text-lg tracking-tight text-primary dark:text-pink-400">Coloring Book Studio</span>
        </div>
      )}

      {isCreateFlow || isReview ? (
        <>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl overflow-hidden relative shadow-lg shadow-primary/30">
              <Image src="/logo.png" alt="Coloring Book Studio Logo" fill sizes="32px" className="object-cover" />
            </div>
            <span className="font-bold text-lg tracking-tight text-primary dark:text-pink-400">
              {isReview ? 'Review Page' : 'Coloring Book Studio'}
            </span>
          </div>
          <div className="size-10 flex items-center justify-center">
            <button className="size-8 rounded-full bg-primary/10 dark:bg-primary/30 flex items-center justify-center">
              {isReview ? <MoreVertical className="w-4 h-4 text-primary dark:text-pink-200" /> : <User className="w-4 h-4 text-primary dark:text-pink-200" />}
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <Link href="/notifications" className="relative size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <Bell className="w-6 h-6 text-slate-600 dark:text-pink-200" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 size-2.5 bg-accent-yellow rounded-full ring-2 ring-background-light dark:ring-background-dark"></span>
            )}
          </Link>
          <div className="size-10 flex items-center justify-center relative group cursor-pointer" onClick={logout}>
            <div className="size-9 rounded-full bg-primary/10 dark:bg-primary/30 flex items-center justify-center border border-primary/20 overflow-hidden">
              <User className="w-5 h-5 text-primary dark:text-pink-200" />
            </div>
            <div className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-background-dark border border-slate-200 dark:border-white/10 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="p-2 text-sm text-center text-red-500 font-medium">Logout</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
