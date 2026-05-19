'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Library, Plus, Settings, Users } from 'lucide-react';
import { useAuth } from './auth-provider';
import { shouldHideBottomNav } from '@/lib/navigation';

export function BottomNav() {
  const pathname = usePathname();

  const { user } = useAuth();

  if (shouldHideBottomNav(pathname, Boolean(user))) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 w-full z-20 bg-background-light/90 dark:bg-background-dark/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        <Link href="/" className="flex flex-col items-center gap-1 w-14 group">
          <Home className={`w-5 h-5 ${pathname === '/' ? 'text-primary dark:text-pink-400' : 'text-slate-400 dark:text-pink-200/40 group-hover:text-primary dark:group-hover:text-pink-300'} transition-colors`} />
          <span className={`text-[10px] font-medium ${pathname === '/' ? 'text-primary dark:text-pink-400' : 'text-slate-400 dark:text-pink-200/40 group-hover:text-primary dark:group-hover:text-pink-300'} transition-colors`}>Home</span>
        </Link>
        <Link href="/library" className="flex flex-col items-center gap-1 w-14 group">
          <Library className={`w-5 h-5 ${pathname === '/library' ? 'text-primary dark:text-pink-400' : 'text-slate-400 dark:text-pink-200/40 group-hover:text-primary dark:group-hover:text-pink-300'} transition-colors`} />
          <span className={`text-[10px] font-medium ${pathname === '/library' ? 'text-primary dark:text-pink-400' : 'text-slate-400 dark:text-pink-200/40 group-hover:text-primary dark:group-hover:text-pink-300'} transition-colors`}>Library</span>
        </Link>
        <div className="relative -top-6">
          <Link href="/create/step-1" className="size-12 rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
            <Plus className="w-7 h-7" />
          </Link>
        </div>
        <Link href="/community" className="flex flex-col items-center gap-1 w-14 group">
          <Users className={`w-5 h-5 ${pathname === '/community' ? 'text-primary dark:text-pink-400' : 'text-slate-400 dark:text-pink-200/40 group-hover:text-primary dark:group-hover:text-pink-300'} transition-colors`} />
          <span className={`text-[10px] font-medium ${pathname === '/community' ? 'text-primary dark:text-pink-400' : 'text-slate-400 dark:text-pink-200/40 group-hover:text-primary dark:group-hover:text-pink-300'} transition-colors`}>Showcase</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 w-14 group">
          <Settings className={`w-5 h-5 ${pathname === '/settings' ? 'text-primary dark:text-pink-400' : 'text-slate-400 dark:text-pink-200/40 group-hover:text-primary dark:group-hover:text-pink-300'} transition-colors`} />
          <span className={`text-[10px] font-medium ${pathname === '/settings' ? 'text-primary dark:text-pink-400' : 'text-slate-400 dark:text-pink-200/40 group-hover:text-primary dark:group-hover:text-pink-300'} transition-colors`}>Settings</span>
        </Link>
      </div>
    </div>
  );
}
