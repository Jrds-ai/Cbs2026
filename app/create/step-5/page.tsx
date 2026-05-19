'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react';

export default function Step5() {
    const router = useRouter();
    const [images] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem('coloring_book_images');
        if (!saved) return [];
        try {
            return JSON.parse(saved);
        } catch {
            return [];
        }
    });
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const handleContinue = (e: React.MouseEvent) => {
        e.preventDefault();
        if (selectedIndex !== null) {
            const selectedImage = images[selectedIndex];
            const previousImage = localStorage.getItem('coloring_book_cover_image');

            // Only clear the preview cache if they actually selected a *different* source image
            if (previousImage !== selectedImage) {
                localStorage.removeItem('coloring_book_cover_preview');
            }

            localStorage.setItem('coloring_book_cover_image', selectedImage);
            router.push('/create/preview');
        }
    };

    return (
        <div className="flex-1 flex flex-col px-6 pb-32 max-w-md mx-auto w-full pt-8 animate-fade-in">
            <div className="pb-8">
                <div className="flex items-center gap-2 text-primary dark:text-pink-400 font-bold text-xs tracking-wider uppercase mb-3">
                    <span className="bg-primary/10 dark:bg-primary/30 px-2.5 py-1 rounded-md text-primary dark:text-pink-300">Step 5</span>
                    <span>Cover Selection</span>
                </div>
                <h1 className="text-3xl font-bold leading-tight mb-3 tracking-tight text-slate-900 dark:text-white">
                    Choose a Cover
                </h1>
                <p className="text-slate-500 dark:text-pink-200/70 text-base leading-relaxed">
                    Select one of your uploaded photos to inspire the AI for your coloring book&apos;s main cover!
                </p>
            </div>

            <div className="space-y-6">
                {images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                        {images.map((imgSrc, idx) => (
                            <div
                                key={idx}
                                onClick={() => setSelectedIndex(idx)}
                                className={`relative aspect-square rounded-2xl overflow-hidden shadow-sm group border-4 cursor-pointer transition-all ${selectedIndex === idx ? 'border-primary scale-105 shadow-xl shadow-primary/20' : 'border-transparent dark:border-white/10 hover:border-primary/50'}`}
                            >
                                <Image
                                    src={imgSrc}
                                    alt={`Cover Option ${idx + 1}`}
                                    fill
                                    className="object-cover"
                                    referrerPolicy="no-referrer"
                                />
                                <div className={`absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors ${selectedIndex === idx ? 'bg-black/0' : ''}`} />
                                {selectedIndex === idx && (
                                    <div className="absolute top-2 right-2 bg-white rounded-full text-primary shadow-lg animate-scale-in">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-white/20" />
                        <p className="text-slate-500 dark:text-pink-200/60 font-medium pb-4">No images uploaded.</p>
                        <Link href="/create/step-4" className="text-primary font-bold">Go back and add photos</Link>
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 w-full z-30">
                <div className="h-16 w-full bg-gradient-to-t from-background-light dark:from-background-dark to-transparent pointer-events-none"></div>
                <div className="bg-background-light/80 dark:bg-background-dark/80 border-t border-slate-200 dark:border-white/5 p-6 safe-area-bottom backdrop-blur-xl">
                    <div className="max-w-md mx-auto w-full flex items-center gap-4">
                        <Link href="/create/step-4" className="px-6 py-4 rounded-xl font-bold text-slate-500 dark:text-pink-200/60 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm uppercase tracking-wide">
                            Back
                        </Link>
                        <button
                            onClick={handleContinue}
                            className={`group flex-1 bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg py-4 px-8 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${selectedIndex !== null ? 'shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98]' : 'opacity-50 cursor-not-allowed'}`}
                            disabled={selectedIndex === null}
                        >
                            <span>Generate Preview</span>
                            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
