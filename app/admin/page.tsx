'use client';

import { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, ArrowLeft, Zap, DollarSign, Image as ImageIcon, ExternalLink, Shield, BookOpen, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useRouter } from 'next/navigation';

// Curated list of image generation models available on OpenRouter
// Pricing is per image generated (from OpenRouter API)
const IMAGE_MODELS = [
    {
        id: 'sourceful/riverflow-v2-standard-preview',
        name: 'Riverflow V2 Standard',
        provider: 'Sourceful',
        pricePerImage: 0.0002, // Estimated — check OpenRouter for latest
        description: 'Fast image-to-image & text-to-image model. Great balance of quality and cost for testing.',
        badge: 'Recommended',
        badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
        accentColor: 'border-emerald-400',
        useModalities: false, // Uses image generation endpoint format
    },
    {
        id: 'google/gemini-2.5-flash-image',
        name: 'Gemini 2.5 Flash Image',
        provider: 'Google',
        pricePerImage: 0.0003,
        description: 'Budget-friendly Gemini image model. Fast and reliable for coloring book style transforms.',
        badge: 'Budget',
        badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
        accentColor: 'border-blue-400',
        useModalities: true,
    },
    {
        id: 'google/gemini-3.1-flash-image-preview',
        name: 'Gemini 3.1 Flash (Nano Banana 2)',
        provider: 'Google',
        pricePerImage: 0.0015,
        description: 'High-quality image generation. Best results for coloring book transformation.',
        badge: 'High Quality',
        badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
        accentColor: 'border-purple-400',
        useModalities: true,
    },
    {
        id: 'google/gemini-3-pro-image-preview',
        name: 'Gemini 3 Pro (Nano Banana Pro)',
        provider: 'Google',
        pricePerImage: 0.002,
        description: 'Pro-tier Gemini model. Premium detail for final production covers.',
        badge: 'Pro',
        badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
        accentColor: 'border-amber-400',
        useModalities: true,
    },
    {
        id: 'openai/gpt-5-image-mini',
        name: 'GPT-5 Image Mini',
        provider: 'OpenAI',
        pricePerImage: 0.002,
        description: 'OpenAI image generation mini model. Strong instruction following.',
        badge: 'OpenAI',
        badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
        accentColor: 'border-slate-400',
        useModalities: true,
    },
    {
        id: 'openai/gpt-5-image',
        name: 'GPT-5 Image',
        provider: 'OpenAI',
        pricePerImage: 0.01,
        description: 'Full GPT-5 image generation. Highest quality and detail, but more expensive.',
        badge: 'Premium',
        badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
        accentColor: 'border-rose-400',
        useModalities: true,
    },
];

const STORAGE_KEY = 'admin_selected_model';

export default function AdminPage() {
    const { user } = useAuth();
    const isAdmin = useIsAdmin();
    const router = useRouter();
    const [selectedModel, setSelectedModel] = useState(IMAGE_MODELS[0].id);
    const [saved, setSaved] = useState(false);
    const [booksStats, setBooksStats] = useState({ processing: 0, rejected: 0 });

    useEffect(() => {
        if (isAdmin === false && user !== null) router.replace('/');
    }, [isAdmin, user, router]);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && IMAGE_MODELS.find(m => m.id === stored)) setSelectedModel(stored);
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { collection, getDocs } = await import('firebase/firestore');
                if (!db) return;
                const snap = await getDocs(collection(db as any, 'books'));
                let processing = 0, rejected = 0;
                snap.docs.forEach(d => {
                    const data = d.data();
                    if (data.status === 'Processing' || !data.generatedPages?.length) processing++;
                    const rej = (data.generatedPages || []).filter((p: any) => p.status === 'rejected').length;
                    rejected += rej;
                });
                setBooksStats({ processing, rejected });
            } catch { /* ignore */ }
        };
        fetchStats();
    }, []);

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, selectedModel);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const currentModel = IMAGE_MODELS.find(m => m.id === selectedModel) || IMAGE_MODELS[0];

    if (!isAdmin) return null;

    return (
        <div className="flex-1 flex flex-col px-4 pb-32 max-w-md mx-auto w-full pt-6 animate-fade-in">
            {/* Header */}
            <div className="pb-6">
                <Link href="/settings" className="flex items-center gap-2 text-slate-500 dark:text-pink-200/60 text-sm font-medium mb-4 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Settings
                </Link>
                <div className="flex items-center gap-3 mb-2">
                    <div className="size-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Admin Panel</h1>
                        <p className="text-xs text-slate-500 dark:text-pink-200/60">Logged in as {user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Books Queue shortcut */}
            <Link href="/admin/books" className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all mb-6 group">
                <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
                    <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white">Books Queue</p>
                    <p className="text-xs text-slate-500 dark:text-pink-200/50">
                        {booksStats.processing} awaiting generation
                        {booksStats.rejected > 0 && <span className="ml-2 text-red-500 font-bold">• {booksStats.rejected} pages rejected</span>}
                    </p>
                </div>
                {booksStats.rejected > 0 && <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
                <span className="text-xs font-bold text-slate-400 group-hover:text-primary transition-colors">Open →</span>
            </Link>

            {/* Active Model Summary */}
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/10 border border-primary/20 rounded-3xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-4 h-4 text-primary dark:text-pink-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary dark:text-pink-400">Active Model</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white">{currentModel.name}</p>
                <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="w-3 h-3 text-slate-500 dark:text-pink-200/60" />
                    <span className="text-sm text-slate-600 dark:text-pink-200/70">
                        ~${currentModel.pricePerImage.toFixed(4)} per image
                    </span>
                </div>
            </div>

            {/* Model Selector */}
            <div className="mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-pink-200/50 mb-3 ml-1 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Image Generation Model
                </h2>
                <div className="space-y-3">
                    {IMAGE_MODELS.map((model) => {
                        const isSelected = selectedModel === model.id;
                        return (
                            <button
                                key={model.id}
                                onClick={() => setSelectedModel(model.id)}
                                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${isSelected
                                    ? `${model.accentColor} bg-white dark:bg-white/10 shadow-lg`
                                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{model.name}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${model.badgeColor}`}>
                                                {model.badge}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-pink-200/60 leading-relaxed mb-2">{model.description}</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-slate-700 dark:text-pink-200/80 flex items-center gap-1">
                                                <DollarSign className="w-3 h-3" />
                                                ${model.pricePerImage.toFixed(4)}/img
                                            </span>
                                            <span className="text-[10px] text-slate-400 dark:text-pink-200/40">via {model.provider}</span>
                                        </div>
                                    </div>
                                    <div className={`shrink-0 mt-0.5 ${isSelected ? 'text-primary dark:text-pink-400' : 'text-slate-200 dark:text-white/10'} transition-colors`}>
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* OpenRouter Link */}
            <a
                href="https://openrouter.ai/models?modality=image-out"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-pink-200/50 hover:text-primary dark:hover:text-pink-300 transition-colors mb-6"
            >
                <ExternalLink className="w-3 h-3" />
                Browse all image models on OpenRouter
            </a>

            {/* Save Button */}
            <div className="fixed bottom-0 left-0 w-full z-30">
                <div className="h-16 w-full bg-gradient-to-t from-background-light dark:from-background-dark to-transparent pointer-events-none" />
                <div className="bg-background-light/80 dark:bg-background-dark/80 border-t border-slate-200 dark:border-white/5 p-4 safe-area-bottom backdrop-blur-xl">
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={handleSave}
                            className={`w-full flex items-center justify-center gap-2 font-bold text-base py-4 px-8 rounded-2xl transition-all ${saved
                                ? 'bg-emerald-500 text-white shadow-emerald-500/30 shadow-lg'
                                : 'bg-gradient-to-r from-primary to-secondary text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                        >
                            {saved ? (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Saved!
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5" />
                                    Apply Model
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
