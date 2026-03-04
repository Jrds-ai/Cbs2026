'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Image from 'next/image';
import { CheckCircle2, X, ArrowLeft, ArrowRight, MessageSquare, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { createNotification } from '@/components/notification-provider';

type Page = {
    id: string;
    url: string;
    status: 'pending_review' | 'approved' | 'rejected' | 'regenerating' | 'generating';
    prompt: string;
    feedback: string;
    version: number;
    order: number;
    sourceImageUrl?: string;
};

export default function ReviewPage() {
    const params = useParams();
    const router = useRouter();
    const bookId = params.id as string;
    const { user } = useAuth();

    const [book, setBook] = useState<any>(null);
    const [pages, setPages] = useState<Page[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [rejectMode, setRejectMode] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Admin UID stored in env (or just check email for now)
    const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID || '';

    useEffect(() => {
        if (!user || !bookId) return;
        const fetch_ = async () => {
            try {
                const snap = await getDoc(doc(db as any, 'books', bookId));
                if (!snap.exists() || snap.data()?.userId !== user.uid) {
                    router.push('/library');
                    return;
                }
                const data = snap.data()!;
                setBook({ id: snap.id, ...data });
                const reviewable = (data.generatedPages || []).filter(
                    (p: Page) => ['pending_review', 'approved', 'rejected'].includes(p.status)
                );
                setPages(reviewable);
            } finally {
                setLoading(false);
            }
        };
        fetch_();
    }, [user, bookId, router]);

    const currentPage = pages[currentIdx];
    const approved = pages.filter(p => p.status === 'approved').length;
    const progress = pages.length > 0 ? Math.round((approved / pages.length) * 100) : 0;
    const allDone = approved === pages.length && pages.length > 0;

    const handleApprove = async () => {
        if (!currentPage || submitting) return;
        setSubmitting(true);
        try {
            const updatedPages = book.generatedPages.map((p: Page) =>
                p.id === currentPage.id ? { ...p, status: 'approved', feedback: '' } : p
            );
            await updateDoc(doc(db as any, 'books', bookId), { generatedPages: updatedPages });
            setBook((b: any) => ({ ...b, generatedPages: updatedPages }));
            setPages(prev => prev.map(p => p.id === currentPage.id ? { ...p, status: 'approved' } : p));
            if (currentIdx < pages.length - 1) setCurrentIdx(i => i + 1);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!currentPage || !feedback.trim() || submitting) return;
        setSubmitting(true);
        try {
            const updatedPages = book.generatedPages.map((p: Page) =>
                p.id === currentPage.id ? { ...p, status: 'rejected', feedback: feedback.trim() } : p
            );
            await updateDoc(doc(db as any, 'books', bookId), { generatedPages: updatedPages });

            // Notify admin
            if (ADMIN_UID) {
                await createNotification({
                    userId: ADMIN_UID,
                    type: 'page_rejected',
                    title: '❌ Page needs revision',
                    message: `"${book.title}" — Page ${currentPage.order + 1}: "${feedback.trim()}"`,
                    linkTo: `/admin/books/${bookId}`,
                    bookId,
                    pageId: currentPage.id,
                    read: false,
                    createdAt: null,
                });
            }

            setBook((b: any) => ({ ...b, generatedPages: updatedPages }));
            setPages(prev => prev.map(p => p.id === currentPage.id ? { ...p, status: 'rejected', feedback: feedback.trim() } : p));
            setFeedback('');
            setRejectMode(false);
            if (currentIdx < pages.length - 1) setCurrentIdx(i => i + 1);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (pages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Loader2 className="w-12 h-12 text-slate-300 animate-spin mb-4" />
                <h2 className="text-xl font-bold mb-2">Pages Not Ready Yet</h2>
                <p className="text-slate-500 dark:text-pink-200/60 mb-6">The AI is still generating your coloring pages. Check back soon!</p>
                <button onClick={() => router.push(`/books/${bookId}`)} className="px-6 py-3 rounded-2xl bg-primary text-white font-bold">Back to Book</button>
            </div>
        );
    }

    if (allDone) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="size-24 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">All pages approved! 🎉</h2>
                <p className="text-slate-500 dark:text-pink-200/60 mb-8 max-w-xs">Your coloring book is ready. We'll begin final production shortly.</p>
                <button onClick={() => router.push(`/books/${bookId}`)} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-lg shadow-primary/30">
                    Back to Book Dashboard
                </button>
            </div>
        );
    }

    const proxyUrl = currentPage?.url?.includes('firebasestorage.googleapis.com') || currentPage?.url?.includes('storage.googleapis.com')
        ? `/api/image-proxy?url=${encodeURIComponent(currentPage.url)}`
        : currentPage?.url;

    return (
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full pt-4 pb-32 px-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => router.push(`/books/${bookId}`)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <h1 className="font-bold text-slate-900 dark:text-white">{book?.title}</h1>
                    <p className="text-xs text-slate-500 dark:text-pink-200/60">{approved}/{pages.length} approved</p>
                </div>
                <div className="w-9" />
            </div>

            {/* Progress Bar */}
            <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 mb-6 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>

            {/* Page Navigation */}
            <div className="flex items-center justify-between mb-2">
                <button onClick={() => { setCurrentIdx(i => Math.max(0, i - 1)); setRejectMode(false); setFeedback(''); }}
                    disabled={currentIdx === 0} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold text-slate-500 dark:text-pink-200/60">
                    Page {currentIdx + 1} of {pages.length}
                    {currentPage?.version > 1 && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">v{currentPage.version}</span>}
                </span>
                <button onClick={() => { setCurrentIdx(i => Math.min(pages.length - 1, i + 1)); setRejectMode(false); setFeedback(''); }}
                    disabled={currentIdx === pages.length - 1} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all">
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>

            {/* Status Badge */}
            {currentPage && (
                <div className="flex justify-center mb-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${currentPage.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                            currentPage.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                        }`}>
                        {currentPage.status === 'approved' ? '✅ Approved' :
                            currentPage.status === 'rejected' ? '❌ Rejected — awaiting revision' :
                                '👀 Pending Review'}
                    </span>
                </div>
            )}

            {/* Image Preview */}
            <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-slate-100 dark:bg-white/5 mb-6 shadow-xl shadow-primary/10">
                {proxyUrl ? (
                    <Image src={proxyUrl} alt={`Page ${currentIdx + 1}`} fill sizes="100vw" className="object-contain" priority />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                )}
            </div>

            {/* Previous Feedback (if rejected) */}
            {currentPage?.status === 'rejected' && currentPage.feedback && (
                <div className="mb-4 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                    <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Your feedback
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">{currentPage.feedback}</p>
                </div>
            )}

            {/* Reject feedback textarea */}
            {rejectMode && (
                <div className="mb-4 animate-in slide-in-from-bottom-2">
                    <textarea
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        placeholder="What should be changed? (e.g. 'The dog's proportions look off, make the head smaller')"
                        rows={3}
                        className="w-full rounded-2xl border border-red-300 dark:border-red-500/40 bg-white dark:bg-white/5 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-400/50 resize-none"
                        autoFocus
                    />
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
            )}

            {/* Action Buttons — don't show for already-decided pages unless user wants to re-review */}
            <div className="flex gap-3">
                {rejectMode ? (
                    <>
                        <button onClick={() => { setRejectMode(false); setFeedback(''); setError(''); }} disabled={submitting}
                            className="flex-1 py-4 rounded-2xl font-bold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={() => { if (!feedback.trim()) { setError('Please add your feedback before submitting.'); return; } handleReject(); }}
                            disabled={submitting}
                            className="flex-[2] py-4 rounded-2xl font-bold bg-red-500 text-white shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 hover:bg-red-600 active:scale-[.98]">
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><X className="w-5 h-5" />Submit Feedback</>}
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => setRejectMode(true)} disabled={submitting || currentPage?.status === 'rejected'}
                            className="flex-1 py-4 rounded-2xl font-bold border-2 border-red-300 dark:border-red-500/40 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex items-center justify-center gap-2">
                            <X className="w-5 h-5" />
                            {currentPage?.status === 'rejected' ? 'Awaiting Fix' : 'Reject'}
                        </button>
                        <button onClick={handleApprove} disabled={submitting || currentPage?.status === 'approved'}
                            className={`flex-[2] py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${currentPage?.status === 'approved'
                                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-600 active:scale-[.98]'
                                }`}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" />{currentPage?.status === 'approved' ? 'Approved ✓' : 'Approve'}</>}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
