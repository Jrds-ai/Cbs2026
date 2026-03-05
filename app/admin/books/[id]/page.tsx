'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useEffect, useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Loader2, Zap, RefreshCw, CheckCircle2, Clock, AlertTriangle, MessageSquare, Save, Settings, Trash2, History, X } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';

type Page = {
    id: string;
    url: string;
    status: 'generating' | 'pending_review' | 'approved' | 'rejected' | 'regenerating' | 'generated';
    prompt: string;
    feedback: string;
    version: number;
    order: number;
    sourceImageUrl?: string;
    history?: { url: string; prompt: string; feedback: string; version: number }[];
};

type SavedPrompt = {
    id: string;
    name: string;
    content: string;
    history?: { content: string; timestamp: any }[];
    lastGeneratedImageUrl?: string;
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
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [editingPrompts, setEditingPrompts] = useState<Record<string, string>>({});
    const [basePrompt, setBasePrompt] = useState(
        `Transform this photo into a high-contrast, black-and-white line art coloring book page for children. Extract the main subjects and render them in clean simplified line art. Remove all color, shading, and backgrounds. Output: clean white paper with bold black outlines only — ready to print and color.`
    );
    const [progress, setProgress] = useState('');

    // Prompt Management State
    const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
    const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
    const [isManagePromptsOpen, setIsManagePromptsOpen] = useState(false);
    const [isEditingPrompt, setIsEditingPrompt] = useState<SavedPrompt | null>(null);

    const [selectedModel, setSelectedModel] = useState<string>('sourceful/riverflow-v2-standard-preview');
    const [autoSendToUser, setAutoSendToUser] = useState<boolean>(true);
    const [isRegeneratingCover, setIsRegeneratingCover] = useState(false);
    const [coverPrompt, setCoverPrompt] = useState('');
    const [coverSourceIdx, setCoverSourceIdx] = useState(0); // which source image to use for cover regen
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null); // for full-size image preview

    useEffect(() => {
        if (!isAdmin && user !== null) router.replace('/');
    }, [isAdmin, user, router]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedModel = localStorage.getItem('admin_selected_model');
            if (savedModel) setSelectedModel(savedModel);

            const savedAutoSend = localStorage.getItem('admin_auto_send');
            if (savedAutoSend !== null) setAutoSendToUser(savedAutoSend === 'true');
        }
    }, []);

    const handleModelChange = (model: string) => {
        setSelectedModel(model);
        if (typeof window !== 'undefined') {
            localStorage.setItem('admin_selected_model', model);
        }
    };

    const handleAutoSendChange = (val: boolean) => {
        setAutoSendToUser(val);
        if (typeof window !== 'undefined') {
            localStorage.setItem('admin_auto_send', val.toString());
        }
    };
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
                if (snap.exists()) {
                    const data = snap.data();
                    setBook({ id: snap.id, ...data });
                    if (data.coverPrompt) setCoverPrompt(data.coverPrompt);
                    else {
                        // Default cover prompt if not set
                        const savedTitle = data.title || 'Coloring Book';
                        setCoverPrompt(`This GPT acts as a creative assistant that transforms uploaded images into printable, blank coloring book pages. It uses the content and theme of the image as inspiration, applying generative fill techniques to extend the image to fit a standard 8.5"x11" paper size (specifically 800px by 1000px). The image is used for inspiration. The GPT extracts cute and fun visual elements from the image—such as characters, animals, patterns, or objects—and stylizes them into simplified, line-art style drawings suitable for coloring. It ensures all output is high contrast, clean, and ready for printing. It avoids shading, gray tones, or dense textures. If there is ambiguity in the image content, the GPT leans toward whimsical interpretations that are engaging for kids or casual coloring. The assistant can also add simple themed borders or extras like stars, hearts, or themed accessories, depending on the subject matter. If no image is provided, it requests one before proceeding. Importantly, integrate the text "${savedTitle}" elegantly into the design as the title of this cover page.`);
                    }
                }
                else router.push('/admin/books');
            } finally {
                setLoading(false);
            }
        };

        const fetchPrompts = async () => {
            try {
                const snap = await getDocs(collection(db as any, 'prompts'));
                const promptsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedPrompt));
                setSavedPrompts(promptsData);
            } catch (err) {
                console.error("Failed to fetch prompts:", err);
            }
        };

        fetchBook();
        fetchPrompts();
    }, [user, bookId, router]);

    const generatePage = async (sourceImageUrl: string, pageId: string, prompt: string, orderIndex: number): Promise<boolean> => {
        try {
            const res = await fetch('/api/generate-page', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId,
                    bookUserId: book.userId,
                    bookTitle: book.title,
                    pageId,
                    image: sourceImageUrl, // Fix: Changed from sourceImageUrl to image
                    prompt,
                    model: selectedModel,
                    useModalities: MODELS_USE_MODALITIES[selectedModel] ?? false,
                }),
            });
            const data = await res.json();
            if (!data.success || !data.image) {
                console.error("API Error:", data.error);
                return false;
            }

            // Upload the returned Base64 image to Firebase Storage
            const imageRef = ref(storage as any, `users/${book.userId}/books/${bookId}/pages/${pageId}.jpg`);
            await uploadString(imageRef, data.image, 'data_url');
            const downloadUrl = await getDownloadURL(imageRef);

            // Fetch latest book doc to avoid race condition overwrites
            const bookRef = doc(db as any, 'books', bookId);
            const snap = await getDoc(bookRef);
            const currentData = snap.data() || {};
            const currentPages: Page[] = currentData.generatedPages || [];

            const existingIndex = currentPages.findIndex(p => p.id === pageId);
            if (existingIndex >= 0) {
                const prev = currentPages[existingIndex];
                const newHistory = prev.history || [];
                // Push current state into history before overwriting
                if (prev.url) {
                    newHistory.push({
                        url: prev.url,
                        prompt: prev.prompt || '',
                        feedback: prev.feedback || '',
                        version: prev.version || 1
                    });
                }

                currentPages[existingIndex] = {
                    ...prev,
                    url: downloadUrl,
                    status: autoSendToUser ? 'pending_review' : 'generated',
                    version: (prev.version || 1) + 1,
                    prompt,
                    history: newHistory
                };
            } else {
                currentPages.push({
                    id: pageId,
                    url: downloadUrl,
                    status: autoSendToUser ? 'pending_review' : 'generated',
                    prompt,
                    feedback: '',
                    version: 1,
                    order: orderIndex,
                    sourceImageUrl
                });
            }

            await updateDoc(bookRef, { generatedPages: currentPages });

            // Update prompt's lastGeneratedImageUrl if a saved prompt was used
            if (selectedPromptId) {
                try {
                    await updateDoc(doc(db as any, 'prompts', selectedPromptId), {
                        lastGeneratedImageUrl: downloadUrl
                    });
                    // Update local state so it shows up immediately in the manager
                    setSavedPrompts(prev => prev.map(p =>
                        p.id === selectedPromptId ? { ...p, lastGeneratedImageUrl: downloadUrl } : p
                    ));
                } catch (err) {
                    console.error("Failed to update prompt image:", err);
                }
            }

            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const handleGenerateAll = async () => {
        if (!book?.sourceImages?.length) return;
        setGeneratingAll(true);
        setProgress('Starting generation...');

        const sourceImages: string[] = book.sourceImages;
        let successCount = 0;
        for (let i = 0; i < sourceImages.length; i++) {
            const pageId = `page_${Date.now()}_${i}`;
            setProgress(`Generating page ${i + 1} of ${sourceImages.length}...`);
            const ok = await generatePage(sourceImages[i], pageId, basePrompt, i);
            if (!ok) {
                setProgress(`Failed on page ${i + 1}. Stopping.`);
                setGeneratingAll(false);
                return;
            }
            successCount++;
        }

        if (successCount === sourceImages.length) {
            setProgress('All pages generated! Updating status & notifying user...');

            const newBookStatus = autoSendToUser ? 'InReview' : 'Processing';
            await updateDoc(doc(db as any, 'books', bookId), { status: newBookStatus });

            if (autoSendToUser) {
                // Create notification for user
                await addDoc(collection(db as any, 'notifications'), {
                    userId: book.userId,
                    type: 'pages_ready',
                    bookId,
                    title: 'Pages Ready for Review',
                    bookTitle: book.title,
                    message: `The pages for "${book.title}" have been generated and are ready for your review!`,
                    read: false,
                    createdAt: serverTimestamp(),
                    linkTo: `/books/${bookId}/review`
                });
            }
            setProgress('Process complete.');
        }

        // Refresh book data
        const snap = await getDoc(doc(db as any, 'books', bookId));
        if (snap.exists()) setBook({ id: snap.id, ...snap.data() });
        setGeneratingAll(false);
    };

    const handleSendToUser = async (pageId: string) => {
        try {
            const bookRef = doc(db as any, 'books', bookId);
            const snap = await getDoc(bookRef);
            if (!snap.exists()) return;
            const currentData = snap.data() || {};
            const currentPages: Page[] = currentData.generatedPages || [];
            const existingIndex = currentPages.findIndex(p => p.id === pageId);

            if (existingIndex >= 0) {
                currentPages[existingIndex].status = 'pending_review';
                await updateDoc(bookRef, { generatedPages: currentPages, status: 'InReview' });

                await addDoc(collection(db as any, 'notifications'), {
                    userId: book.userId,
                    type: 'pages_ready',
                    bookId,
                    title: 'New Page Ready for Review',
                    bookTitle: book.title,
                    message: `A new page for "${book.title}" is ready for your review!`,
                    read: false,
                    createdAt: serverTimestamp(),
                    linkTo: `/books/${bookId}/review`
                });

                setBook((prev: any) => ({ ...prev, ...currentData, generatedPages: currentPages, status: 'InReview' }));
            }
        } catch (err) {
            console.error("Failed to send page to user:", err);
        }
    };

    const handleGenerateSingle = async (sourceUrl: string, idx: number) => {
        setGeneratingId(`missing_${idx}`);
        const pageId = `page_${Date.now()}_${idx}`;
        const ok = await generatePage(sourceUrl, pageId, basePrompt, idx);
        setGeneratingId(null);
        if (ok) {
            if (autoSendToUser) {
                const bookRef = doc(db as any, 'books', bookId);
                await updateDoc(bookRef, { status: 'InReview' });
                await addDoc(collection(db as any, 'notifications'), {
                    userId: book.userId,
                    type: 'pages_ready',
                    bookId,
                    title: 'New Page Ready for Review',
                    bookTitle: book.title,
                    message: `A new page for "${book.title}" has been generated and is ready for your review!`,
                    read: false,
                    createdAt: serverTimestamp(),
                    linkTo: `/books/${bookId}/review`
                });
            }
            const snap = await getDoc(doc(db as any, 'books', bookId));
            if (snap.exists()) setBook({ id: snap.id, ...snap.data() });
        }
    };

    const handleRegenerate = async (page: Page) => {
        setRegeneratingId(page.id);
        const prompt = editingPrompts[page.id] || basePrompt;
        const combinedPrompt = page.feedback
            ? `${prompt}\n\nUSER FEEDBACK TO ADDRESS: ${page.feedback}`
            : prompt;

        const ok = await generatePage(page.sourceImageUrl || book.sourceImages?.[page.order] || book.sourceImages?.[0], page.id, combinedPrompt, page.order);

        if (ok) {
            // Also write a notification if auto-send is enabled
            if (autoSendToUser) {
                await addDoc(collection(db as any, 'notifications'), {
                    userId: book.userId,
                    type: 'page_updated',
                    bookId,
                    title: 'Page Regenerated',
                    bookTitle: book.title,
                    pageId: page.id,
                    message: `A rejected page for "${book.title}" has been regenerated based on your feedback.`,
                    read: false,
                    createdAt: serverTimestamp(),
                    linkTo: `/books/${bookId}/review`
                });
            }

            // Refresh book to get new page status
            const snap = await getDoc(doc(db as any, 'books', bookId));
            if (snap.exists()) setBook({ id: snap.id, ...snap.data() });
        }
        setRegeneratingId(null);
    };

    const handleSaveNewPrompt = async () => {
        const name = prompt('Enter a name or emote for this prompt:');
        if (!name) return;

        try {
            const docRef = await addDoc(collection(db as any, 'prompts'), {
                name,
                content: basePrompt,
                history: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            const newPrompt: SavedPrompt = {
                id: docRef.id,
                name,
                content: basePrompt,
                history: []
            };

            setSavedPrompts(prev => [...prev, newPrompt]);
            setSelectedPromptId(docRef.id);
        } catch (err) {
            console.error('Failed to save prompt:', err);
            alert('Failed to save prompt.');
        }
    };

    const handleUpdatePrompt = async (prompt: SavedPrompt, newContent: string, newName: string) => {
        try {
            const newHistory = prompt.history || [];
            if (prompt.content !== newContent) {
                newHistory.push({
                    content: prompt.content,
                    timestamp: new Date() // Ideally a serverTimestamp(), but Date() is easier for immediate UI push
                });
            }

            await updateDoc(doc(db as any, 'prompts', prompt.id), {
                name: newName,
                content: newContent,
                history: newHistory,
                updatedAt: serverTimestamp()
            });

            setSavedPrompts(prev => prev.map(p => p.id === prompt.id ? {
                ...p,
                name: newName,
                content: newContent,
                history: newHistory
            } : p));
            setIsEditingPrompt(null);
        } catch (err) {
            console.error("Failed to update prompt:", err);
            alert('Failed to update prompt.');
        }
    };

    const handleDeletePrompt = async (promptId: string) => {
        if (!confirm('Are you sure you want to delete this preserved prompt?')) return;
        try {
            await deleteDoc(doc(db as any, 'prompts', promptId));
            setSavedPrompts(prev => prev.filter(p => p.id !== promptId));
            if (selectedPromptId === promptId) setSelectedPromptId(null);
        } catch (err) {
            console.error("Failed to delete prompt:", err);
            alert('Failed to delete prompt.');
        }
    };

    const handleRegenerateCover = async () => {
        const chosenSourceImage = book?.sourceImages?.[coverSourceIdx];
        if (!chosenSourceImage) return;
        setIsRegeneratingCover(true);
        try {
            const res = await fetch('/api/generate-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: chosenSourceImage,
                    prompt: coverPrompt,
                    model: selectedModel,
                    useModalities: MODELS_USE_MODALITIES[selectedModel] ?? false,
                })
            });
            const data = await res.json();
            if (!data.success || !data.image) throw new Error(data.error || "Failed to generate cover");

            const imageId = `cover_preview_${Date.now()}`;
            const imageRef = ref(storage as any, `users/${book.userId}/books/${bookId}/cover/${imageId}.png`);
            await uploadString(imageRef, data.image, 'data_url');
            const downloadUrl = await getDownloadURL(imageRef);

            await updateDoc(doc(db as any, 'books', bookId), {
                image: downloadUrl,
                coverPrompt: coverPrompt,
                status: 'CoverUpdated',  // mark as updated for user review
                updatedAt: serverTimestamp()
            });

            // Notify user their updated cover is ready
            await addDoc(collection(db as any, 'notifications'), {
                userId: book.userId,
                type: 'cover_updated',
                bookId,
                title: 'Your Cover Has Been Updated!',
                bookTitle: book.title,
                message: `We've updated the cover for "${book.title}" based on your feedback. Tap to review it!`,
                read: false,
                createdAt: serverTimestamp(),
                linkTo: `/books/${bookId}/review`
            });

            setBook((prev: any) => ({ ...prev, image: downloadUrl, coverPrompt, status: 'CoverUpdated' }));
        } catch (err: any) {
            console.error(err);
            alert("Failed to regenerate cover: " + err.message);
        } finally {
            setIsRegeneratingCover(false);
        }
    };

    const generatedPages: Page[] = book?.generatedPages || [];
    const rejectedPages = generatedPages.filter(p => p.status === 'rejected');
    const pendingPages = generatedPages.filter(p => p.status === 'pending_review');
    const approvedPages = generatedPages.filter(p => p.status === 'approved');
    const sourceImages: string[] = book?.sourceImages || [];

    if (!isAdmin) return null;
    if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!book) return null;

    const proxyImg = (url: string) => url?.includes('googleapis.com') ? `/api/image-proxy?url=${encodeURIComponent(url)}` : url;

    return (
        <div className="flex-1 min-h-screen bg-slate-50 dark:bg-slate-900">

            {/* Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                        onClick={() => setLightboxUrl(null)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="relative max-w-3xl max-h-[90vh] w-full h-full" onClick={e => e.stopPropagation()}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={lightboxUrl} alt="Full size preview" className="w-full h-full object-contain rounded-2xl" />
                    </div>
                </div>
            )}
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
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-lg flex items-center gap-2">Generation Prompt</h2>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={autoSendToUser} onChange={(e) => handleAutoSendChange(e.target.checked)} />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${autoSendToUser ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${autoSendToUser ? 'transform translate-x-4' : ''}`}></div>
                                </div>
                                <div className="ml-3 text-sm font-bold text-slate-700 dark:text-slate-300 hidden md:block select-none">
                                    Auto-Send <span className="text-xs font-normal text-slate-500 block">vs Human Review</span>
                                </div>
                            </label>

                            <select
                                value={selectedModel}
                                onChange={(e) => handleModelChange(e.target.value)}
                                className="text-sm bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                {Object.keys(MODELS_USE_MODALITIES).map(modelId => (
                                    <option key={modelId} value={modelId}>{modelId}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => setIsManagePromptsOpen(true)}
                                className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-primary transition-colors font-medium border border-slate-200 dark:border-white/10 rounded-full px-3 py-1"
                            >
                                <Settings className="w-4 h-4" /> Manage Prompts
                            </button>
                        </div>
                    </div>

                    {/* Saved Prompts Pills */}
                    {savedPrompts.length > 0 && (
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                            {savedPrompts.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        setSelectedPromptId(p.id);
                                        setBasePrompt(p.content);
                                    }}
                                    className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedPromptId === p.id
                                        ? 'bg-primary text-white shadow-md'
                                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10'
                                        }`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        <textarea
                            value={basePrompt}
                            onChange={e => {
                                setBasePrompt(e.target.value);
                                if (selectedPromptId) {
                                    const selected = savedPrompts.find(p => p.id === selectedPromptId);
                                    if (selected && selected.content !== e.target.value) {
                                        setSelectedPromptId(null);
                                    }
                                }
                            }}
                            rows={4}
                            className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none font-mono"
                        />
                        <button
                            onClick={handleSaveNewPrompt}
                            className="absolute bottom-3 right-3 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 hover:border-primary/50 text-slate-500 hover:text-primary transition-colors group"
                            title="Save as new prompt"
                        >
                            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </button>
                    </div>

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

                    {generatedPages.length > 0 && book.status === 'Processing' && (
                        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm">Book is stuck in Processing</h4>
                                <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-1 max-w-md">
                                    The book status still says "Processing" even though pages have been generated. Click below to un-stick it and mark it ready for the user's review.
                                </p>
                            </div>
                            <button
                                onClick={async () => {
                                    try {
                                        await updateDoc(doc(db as any, 'books', bookId), { status: 'InReview' });
                                        // Send notification
                                        await addDoc(collection(db as any, 'notifications'), {
                                            userId: book.userId,
                                            type: 'pages_ready',
                                            bookId,
                                            title: 'Pages Ready for Review',
                                            bookTitle: book.title,
                                            message: `The pages for "${book.title}" have been generated and are ready for your review!`,
                                            read: false,
                                            createdAt: serverTimestamp(),
                                            linkTo: `/books/${bookId}/review`
                                        });
                                        const snap = await getDoc(doc(db as any, 'books', bookId));
                                        if (snap.exists()) setBook({ id: snap.id, ...snap.data() });
                                    } catch (e) { console.error("Could not override status", e); }
                                }}
                                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-sm transition-all shadow-amber-500/20 shrink-0"
                            >
                                Mark as InReview
                            </button>
                        </div>
                    )}
                </section>

                {/* Source Images & Generations */}
                <section className="space-y-8">
                    {/* Cover Image Block */}
                    {book.image && (
                        <div className="bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-sm flex flex-col md:flex-row gap-6">
                            {/* Left: current cover + source picker */}
                            <div className="w-full md:w-48 shrink-0 flex flex-col gap-3">
                                <h3 className="font-bold text-sm text-slate-500 flex items-center gap-2">
                                    Current Cover
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${book.status === 'CoverReview' ? 'bg-rose-500' :
                                            book.status === 'CoverUpdated' ? 'bg-purple-500' :
                                                'bg-slate-400'
                                        }`}>
                                        {book.status === 'CoverReview' ? 'Revision Requested' :
                                            book.status === 'CoverUpdated' ? 'Sent to User' : 'Current'}
                                    </span>
                                </h3>
                                <div
                                    className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 shadow-inner cursor-zoom-in group"
                                    onClick={() => setLightboxUrl(proxyImg(book.image))}
                                >
                                    <Image src={proxyImg(book.image)} alt="cover" fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 bg-black/50 px-2 py-1 rounded-lg transition-opacity">View Full</span>
                                    </div>
                                </div>

                                {/* Source image picker */}
                                {sourceImages.length > 1 && (
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Source for Regen</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {sourceImages.map((src, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setCoverSourceIdx(i)}
                                                    className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${coverSourceIdx === i ? 'border-primary ring-2 ring-primary/30' : 'border-slate-200 dark:border-white/10 hover:border-primary/50'
                                                        }`}
                                                >
                                                    <Image src={proxyImg(src)} alt={`Source ${i + 1}`} fill className="object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: revision notes, prompt editor, actions */}
                            <div className="flex-1 flex flex-col gap-4">
                                {book.coverRevisionNotes && (
                                    <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4">
                                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1">
                                            <MessageSquare className="w-4 h-4" /> User Revision Notes
                                        </p>
                                        <p className="text-sm text-slate-800 dark:text-rose-100 italic">
                                            &quot;{book.coverRevisionNotes}&quot;
                                        </p>
                                    </div>
                                )}

                                <div className={`border rounded-2xl p-4 ${book.status === 'CoverReview'
                                        ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                                    }`}>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">Cover Prompt</p>
                                    <textarea
                                        value={coverPrompt}
                                        onChange={e => setCoverPrompt(e.target.value)}
                                        rows={5}
                                        className={`w-full rounded-xl border bg-white dark:bg-black/20 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 resize-none font-mono mb-4 ${book.status === 'CoverReview'
                                                ? 'border-red-200 dark:border-red-500/30 focus:ring-red-500/40'
                                                : 'border-slate-200 dark:border-white/10 focus:ring-primary/40'
                                            }`}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleRegenerateCover}
                                            disabled={isRegeneratingCover}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 ${book.status === 'CoverReview'
                                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                                    : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                                                }`}
                                        >
                                            {isRegeneratingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            {isRegeneratingCover ? 'Regenerating...' : 'Regenerate Cover & Notify User'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Page Generations */}
                    {sourceImages.map((sourceUrl, idx) => {
                        const page = generatedPages.find((p: Page) => p.sourceImageUrl === sourceUrl || p.order === idx);

                        return (
                            <div key={idx} className="bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-sm flex flex-col md:flex-row gap-6">
                                {/* Source Photo */}
                                <div className="w-full md:w-48 shrink-0 flex flex-col gap-2">
                                    <h3 className="font-bold text-sm text-slate-500">Source Photo {idx + 1}</h3>
                                    <div
                                        className="relative w-full aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 cursor-zoom-in group"
                                        onClick={() => setLightboxUrl(proxyImg(sourceUrl))}
                                    >
                                        <Image src={proxyImg(sourceUrl)} alt="source" fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    </div>
                                </div>

                                {/* Generated Container */}
                                <div className="flex-1 flex flex-col gap-4">
                                    {!page ? (
                                        <div className="flex-1 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-slate-400 p-8">
                                            <p className="mb-4">Not generated yet</p>
                                            <button
                                                onClick={() => handleGenerateSingle(sourceUrl, idx)}
                                                disabled={generatingId === `missing_${idx}` || generatingAll}
                                                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:scale-105 transition-all disabled:opacity-50"
                                            >
                                                {generatingId === `missing_${idx}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                                Generate Page
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            {/* Current Page */}
                                            <div className="flex gap-6">
                                                <div
                                                    className="relative w-40 aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shrink-0 shadow-sm cursor-zoom-in group"
                                                    onClick={() => setLightboxUrl(proxyImg(page.url))}
                                                >
                                                    <Image src={proxyImg(page.url)} alt="generated" fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                                    <div className="absolute top-2 right-2 flex gap-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm ${page.status === 'approved' ? 'bg-emerald-500' :
                                                            page.status === 'rejected' ? 'bg-red-500' :
                                                                page.status === 'pending_review' ? 'bg-amber-500' :
                                                                    page.status === 'generated' ? 'bg-purple-500' : 'bg-slate-500'
                                                            }`}>
                                                            {page.status === 'pending_review' ? 'Sent to User' : page.status}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex-1">
                                                    {page.status !== 'approved' && (
                                                        <div className={`border rounded-2xl p-4 mb-4 ${page.status === 'rejected' ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
                                                            {page.status === 'rejected' && (
                                                                <div className="mb-4">
                                                                    <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                                                                        <MessageSquare className="w-4 h-4" /> User Feedback
                                                                    </p>
                                                                    <p className="text-sm text-slate-800 dark:text-red-100 italic">&quot;{page.feedback}&quot;</p>
                                                                </div>
                                                            )}
                                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">Edit Prompt</p>
                                                            <textarea
                                                                value={editingPrompts[page.id] ?? page.prompt}
                                                                onChange={e => setEditingPrompts(prev => ({ ...prev, [page.id]: e.target.value }))}
                                                                rows={4}
                                                                className={`w-full rounded-xl border bg-white dark:bg-black/20 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 resize-none font-mono mb-4 ${page.status === 'rejected' ? 'border-red-200 dark:border-red-500/30 focus:ring-red-500/40' : 'border-slate-200 dark:border-white/10 focus:ring-primary/40'}`}
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleRegenerate(page)}
                                                                    disabled={regeneratingId === page.id}
                                                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 ${page.status === 'rejected' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}
                                                                >
                                                                    {regeneratingId === page.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                                    {regeneratingId === page.id ? 'Regenerating...' : 'Regenerate'}
                                                                </button>
                                                                {page.status === 'generated' && (
                                                                    <button
                                                                        onClick={() => handleSendToUser(page.id)}
                                                                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-sm transition-all shadow-amber-500/20"
                                                                    >
                                                                        Send to User <ArrowRight className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {page.status === 'approved' && (
                                                        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-500/20 mb-4">
                                                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Approved Prompt</p>
                                                            <p className="text-sm text-emerald-800 dark:text-emerald-200 font-mono overflow-auto max-h-32">
                                                                {page.prompt}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* History Stack */}
                                            {page.history && page.history.length > 0 && (
                                                <div className="mt-4 pt-6 border-t border-slate-200 dark:border-white/10 flex flex-col gap-4">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revision History</h4>
                                                    <div className="flex flex-col gap-4">
                                                        {page.history.toReversed().map((hist, hIdx) => (
                                                            <div key={hIdx} className="flex gap-4 opacity-80 hover:opacity-100 transition-opacity p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                                                <div
                                                                    className="relative w-24 aspect-[3/4] rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-white/10 cursor-zoom-in group"
                                                                    onClick={() => setLightboxUrl(proxyImg(hist.url))}
                                                                >
                                                                    <Image src={proxyImg(hist.url)} alt={`v${hist.version}`} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center font-bold py-0.5">v{hist.version}</div>
                                                                </div>
                                                                <div className="flex-1 text-sm">
                                                                    {hist.feedback && (
                                                                        <div className="mb-3">
                                                                            <p className="font-bold text-red-500 text-xs mb-1">Rejected With:</p>
                                                                            <p className="italic text-slate-700 dark:text-slate-300">&quot;{hist.feedback}&quot;</p>
                                                                        </div>
                                                                    )}
                                                                    <p className="font-bold text-slate-500 text-xs mb-1">Prompt Used:</p>
                                                                    <p className="font-mono text-slate-600 dark:text-slate-400 text-xs overflow-auto max-h-20">{hist.prompt}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </section>
            </div>

            {/* Manage Prompts Modal */}
            {isManagePromptsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-white/10">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Settings className="w-5 h-5 text-primary" /> Manage Saved Prompts
                            </h2>
                            <button onClick={() => { setIsManagePromptsOpen(false); setIsEditingPrompt(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {savedPrompts.length === 0 ? (
                                <p className="text-center text-slate-500 py-12">No saved prompts yet. Save one from the generation area!</p>
                            ) : (
                                savedPrompts.map(prompt => (
                                    <div key={prompt.id} className="border border-slate-200 dark:border-white/10 rounded-2xl p-5 bg-slate-50 dark:bg-white/5 flex flex-col md:flex-row gap-5">

                                        {/* Thumbnail (If any) */}
                                        <div className="w-full md:w-32 shrink-0 flex flex-col gap-2">
                                            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-slate-200 dark:bg-black/20 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                                                {prompt.lastGeneratedImageUrl ? (
                                                    <Image src={prompt.lastGeneratedImageUrl?.includes('googleapis.com') ? `/api/image-proxy?url=${encodeURIComponent(prompt.lastGeneratedImageUrl)}` : prompt.lastGeneratedImageUrl} alt="Last generated" fill className="object-cover" />
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-medium px-2 text-center">No image generated yet</span>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-center text-[10px] text-white font-bold">Latest Result</div>
                                            </div>
                                        </div>

                                        {/* Content & Actions */}
                                        <div className="flex-1 flex flex-col gap-3">
                                            {isEditingPrompt?.id === prompt.id ? (
                                                <div className="flex flex-col gap-3">
                                                    <input
                                                        value={isEditingPrompt.name}
                                                        onChange={e => setIsEditingPrompt({ ...isEditingPrompt, name: e.target.value })}
                                                        className="font-bold text-lg bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                        placeholder="Prompt Name / Emote"
                                                    />
                                                    <textarea
                                                        value={isEditingPrompt.content}
                                                        onChange={e => setIsEditingPrompt({ ...isEditingPrompt, content: e.target.value })}
                                                        rows={4}
                                                        className="w-full font-mono text-sm bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                                                    />
                                                    <div className="flex gap-2 justify-end mt-2">
                                                        <button onClick={() => setIsEditingPrompt(null)} className="px-4 py-2 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-sm">Cancel</button>
                                                        <button
                                                            onClick={() => handleUpdatePrompt(prompt, isEditingPrompt.content, isEditingPrompt.name)}
                                                            className="px-4 py-2 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition-colors text-sm flex items-center gap-2"
                                                        >
                                                            <Save className="w-4 h-4" /> Save Changes
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between items-start gap-4">
                                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{prompt.name}</h3>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setIsEditingPrompt(prompt)}
                                                                className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                                                title="Edit Prompt"
                                                            >
                                                                <Settings className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeletePrompt(prompt.id)}
                                                                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                                title="Delete Prompt"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white dark:bg-black/20 rounded-xl p-4 border border-slate-100 dark:border-white/5">
                                                        <p className="font-mono text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{prompt.content}</p>
                                                    </div>

                                                    {/* History Toggle */}
                                                    {prompt.history && prompt.history.length > 0 && (
                                                        <details className="group mt-2">
                                                            <summary className="cursor-pointer text-xs font-bold text-slate-500 hover:text-primary flex items-center gap-1 list-none select-none">
                                                                <History className="w-3 h-3" /> View Edit History ({prompt.history.length})
                                                            </summary>
                                                            <div className="mt-3 flex flex-col gap-2 pl-4 border-l-2 border-slate-200 dark:border-white/10">
                                                                {prompt.history.toReversed().map((h, i) => (
                                                                    <div key={i} className="text-xs">
                                                                        <span className="text-slate-400 font-medium block mb-1">Version {prompt.history!.length - i}</span>
                                                                        <p className="font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-black/20 p-2 rounded-lg">{h.content}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
