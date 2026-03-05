'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';
import { ArrowLeft, Loader2, Check, X, AlertCircle, ArrowRight, MessageSquare, Sparkles, Star } from 'lucide-react';

export default function ReviewPage() {
    const params = useParams();
    const router = useRouter();
    const bookId = params.id as string;
    const { user } = useAuth();

    const [book, setBook] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [pendingPages, setPendingPages] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRejecting, setIsRejecting] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [saving, setSaving] = useState(false);

    // Cover review state
    const [coverPhase, setCoverPhase] = useState(false);
    const [coverRejectionNotes, setCoverRejectionNotes] = useState('');
    const [isRejectingCover, setIsRejectingCover] = useState(false);
    const [coverSaving, setCoverSaving] = useState(false);

    useEffect(() => {
        if (!user || !bookId) return;
        const fetchBook = async () => {
            try {
                const snap = await getDoc(doc(db as any, 'books', bookId));
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.userId !== user.uid) {
                        router.push('/library');
                        return;
                    }
                    setBook({ id: snap.id, ...data });
                    const pages = data.generatedPages || [];
                    setPendingPages(pages.filter((p: any) => p.status === 'pending_review'));
                    if (data.status === 'CoverUpdated') {
                        setCoverPhase(true);
                    }
                } else {
                    router.push('/library');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchBook();
    }, [user, bookId, router]);

    // --- Cover Actions ---
    const handleCoverApprove = async () => {
        setCoverSaving(true);
        try {
            await updateDoc(doc(db as any, 'books', bookId), {
                status: pendingPages.length > 0 ? 'InReview' : book.status,
                coverApproved: true,
                updatedAt: serverTimestamp(),
            });
            setCoverPhase(false);
            if (pendingPages.length === 0) {
                router.push(`/books/${bookId}`);
            }
        } catch (err) {
            console.error('Failed to approve cover', err);
        } finally {
            setCoverSaving(false);
        }
    };

    const handleCoverReject = async () => {
        if (!coverRejectionNotes.trim()) return;
        setCoverSaving(true);
        try {
            await updateDoc(doc(db as any, 'books', bookId), {
                status: 'CoverReview',
                coverRevisionNotes: coverRejectionNotes,
                updatedAt: serverTimestamp(),
            });
            await addDoc(collection(db as any, 'notifications'), {
                userId: 'admin',
                type: 'cover_review_requested',
                bookId,
                title: 'Cover Rejected Again',
                bookTitle: book.title,
                message: `User rejected the updated cover: "${coverRejectionNotes}"`,
                read: false,
                createdAt: serverTimestamp(),
            });
            router.push(`/books/${bookId}`);
        } catch (err) {
            console.error('Failed to reject cover', err);
        } finally {
            setCoverSaving(false);
        }
    };

    // --- Page Actions ---
    const handleAction = async (status: 'approved' | 'rejected') => {
        if (status === 'rejected' && !feedback.trim()) return;
        setSaving(true);
        try {
            const currentPage = pendingPages[currentIndex];
            const allPages = [...book.generatedPages];
            const index = allPages.findIndex((p: any) => p.id === currentPage.id);
            if (index >= 0) {
                allPages[index] = { ...allPages[index], status, feedback: status === 'rejected' ? feedback : '' };
            }
            const newlyPending = allPages.filter((p: any) => p.status === 'pending_review');
            const rejectedCount = allPages.filter((p: any) => p.status === 'rejected').length;
            const updates: any = { generatedPages: allPages };
            if (newlyPending.length === 0 && rejectedCount === 0) {
                updates.status = 'Completed';
            }
            await updateDoc(doc(db as any, 'books', bookId), updates);
            setBook({ ...book, ...updates });
            setIsRejecting(false);
            setFeedback('');
            setCurrentIndex(prev => prev + 1);
        } catch (err) {
            console.error('Failed to update page', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!book) return null;

    // ===== COVER REVIEW PHASE =====
    if (coverPhase && book.image) {
        const proxyUrl = book.image?.includes('googleapis.com')
            ? `/api/image-proxy?url=${encodeURIComponent(book.image)}`
            : book.image;

        return (
            <div className="flex-1 min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
                <div className="bg-white dark:bg-black/20 border-b border-slate-200 dark:border-white/10 px-6 py-4 sticky top-0 z-20 backdrop-blur-md">
                    <div className="max-w-4xl mx-auto flex items-center gap-4">
                        <button onClick={() => router.push(`/books/${bookId}`)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="font-bold text-lg text-slate-900 dark:text-white">Your Updated Cover</h1>
                            <p className="text-xs text-slate-500">{book.title}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full p-6 gap-8 pb-32">
                    <div className="flex-1 flex items-center justify-center">
                        <div className="relative w-full max-w-xs">
                            <div className="absolute -inset-4 rounded-[40px] opacity-40 blur-2xl"
                                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899, #6366f1)' }} />
                            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-700">
                                <Image src={proxyUrl} alt="Updated Cover" fill className="object-cover" />
                            </div>
                            <div className="absolute -top-3 -right-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Updated!
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-80 shrink-0 flex flex-col gap-4">
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-3xl border border-purple-100 dark:border-purple-500/20 p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Star className="w-5 h-5 text-purple-500" fill="currentColor" />
                                <h2 className="text-xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    We Updated Your Cover!
                                </h2>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-purple-200/70 leading-relaxed">
                                Our team revised your cover based on your feedback. Take a good look — does it feel right?
                            </p>
                        </div>

                        <div className="bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-sm flex flex-col gap-3">
                            {!isRejectingCover ? (
                                <>
                                    <button
                                        onClick={handleCoverApprove}
                                        disabled={coverSaving}
                                        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}
                                    >
                                        {coverSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                        Love It! ✨
                                    </button>
                                    <button
                                        onClick={() => setIsRejectingCover(true)}
                                        disabled={coverSaving}
                                        className="flex items-center justify-center gap-2 w-full py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-500/10 dark:hover:border-red-500/30 rounded-2xl font-bold transition-all disabled:opacity-50"
                                    >
                                        <X className="w-5 h-5" />
                                        Still Not Quite Right
                                    </button>
                                </>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-bottom-4">
                                    <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-red-500" /> What still needs changing?
                                    </label>
                                    <textarea
                                        autoFocus
                                        value={coverRejectionNotes}
                                        onChange={e => setCoverRejectionNotes(e.target.value)}
                                        placeholder="e.g. Make the font bigger, try a watercolor style..."
                                        rows={4}
                                        className="w-full rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none mb-4"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsRejectingCover(false)} disabled={coverSaving} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCoverReject}
                                            disabled={coverSaving || !coverRejectionNotes.trim()}
                                            className="flex-1 flex justify-center items-center py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/20 disabled:opacity-50 transition-all"
                                        >
                                            {coverSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Feedback'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-3xl p-5 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700 dark:text-blue-200 leading-relaxed">
                                Approving locks this cover in. You can then continue reviewing your coloring pages.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ===== ALL CAUGHT UP =====
    if (currentIndex >= pendingPages.length) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-6 animate-fade-in text-center">
                <div className="size-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <Check className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">You&apos;re all caught up!</h1>
                <p className="text-slate-500 dark:text-pink-200/60 max-w-sm mb-8 leading-relaxed">
                    You have reviewed all pending pages for &quot;{book.title}&quot;.
                    {book.status === 'Completed' ? ' Everything looks perfect!' : ' We will notify you when the admin has revised your rejected pages.'}
                </p>
                <button
                    onClick={() => router.push(`/books/${bookId}`)}
                    className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-xl shadow-primary/30 hover:scale-105 transition-all"
                >
                    Return to Dashboard <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        );
    }

    // ===== PAGE REVIEW PHASE =====
    const currentPage = pendingPages[currentIndex];
    const proxyUrl = currentPage.url.includes('googleapis.com')
        ? `/api/image-proxy?url=${encodeURIComponent(currentPage.url)}`
        : currentPage.url;
    const progressPerc = Math.round((currentIndex / pendingPages.length) * 100);

    return (
        <div className="flex-1 min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
            <div className="bg-white dark:bg-black/20 border-b border-slate-200 dark:border-white/10 px-6 py-4 sticky top-0 z-20 backdrop-blur-md">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push(`/books/${bookId}`)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="font-bold text-lg text-slate-900 dark:text-white">Reviewing Pages</h1>
                            <p className="text-xs text-slate-500">{book.title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-500">{currentIndex + 1} of {pendingPages.length}</span>
                        <div className="w-32 h-2.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progressPerc}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full p-6 gap-8 pb-32">
                <div className="flex-1 flex items-center justify-center bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 p-4 md:p-8 shadow-sm">
                    <div className="relative w-full max-w-lg aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800">
                        <Image src={proxyUrl} alt="Page Review" fill className="object-cover" />
                    </div>
                </div>

                <div className="w-full md:w-80 shrink-0 flex flex-col gap-4">
                    <div className="bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
                        <h2 className="text-xl font-bold mb-2">Review Page</h2>
                        <p className="text-sm text-slate-500 dark:text-pink-200/60 leading-relaxed mb-6">
                            Check this line art carefully. Does it look ready to be colored?
                        </p>

                        {!isRejecting ? (
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => handleAction('approved')}
                                    disabled={saving}
                                    className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    Approve Page
                                </button>
                                <button
                                    onClick={() => setIsRejecting(true)}
                                    disabled={saving}
                                    className="flex items-center justify-center gap-2 w-full py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-500/10 dark:hover:border-red-500/30 rounded-2xl font-bold transition-all disabled:opacity-50"
                                >
                                    <X className="w-5 h-5" />
                                    Reject &amp; Provide Feedback
                                </button>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-4">
                                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-red-500" /> What needs fixing?
                                </label>
                                <textarea
                                    autoFocus
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                    placeholder="e.g. The character's face looks distorted..."
                                    rows={4}
                                    className="w-full rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none mb-4"
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => setIsRejecting(false)} disabled={saving} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleAction('rejected')}
                                        disabled={saving || !feedback.trim()}
                                        className="flex-1 flex justify-center items-center py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/20 disabled:opacity-50 transition-all"
                                    >
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-3xl p-5 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 dark:text-blue-200 leading-relaxed">
                            Approved pages are locked in and will be part of your final coloring book. Rejected pages are sent back to our team to regenerate based on your feedback.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
