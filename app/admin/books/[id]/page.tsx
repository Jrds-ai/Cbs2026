'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import { ArrowLeft, Loader2, Zap, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, MessageSquare } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';

type Page = {
    id: string;
    url: string;
    status: 'generating' | 'pending_review' | 'approved' | 'rejected' | 'regenerating';
    prompt: string;
    feedback: string;
    version: number;
    order: number;
    sourceImageUrl?: string;
};

export default function AdminBookPage() {
    const params = useParams();
    const router = useRouter();
    const bookId = params.id as string;
    const { user } = useAuth();
    const isAdmin = useIsAdmin();

    const [book, setBook] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generatingAll, setGeneratingAll] = useState(false);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [editingPrompts, setEditingPrompts] = useState<Record<string, string>>({});
    const [basePrompt, setBasePrompt] = useState(
        `Transform this photo into a high-contrast, black-and-white line art coloring book page for children. Extract the main subjects and render them in clean simplified line art. Remove all color, shading, and backgrounds. Output: clean white paper with bold black outlines only — ready to print and color.`
    );
    const [progress, setProgress] = useState('');

    useEffect(() => {
        if (!isAdmin && user !== null) router.replace('/');
    }, [isAdmin, user, router]);

    const selectedModel = typeof window !== 'undefined' ? localStorage.getItem('admin_selected_model') || 'sourceful/riverflow-v2-standard-preview' : 'sourceful/riverflow-v2-standard-preview';
    const MODELS_USE_MODALITIES: Record<string, boolean> = {
        'sourceful/riverflow-v2-standard-preview': false,
        'google/gemini-2.5-flash-image': true,
        'google/gemini-3.1-flash-image-preview': true,
        'google/gemini-3-pro-image-preview': true,
        'openai/gpt-5-image-mini': true,
        'openai/gpt-5-image': true,
    };

    useEffect(() => {
        if (!user || !bookId) return;
        const fetchBook = async () => {
            try {
                const snap = await getDoc(doc(db as any, 'books', bookId));
                if (snap.exists()) setBook({ id: snap.id, ...snap.data() });
                else router.push('/admin/books');
            } finally {
                setLoading(false);
            }
        };
        fetchBook();
    }, [user, bookId, router]);

    const generatePage = async (sourceImageUrl: string, pageId: string, prompt: string): Promise<boolean> => {
        const res = await fetch('/api/generate-page', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bookId,
                bookUserId: book.userId,
                bookTitle: book.title,
                pageId,
                sourceImageUrl,
                prompt,
                model: selectedModel,
                useModalities: MODELS_USE_MODALITIES[selectedModel] ?? false,
            }),
        });
        const data = await res.json();
        return data.success;
    };

    const handleGenerateAll = async () => {
        if (!book?.sourceImages?.length) return;
        setGeneratingAll(true);
        setProgress('Starting generation...');

        const sourceImages: string[] = book.sourceImages;
        for (let i = 0; i < sourceImages.length; i++) {
            const pageId = `page_${Date.now()}_${i}`;
            setProgress(`Generating page ${i + 1} of ${sourceImages.length}...`);
            const ok = await generatePage(sourceImages[i], pageId, basePrompt);
            if (!ok) {
                setProgress(`Failed on page ${i + 1}. Stopping.`);
                setGeneratingAll(false);
                return;
            }
        }

        setProgress('All pages generated! User has been notified.');
        // Refresh book data
        const snap = await getDoc(doc(db as any, 'books', bookId));
        if (snap.exists()) setBook({ id: snap.id, ...snap.data() });
        setGeneratingAll(false);
    };

    const handleRegenerate = async (page: Page) => {
        setRegeneratingId(page.id);
        const prompt = editingPrompts[page.id] || basePrompt;
        const combinedPrompt = page.feedback
            ? `${prompt}\n\nUSER FEEDBACK TO ADDRESS: ${page.feedback}`
            : prompt;
        await generatePage(page.sourceImageUrl || book.sourceImages?.[page.order] || book.sourceImages?.[0], page.id, combinedPrompt);

        // Refresh book
        const snap = await getDoc(doc(db as any, 'books', bookId));
        if (snap.exists()) setBook({ id: snap.id, ...snap.data() });
        setRegeneratingId(null);
    };

    const generatedPages: Page[] = book?.generatedPages || [];
    const rejectedPages = generatedPages.filter(p => p.status === 'rejected');
    const pendingPages = generatedPages.filter(p => p.status === 'pending_review');
    const approvedPages = generatedPages.filter(p => p.status === 'approved');
    const sourceImages: string[] = book?.sourceImages || [];

    if (!isAdmin) return null;
    if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!book) return null;

    return (
        <div className="flex-1 min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white dark:bg-black/20 border-b border-slate-200 dark:border-white/10 px-6 py-4 backdrop-blur-md">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/admin/books')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="font-bold text-lg text-slate-900 dark:text-white">{book.title}</h1>
                            <p className="text-xs text-slate-500">{approvedPages.length}/{generatedPages.length} approved • {sourceImages.length} source photos</p>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${book.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                        book.status === 'InReview' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                        }`}>{book.status}</span>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-8 pb-32">
                {/* Base Prompt Editor */}
                <section className="bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
                    <h2 className="font-bold text-lg mb-3">Generation Prompt</h2>
                    <textarea
                        value={basePrompt}
                        onChange={e => setBasePrompt(e.target.value)}
                        rows={4}
                        className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none font-mono"
                    />

                    {generatedPages.length === 0 && (
                        <div className="mt-4">
                            {progress && <p className="text-sm text-primary dark:text-pink-400 font-medium mb-3">{progress}</p>}
                            <button
                                onClick={handleGenerateAll}
                                disabled={generatingAll || !sourceImages.length}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generatingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                {generatingAll ? progress : `Generate ${sourceImages.length} Pages`}
                            </button>
                        </div>
                    )}
                </section>

                {/* Rejected Pages — needs action */}
                {rejectedPages.length > 0 && (
                    <section className="bg-white dark:bg-white/5 rounded-3xl border border-red-200 dark:border-red-500/30 p-6 shadow-sm">
                        <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Rejected — Needs Revision ({rejectedPages.length})
                        </h2>
                        <p className="text-sm text-slate-500 mb-5">Review user feedback, edit the prompt if needed, and regenerate.</p>
                        <div className="space-y-6">
                            {rejectedPages.map((page) => {
                                const proxyUrl = page.url?.includes('googleapis.com')
                                    ? `/api/image-proxy?url=${encodeURIComponent(page.url)}`
                                    : page.url;
                                return (
                                    <div key={page.id} className="flex gap-4 p-4 rounded-2xl bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20">
                                        <div className="relative w-24 aspect-[3/4] rounded-xl overflow-hidden shrink-0">
                                            <Image src={proxyUrl} alt="rejected page" fill sizes="96px" className="object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                                                <MessageSquare className="w-3 h-3" /> User feedback
                                            </p>
                                            <p className="text-sm text-slate-700 dark:text-slate-200 mb-3 italic">"{page.feedback}"</p>
                                            <textarea
                                                value={editingPrompts[page.id] ?? basePrompt}
                                                onChange={e => setEditingPrompts(prev => ({ ...prev, [page.id]: e.target.value }))}
                                                rows={3}
                                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none font-mono mb-3"
                                                placeholder="Edit prompt for regeneration..."
                                            />
                                            <button
                                                onClick={() => handleRegenerate(page)}
                                                disabled={regeneratingId === page.id}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                                            >
                                                {regeneratingId === page.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                {regeneratingId === page.id ? 'Regenerating...' : 'Regenerate'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Pending Review Pages */}
                {pendingPages.length > 0 && (
                    <section className="bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" /> Awaiting User Review ({pendingPages.length})
                        </h2>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {pendingPages.map(page => {
                                const proxyUrl = page.url?.includes('googleapis.com')
                                    ? `/api/image-proxy?url=${encodeURIComponent(page.url)}`
                                    : page.url;
                                return (
                                    <div key={page.id} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-amber-300 dark:border-amber-500/40">
                                        <Image src={proxyUrl} alt="pending" fill sizes="120px" className="object-cover" />
                                        <div className="absolute inset-x-0 bottom-0 bg-amber-500/80 py-0.5 text-center text-[10px] font-bold text-white">Review</div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Approved Pages */}
                {approvedPages.length > 0 && (
                    <section className="bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Approved ({approvedPages.length})
                        </h2>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {approvedPages.map(page => {
                                const proxyUrl = page.url?.includes('googleapis.com')
                                    ? `/api/image-proxy?url=${encodeURIComponent(page.url)}`
                                    : page.url;
                                return (
                                    <div key={page.id} className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-emerald-400">
                                        <Image src={proxyUrl} alt="approved" fill sizes="120px" className="object-cover" />
                                        <div className="absolute top-1 right-1 size-5 bg-emerald-500 rounded-full flex items-center justify-center">
                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
