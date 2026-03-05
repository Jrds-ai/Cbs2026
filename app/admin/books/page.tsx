'use client';

import { useAuth } from '@/components/auth-provider';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { ArrowLeft, BookOpen, Users, AlertTriangle, Clock, CheckCircle2, Loader2 } from 'lucide-react';

export default function AdminBooksPage() {
    const { user } = useAuth();
    const isAdmin = useIsAdmin();
    const router = useRouter();
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAdmin && user !== null) router.replace('/');
    }, [isAdmin, user, router]);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const snap = await getDocs(query(collection(db as any, 'books'), orderBy('createdAt', 'desc')));
                setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const getStatusIcon = (status: string) => {
        if (status === 'Completed') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        if (status === 'InReview') return <Clock className="w-4 h-4 text-blue-500" />;
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    };

    const getRejectedCount = (book: any) => {
        return (book.generatedPages || []).filter((p: any) => p.status === 'rejected').length;
    };

    if (!isAdmin) return null;

    return (
        <div className="flex-1 flex flex-col px-4 pb-32 max-w-2xl mx-auto w-full pt-6 animate-fade-in">
            <div className="pb-6">
                <Link href="/admin" className="flex items-center gap-2 text-slate-500 dark:text-pink-200/60 text-sm font-medium mb-4 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Admin
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Books</h1>
                <p className="text-sm text-slate-500 dark:text-pink-200/60">{books.length} total • {books.filter(b => b.status === 'Processing').length} awaiting generation</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : books.length === 0 ? (
                <div className="text-center py-16 text-slate-400">No books yet.</div>
            ) : (
                <div className="space-y-3">
                    {books.map(book => {
                        const rejected = getRejectedCount(book);
                        const pages = book.generatedPages || [];
                        return (
                            <Link key={book.id} href={`/admin/books/${book.id}`}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:shadow-md transition-all group">
                                <div className="size-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-slate-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-900 dark:text-white truncate">{book.title}</p>
                                        {rejected > 0 && (
                                            <span className="shrink-0 text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 px-2 py-0.5 rounded-full">
                                                {rejected} rejected
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-pink-200/50 mt-0.5">
                                        {(book.sourceImages || []).length} photos • {pages.length} pages generated
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getStatusIcon(book.status)}
                                    <span className="text-xs font-bold text-slate-500 group-hover:text-primary transition-colors">Open →</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
