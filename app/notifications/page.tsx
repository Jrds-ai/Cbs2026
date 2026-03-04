'use client';

import { Bell, ArrowLeft, Check, Trash2, MoreHorizontal, ImageIcon, AlertCircle, Package, Star, Heart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useNotifications, FirestoreNotification } from '@/components/notification-provider';

export default function NotificationsPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setMenuOpen(false);
  };

  const handleClick = async (n: FirestoreNotification) => {
    if (!n.read) await markAsRead(n.id);
    if (n.linkTo) router.push(n.linkTo);
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'pages_ready': case 'page_updated': return <ImageIcon className="w-5 h-5" />;
      case 'page_rejected': return <AlertCircle className="w-5 h-5" />;
      case 'order': return <Package className="w-5 h-5" />;
      case 'feature': return <Star className="w-5 h-5" />;
      case 'social': return <Heart className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'pages_ready': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'page_updated': return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
      case 'page_rejected': return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400';
      case 'order': return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300';
      case 'feature': return 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300';
      default: return 'bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-300';
    }
  };

  const formatTime = (ts: { seconds: number } | null) => {
    if (!ts) return 'just now';
    const d = new Date(ts.seconds * 1000);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="flex-1 flex flex-col px-6 pb-32 max-w-md mx-auto w-full pt-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="size-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white shadow-sm hover:scale-105 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Activity</h1>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="size-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className="absolute top-12 right-0 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-white/10 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
              <button
                onClick={handleMarkAllAsRead}
                className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Mark all as read
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left relative p-5 rounded-3xl border transition-all duration-300 ${n.read
                ? 'bg-white/50 dark:bg-white/5 border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md'
                : 'bg-white dark:bg-white/10 border-primary/20 shadow-md hover:shadow-lg'
                }`}
            >
              <div className="flex gap-4">
                <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${getIconColor(n.type)}`}>
                  {renderIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-bold text-base truncate ${!n.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-pink-200/80'}`}>{n.title}</h3>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-pink-200/30 uppercase whitespace-nowrap ml-2">{formatTime(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-pink-200/60 leading-relaxed">{n.message}</p>
                  {n.linkTo && <span className="text-xs font-bold text-primary dark:text-pink-400 mt-1 block">Tap to view →</span>}
                </div>
              </div>
              {!n.read && (
                <div className="absolute top-5 right-5 size-2 bg-primary rounded-full shadow-lg shadow-primary/50" />
              )}
            </button>
          ))
        ) : (
          <div className="py-20 flex flex-col items-center text-center">
            <div className="size-20 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-300 dark:text-white/10 mb-4">
              <Bell className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">All caught up!</h3>
            <p className="text-slate-500 dark:text-pink-200/60 max-w-[200px]">You have no notifications right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}