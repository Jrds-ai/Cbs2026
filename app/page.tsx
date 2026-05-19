'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import Link from 'next/link';
import { Brush, ArrowRight, Rocket, Lightbulb } from 'lucide-react';
import { LandingPage } from '@/components/LandingPage';

export default function Dashboard() {

  const { user } = useAuth();

  const [recentBooks, setRecentBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRecent = async () => {
      try {
        const { db } = await import('@/lib/firebase');
        if (!db) return;
        const { collection, query, where, getDocs, orderBy, limit } = await import('firebase/firestore');
        const q = query(
          collection(db, 'books'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled Book',
            subtitle: `For: ${user.name}`,
            status: data.status || 'Completed',
            statusColor: data.status === 'Completed' ? 'text-green-500 bg-green-500/10' : 'text-accent-blue bg-accent-blue/10',
            time: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Just now',
            icon: <Brush className="w-8 h-8" />,
            color: 'from-primary to-secondary'
          };
        });
        setRecentBooks(fetched);
      } catch (error) {
        console.error("Error fetching recent books:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecent();
  }, [user]);

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="flex-1 flex flex-col px-6 pb-32 max-w-md mx-auto w-full pt-6 animate-fade-in">
      <div className="pb-8">
        <h1 className="text-3xl font-bold leading-tight mb-2 tracking-tight text-slate-900 dark:text-white">
          Hello, {user.name}! <span className="inline-block animate-bounce">👋</span>
        </h1>
        <p className="text-slate-500 dark:text-pink-200/70 text-base leading-relaxed">
          Ready to create some magic today?
        </p>
      </div>

      <Link href="/create/step-1" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary p-6 text-white shadow-xl shadow-primary/20 mb-8 group cursor-pointer transition-transform hover:scale-[1.01] block">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-yellow/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col h-full justify-between gap-6">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <Brush className="w-8 h-8" />
            </div>
            <span className="bg-white/20 backdrop-blur-md text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">New</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Create New Book</h2>
            <p className="text-white/80 text-sm mb-4">Turn your ideas into a beautiful custom coloring book in minutes.</p>
            <div className="w-full bg-white text-primary font-bold py-3.5 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 group-hover:bg-pink-50 transition-colors">
              <span>Start Your Masterpiece</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Projects</h3>
        {recentBooks.length > 0 && (
          <Link href="/library" className="text-primary dark:text-pink-400 text-sm font-semibold hover:opacity-80 transition-opacity">See All</Link>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="w-full h-24 rounded-3xl bg-slate-100 dark:bg-white/5 animate-pulse"></div>
        ) : recentBooks.length > 0 ? (
          recentBooks.map(book => (
            <ProjectCard
              key={book.id}
              icon={book.icon}
              color={book.color}
              status={book.status}
              statusColor={book.statusColor}
              time={book.time}
              title={book.title}
              subtitle={book.subtitle}
            />
          ))
        ) : (
          <div className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 text-center shadow-sm">
            <Rocket className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-3" />
            <h4 className="font-bold text-slate-900 dark:text-white mb-1">No projects yet</h4>
            <p className="text-sm text-slate-500 dark:text-pink-200/60">Your magical creations will appear here.</p>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl relative overflow-hidden p-[2px] bg-gradient-to-r from-accent-blue via-primary to-accent-yellow shadow-lg shadow-primary/10 dark:shadow-none">
        <div className="relative rounded-[22px] bg-white/95 dark:bg-[#3d0023]/95 backdrop-blur-sm p-5 flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Pro Tip</h3>
            <p className="text-sm text-slate-500 dark:text-pink-200/70 leading-tight mt-1">Detailed descriptions help AI generate better images.</p>
          </div>
          <div className="absolute -right-6 -top-6 size-24 bg-primary/20 rounded-full blur-xl"></div>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ icon, color, status, statusColor, time, title, subtitle }: any) {
  return (
    <Link href="/create/preview" className="group relative block">
      <div className="relative overflow-hidden flex flex-row gap-4 rounded-3xl bg-white dark:bg-white/5 p-4 border border-slate-100 dark:border-white/5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/30 dark:hover:border-primary/30 cursor-pointer">
        <div className={`size-20 shrink-0 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md`}>
          {icon}
        </div>
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${statusColor}`}>{status}</span>
            <span className="text-xs text-slate-400 dark:text-pink-200/40">{time}</span>
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white truncate text-lg group-hover:text-primary transition-colors">{title}</h4>
          <p className="text-sm text-slate-500 dark:text-pink-200/60 truncate">{subtitle}</p>
        </div>
      </div>
    </Link>
  );
}
