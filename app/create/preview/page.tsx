'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, RefreshCw, AlertCircle, MessageSquare, Send, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import GenerativeLoader from '@/components/GenerativeLoader';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/components/auth-provider';

export default function Preview() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const hasGenerated = useRef(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState<string>(''); // Default to empty string instead of null
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
  const [allCoverImages, setAllCoverImages] = useState<string[]>([]);
  const [selectedCoverIdx, setSelectedCoverIdx] = useState(0);


  useEffect(() => {
    const savedCover = localStorage.getItem('coloring_book_cover_image');
    const savedTitle = localStorage.getItem('coloring_book_title');
    const imagesRaw = localStorage.getItem('coloring_book_images') || '[]';
    let images: string[] = [];
    try { images = JSON.parse(imagesRaw); } catch (e) { }

    // If there are multiple uploaded source images, show them all for pick
    const covers = images.length > 0 ? images : savedCover ? [savedCover] : [];
    setAllCoverImages(covers);
    setCoverImage(savedCover);
    if (savedTitle) setBookTitle(savedTitle);

    const generatePreview = async (overrideCover?: string) => {
      setIsGenerating(true);
      setError(null);
      try {
        if (!user) {
          throw new Error("You must be logged in to generate a preview.");
        }
        const sourceImage = overrideCover || savedCover;
        if (!sourceImage) {
          throw new Error("No cover image selected. Please go back to Step 5.");
        }

        const prompt = `This GPT acts as a creative assistant that transforms uploaded images into printable, blank coloring book pages. It uses the content and theme of the image as inspiration, applying generative fill techniques to extend the image to fit a standard 8.5"x11" paper size (specifically 800px by 1000px). The image is used for inspiration. The GPT extracts cute and fun visual elements from the image—such as characters, animals, patterns, or objects—and stylizes them into simplified, line-art style drawings suitable for coloring. It ensures all output is high contrast, clean, and ready for printing. It avoids shading, gray tones, or dense textures. If there is ambiguity in the image content, the GPT leans toward whimsical interpretations that are engaging for kids or casual coloring. The assistant can also add simple themed borders or extras like stars, hearts, or themed accessories, depending on the subject matter. If no image is provided, it requests one before proceeding. Importantly, integrate the text "${savedTitle || 'Coloring Book'}" elegantly into the design as the title of this cover page.

CRITICAL INSTRUCTION: You MUST return ONLY the raw Base64 Data URI string of the generated image (starting with 'data:image/...'). Do NOT include any conversational text, markdown formatting, or explanations whatsoever. Just the raw string.`;

        // Read admin-selected model from localStorage
        const MODELS: Record<string, { useModalities?: boolean }> = {
          'sourceful/riverflow-v2-standard-preview': { useModalities: false },
          'google/gemini-2.5-flash-image': { useModalities: true },
          'google/gemini-3.1-flash-image-preview': { useModalities: true },
          'google/gemini-3-pro-image-preview': { useModalities: true },
          'openai/gpt-5-image-mini': { useModalities: true },
          'openai/gpt-5-image': { useModalities: true },
        };
        const selectedModel = localStorage.getItem('admin_selected_model') || 'sourceful/riverflow-v2-standard-preview';
        const modelConfig = MODELS[selectedModel] || { useModalities: false };

        const res = await fetch('/api/generate-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: sourceImage,
            prompt: prompt,
            model: selectedModel,
            useModalities: modelConfig.useModalities,
          })
        });

        const data = await res.json();

        console.log("OPENROUTER RAW START: =======\n");
        console.log(data);
        console.log("OPENROUTER RAW END: =======\n");

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate preview image');
        }

        // Upload the generated base64 directly to Firebase Storage before rendering
        if (!storage) throw new Error('Storage missing');
        const imageId = `cover_preview_${Date.now()}`;
        const imageRef = ref(storage, `users/${user.uid}/drafts/${imageId}.png`);

        await uploadString(imageRef, data.image, 'data_url');
        const downloadUrl = await getDownloadURL(imageRef);

        setGeneratedImage(downloadUrl);
      } catch (err: any) {
        console.error("Preview Generation Error:", err);
        setError(err.message);
      } finally {
        setIsGenerating(false);
      }
    };

    // Only run if we actually have the user object loaded, wait otherwise
    if (!loading) {
      if (user) {
        const savedPreview = localStorage.getItem('coloring_book_cover_preview');
        // If we already generated a preview in this session, don't regenerate it unless they explicitly ask
        if (savedPreview) {
          setGeneratedImage(savedPreview);
          setIsGenerating(false);
          hasGenerated.current = true;
        } else if (!hasGenerated.current) {
          hasGenerated.current = true;
          generatePreview();
        }
      } else {
        setError("You must be logged in to generate a preview.");
        setIsGenerating(false);
      }
    }
  }, [user, loading]);

  // Regenerate with a different chosen source image
  const handleSwitchCoverImage = (idx: number) => {
    const chosen = allCoverImages[idx];
    if (!chosen) return;
    setSelectedCoverIdx(idx);
    setCoverImage(chosen);
    localStorage.removeItem('coloring_book_cover_preview');
    hasGenerated.current = false;
    // Trigger regeneration by temporarily updating coverImage state — which causes the useEffect to fire
    // Instead, call generate directly
    setIsGenerating(true);
    setError(null);
    (async () => {
      try {
        if (!user) throw new Error('Not logged in');
        const title = localStorage.getItem('coloring_book_title') || 'Coloring Book';
        const selectedModel = localStorage.getItem('admin_selected_model') || 'sourceful/riverflow-v2-standard-preview';
        const MODELS: Record<string, { useModalities?: boolean }> = {
          'sourceful/riverflow-v2-standard-preview': { useModalities: false },
          'google/gemini-2.5-flash-image': { useModalities: true },
          'google/gemini-3.1-flash-image-preview': { useModalities: true },
          'google/gemini-3-pro-image-preview': { useModalities: true },
          'openai/gpt-5-image-mini': { useModalities: true },
          'openai/gpt-5-image': { useModalities: true },
        };
        const modelConfig = MODELS[selectedModel] || { useModalities: false };
        const prompt = `This GPT acts as a creative assistant that transforms uploaded images into printable, blank coloring book pages. It uses the content and theme of the image as inspiration, applying generative fill techniques to extend the image to fit a standard 8.5"x11" paper size. The image is used for inspiration. Integrate the text "${title}" elegantly into the design as the title of this cover page.

CRITICAL INSTRUCTION: You MUST return ONLY the raw Base64 Data URI string of the generated image (starting with 'data:image/...'). Do NOT include any conversational text, markdown formatting, or explanations whatsoever. Just the raw string.`;
        const res = await fetch('/api/generate-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: chosen, prompt, model: selectedModel, useModalities: modelConfig.useModalities })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate');
        if (!storage) throw new Error('Storage missing');
        const imageId = `cover_preview_${Date.now()}`;
        const imageRef = ref(storage, `users/${user.uid}/drafts/${imageId}.png`);
        await uploadString(imageRef, data.image, 'data_url');
        const downloadUrl = await getDownloadURL(imageRef);
        setGeneratedImage(downloadUrl);
        localStorage.setItem('coloring_book_cover_preview', downloadUrl);
        localStorage.setItem('coloring_book_cover_image', chosen);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsGenerating(false);
      }
    })();
  };

  const handleContinue = () => {
    if (generatedImage) {
      localStorage.setItem('coloring_book_cover_preview', generatedImage);
    }
    router.push('/create/checkout');
  };

  const handleRevisionSubmit = async () => {
    if (!revisionNotes.trim()) return;
    setIsSubmittingRevision(true);
    try {
      if (!user) throw new Error("Must be logged in to request changes.");

      const settingsSnap = await getDoc(doc(db as any, 'settings', 'general'));
      const alertWithoutPurchase = settingsSnap.exists() && settingsSnap.data().alertAdminOnCoverChangeWithoutPurchase;

      if (alertWithoutPurchase) {
        const title = localStorage.getItem('coloring_book_title') || 'Magical Book';
        const audience = localStorage.getItem('coloring_book_audience') || '';
        const style = localStorage.getItem('coloring_book_style') || 'cartoon';
        const isForKids = localStorage.getItem('coloring_book_for_kids') === 'true';
        const template = localStorage.getItem('coloring_book_template') || '';
        const company = localStorage.getItem('coloring_book_company') || '';
        const website = localStorage.getItem('coloring_book_website') || '';
        const cta = localStorage.getItem('coloring_book_cta') || '';
        const logo = localStorage.getItem('coloring_book_logo') || '';

        const imagesRaw = localStorage.getItem('coloring_book_images') || '[]';
        let images: string[] = [];
        try { images = JSON.parse(imagesRaw); } catch (e) { }

        const bookRef = await addDoc(collection(db as any, 'books'), {
          userId: user.uid,
          title,
          audience,
          style,
          isForKids,
          image: generatedImage,
          sourceImages: images,
          status: 'CoverReview_Unpaid',
          createdAt: serverTimestamp(),
          coverRevisionNotes: revisionNotes,
          template,
          brandInfo: { company, website, cta, logo }
        });

        await addDoc(collection(db as any, 'notifications'), {
          userId: user.uid,
          type: 'cover_review_requested',
          bookId: bookRef.id,
          title: 'Cover Revision Requested',
          bookTitle: title,
          message: `You requested a change: "${revisionNotes}". We'll let you know when it's updated!`,
          read: false,
          createdAt: serverTimestamp(),
          linkTo: `/books/${bookRef.id}`
        });

        // ALSO Alert Admin
        await addDoc(collection(db as any, 'notifications'), {
          userId: 'admin',
          type: 'cover_review_unpaid',
          bookId: bookRef.id,
          title: 'Cover Change (Unpaid)',
          bookTitle: title,
          message: `User requested cover changes WITHOUT purchase: "${revisionNotes}".`,
          read: false,
          createdAt: serverTimestamp()
        });

        localStorage.setItem('coloring_book_draft_id', bookRef.id);
        localStorage.setItem('coloring_book_cover_preview', generatedImage || '');
      } else {
        localStorage.setItem('coloring_book_cover_revision', revisionNotes);
        localStorage.setItem('coloring_book_cover_preview', generatedImage || '');
      }

      router.push('/create/checkout');
    } catch (err: any) {
      console.error(err);
      setError("Failed to submit revision request.");
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 pb-32 max-w-md mx-auto w-full pt-8 animate-fade-in">
      <div className="pb-6">
        <div className="flex items-center gap-2 text-primary dark:text-pink-400 font-bold text-xs tracking-wider uppercase mb-3">
          <span className="bg-primary/10 dark:bg-primary/30 px-2.5 py-1 rounded-md text-primary dark:text-pink-300">Step 6</span>
          <span>AI Generation</span>
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-3 tracking-tight text-slate-900 dark:text-white">
          {isGenerating ? 'Generating Magic...' : 'Your Masterpiece'}
        </h1>
        <p className="text-slate-500 dark:text-pink-200/70 text-base leading-relaxed">
          {isGenerating
            ? 'Our AI is carefully crafting your coloring page cover. This may take up to 30 seconds.'
            : 'Here is your custom coloring page. Looks amazing!'}
        </p>
      </div>

      <div className="relative w-full max-w-[320px] mx-auto aspect-[4/5] rounded-[32px] overflow-hidden shadow-2xl shadow-primary/20 bg-slate-100 dark:bg-white/5">
        {isGenerating || !generatedImage ? (
          <GenerativeLoader
            imageUrl={coverImage || ''}
            isLoading={isGenerating}
          />
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-red-50 dark:bg-red-900/10 animate-fade-in">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-slate-900 dark:text-white font-bold mb-2">Generation Failed</p>
            <p className="text-sm text-slate-500 dark:text-pink-200/60 mb-6">{error}</p>
            <button
              onClick={() => {
                localStorage.removeItem('coloring_book_cover_preview');
                window.location.reload();
              }}
              className="px-6 py-2 bg-white dark:bg-white/10 rounded-xl font-bold shadow-sm hover:scale-105 transition-transform"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 p-4 animate-scale-in">
            <div className="w-full h-full rounded-[28px] border-4 border-slate-900 dark:border-white bg-white overflow-hidden relative">
              <Image
                src={generatedImage}
                alt={bookTitle || "Coloring Page Preview"}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}

        {/* Ambient Background */}
        {!isGenerating && generatedImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 pointer-events-none -z-10" />
        )}
      </div>

      {!isGenerating && generatedImage && !error && (
        <div className="mt-8 flex flex-col gap-4 animate-slide-up">

          {/* Cover Review Instructions */}
          {!showRevisionForm && (
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4 text-sm text-blue-900 dark:text-blue-100 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Make it Perfect!</p>
                <p className="text-blue-800/80 dark:text-blue-200/80">
                  Love it? Tap &quot;Looks Great!&quot; to continue. <br />
                  Want changes? Tap &quot;Request Changes&quot; to add specific notes like &quot;make it more anime style&quot;, &quot;add stars to the background&quot;, or &quot;move the title lower&quot;. We&apos;ll hand-edit it to perfection!
                </p>
              </div>
            </div>
          )}

          {/* Source image picker strip – lets user try a different photo */}
          {allCoverImages.length > 1 && !showRevisionForm && (
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-pink-200/50 uppercase tracking-wider mb-2">
                Try a different photo
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allCoverImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => handleSwitchCoverImage(i)}
                    disabled={isGenerating}
                    className={`shrink-0 relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all disabled:opacity-50 ${selectedCoverIdx === i
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-slate-200 dark:border-white/10 hover:border-primary/50'
                      }`}
                  >
                    <Image src={img} alt={`Photo ${i + 1}`} fill className="object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {showRevisionForm ? (
            <div className="bg-white dark:bg-white/10 border border-slate-200 dark:border-white/20 p-5 rounded-3xl shadow-sm animate-scale-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary dark:text-pink-400" /> Request Changes
                </h3>
                <button onClick={() => setShowRevisionForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white/60 bg-slate-100 dark:bg-white/5 p-1.5 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="E.g. Make the title bigger, change the style to anime, add more flowers..."
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all min-h-[100px] resize-none mb-3"
              />
              <button
                onClick={handleRevisionSubmit}
                disabled={!revisionNotes.trim() || isSubmittingRevision}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingRevision ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Continue to Checkout
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={() => setShowRevisionForm(true)}
                className="flex-1 py-4 px-3 rounded-2xl font-bold text-slate-700 dark:text-white bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Request Changes
              </button>
              <button
                onClick={handleContinue}
                className="flex-[2] py-4 px-6 rounded-2xl font-bold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 group"
              >
                Looks Great!
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 w-full z-30">
        <div className="h-16 w-full bg-gradient-to-t from-background-light dark:from-background-dark to-transparent pointer-events-none"></div>
        <div className="bg-background-light/80 dark:bg-background-dark/80 border-t border-slate-200 dark:border-white/5 p-6 safe-area-bottom backdrop-blur-xl">
          <div className="max-w-md mx-auto w-full flex items-center gap-4">
            <Link href="/create/step-5" className="px-6 py-4 rounded-xl font-bold text-slate-500 dark:text-pink-200/60 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm uppercase tracking-wide">
              Back
            </Link>
            <button
              onClick={handleContinue}
              disabled={isGenerating || !!error || showRevisionForm}
              className={`group flex-1 bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg py-4 px-8 rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${isGenerating || !!error || showRevisionForm ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <span>Continue</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}