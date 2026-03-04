'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useEffect, useState, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';
import { ArrowLeft, Plus, X, Loader2, AlertCircle, CheckCircle2, GripVertical } from 'lucide-react';

export default function BookDashboard() {
    const router = useRouter();
    const params = useParams();
    const bookId = params.id as string;
    const { user } = useAuth();

    const [book, setBook] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Generated pages ordering state
    const [pageOrder, setPageOrder] = useState<string[]>([]);
    const [coverUrl, setCoverUrl] = useState<string>('');
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const dragIndexRef = useRef<number | null>(null);

    // Load the book data
    useEffect(() => {
        if (!user || !bookId) return;

        const fetchBook = async () => {
            try {
                const docRef = doc(db as any, 'books', bookId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.userId !== user.uid) {
                        router.push('/library');
                        return;
                    }
                    setBook({ id: docSnap.id, ...data });
                } else {
                    router.push('/library');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchBook();
    }, [user, bookId, router]);

    // Initialise page order whenever book data loads
    useEffect(() => {
        if (!book) return;
        const cover = book.image || '';
        setCoverUrl(cover);
        // Merge persisted order with available pages
        const generatedUrls: string[] = (book.generatedPages || []).map((p: any) => p.url || p).filter(Boolean);
        const all = cover ? [cover, ...generatedUrls] : generatedUrls;
        if (book.pageOrder && book.pageOrder.length > 0) {
            // Restore persisted order, append any new ones
            const persisted = book.pageOrder.filter((u: string) => all.includes(u));
            const newOnes = all.filter((u: string) => !persisted.includes(u));
            setPageOrder([...persisted, ...newOnes]);
        } else {
            setPageOrder(all);
        }
    }, [book]);

    const handleDragStart = (index: number, e: React.DragEvent) => {
        dragIndexRef.current = index;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (index: number, e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const from = dragIndexRef.current;
        if (from === null || from === index) return;
        setPageOrder(prev => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(index, 0, moved);
            return next;
        });
        dragIndexRef.current = index;
    };

    const handleDragEnd = async () => {
        dragIndexRef.current = null;
        setIsSavingOrder(true);
        try {
            await updateDoc(doc(db as any, 'books', bookId), { pageOrder });
        } catch (err) {
            console.error('Failed to save page order', err);
        } finally {
            setIsSavingOrder(false);
        }
    };

    // Compress image before upload
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = document.createElement('img');
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1600;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length || !user || !book) return;

        const currentCount = book.sourceImages?.length || 0;
        if (currentCount + files.length > 24) {
            setError(`You can only upload up to 24 images. You are trying to add ${files.length} to your existing ${currentCount}.`);
            return;
        }

        setError('');
        setIsUploading(true);

        try {
            const validFiles = files.filter(f => f.type.startsWith('image/'));
            const compressedImages = await Promise.all(validFiles.map(compressImage));

            const uploadPromises = compressedImages.map(async (dataUrl, i) => {
                if (!storage) throw new Error('Storage missing');
                const imageId = `${Date.now()}_upload_${i}`;
                const imageRef = ref(storage, `users/${user.uid}/books/${bookId}/${imageId}.jpg`);
                await uploadString(imageRef, dataUrl, 'data_url');
                return getDownloadURL(imageRef);
            });

            const newUrls = await Promise.all(uploadPromises);
            const updatedImages = [...(book.sourceImages || []), ...newUrls];

            await updateDoc(doc(db as any, 'books', bookId), {
                sourceImages: updatedImages
            });

            setBook({ ...book, sourceImages: updatedImages });
        } catch (err) {
            console.error(err);
            setError('Failed to upload image(s).');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeImage = async (urlToRemove: string) => {
        if (!user || !book) return;
        try {
            const updatedImages = book.sourceImages.filter((url: string) => url !== urlToRemove);
            await updateDoc(doc(db as any, 'books', bookId), {
                sourceImages: updatedImages
            });
            setBook({ ...book, sourceImages: updatedImages });
            // Depending on structure, you might also want to delete it from storage, but typically leaving it orphaned during creation is safe, or you can extract the ref path and deleteObject.
        } catch (err) {
            console.error("Failed to remove image", err);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading your project...</div>;
    }

    if (!book) return null;

    const currentImages = book.sourceImages || [];
    const isValidCount = [12, 16, 20, 24].includes(currentImages.length);

    return (
        <div className="flex-1 flex flex-col w-full bg-slate-50 dark:bg-slate-900 min-h-screen">
            {/* Header */}
            <div className="bg-white dark:bg-black/20 border-b border-slate-200 dark:border-white/10 p-6 sticky top-0 z-20 backdrop-blur-md">
                <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/library')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{book.title}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${book.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                    {book.status || 'Draft'}
                                </span>
                                <span className="text-xs text-slate-500">{book.audience} • {book.artStyle}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <button
                            onClick={() => alert('Sending to processing queue... Backend implementation coming soon!')}
                            className="px-6 py-2 bg-primary text-white rounded-xl font-bold shadow-md shadow-primary/20 hover:scale-105 transition-all"
                        >
                            Save & Process
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto w-full p-6 space-y-8 pb-32">
                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 font-medium">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Image Management Section */}
                <section className="bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold mb-1">Source Photos</h2>
                            <p className="text-sm text-slate-500">
                                You have {currentImages.length}/24 photos.
                                {!isValidCount && <span className="text-amber-500 font-bold ml-1">(Must be 12, 16, 20, or 24)</span>}
                            </p>
                        </div>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || currentImages.length >= 24}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {isUploading ? 'Uploading...' : 'Add Photos'}
                        </button>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                            {currentImages.map((url: string, idx: number) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200 dark:border-white/10">
                                    <Image
                                        src={url}
                                        alt={`Source ${idx}`}
                                        fill
                                        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => removeImage(url)}
                                            className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {currentImages.length < 24 && (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-white/20 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-primary hover:border-primary transition-all cursor-pointer group"
                                >
                                    {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Generated Pages Section */}
                <section className="bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold mb-1">Generated Pages</h2>
                            <p className="text-sm text-slate-500">Drag to reorder your pages.</p>
                        </div>
                        {isSavingOrder && (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Saving order...
                            </div>
                        )}
                    </div>

                    {pageOrder.length > 0 ? (
                        <div className="p-6">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {pageOrder.map((url, index) => {
                                    const isCover = url === coverUrl;
                                    const label = isCover ? 'Cover' : `Page ${index + (coverUrl ? 0 : 1)}`;
                                    const proxyUrl = url.includes('firebasestorage.googleapis.com')
                                        ? `/api/image-proxy?url=${encodeURIComponent(url)}`
                                        : url;
                                    return (
                                        <div
                                            key={url}
                                            draggable
                                            onDragStart={(e) => handleDragStart(index, e)}
                                            onDragOver={(e) => handleDragOver(index, e)}
                                            onDragEnd={handleDragEnd}
                                            className="group flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing select-none"
                                        >
                                            <div className={`relative w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all
                                                ${isCover
                                                    ? 'border-primary/60 shadow-lg shadow-primary/20'
                                                    : 'border-slate-200 dark:border-white/10 group-hover:border-primary/40'
                                                }`}>
                                                <Image
                                                    src={proxyUrl}
                                                    alt={label}
                                                    fill
                                                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                                    className="object-cover pointer-events-none"
                                                />
                                                {/* Drag handle overlay */}
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-1">
                                                        <GripVertical className="w-4 h-4 text-white" />
                                                    </div>
                                                </div>
                                                {isCover && (
                                                    <div className="absolute top-2 left-2">
                                                        <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Cover</span>
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`text-xs font-bold ${isCover
                                                    ? 'text-primary dark:text-pink-400'
                                                    : 'text-slate-500 dark:text-pink-200/60'
                                                }`}>
                                                {label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <div className="size-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Waiting for AI Generation</h3>
                            <p className="text-slate-500 text-sm max-w-sm mx-auto">
                                Once your book is processed, the generated line art pages will appear here for you to review and reorder.
                            </p>
                        </div>
                    )}
                </section>

            </div>
        </div>
    );
}
