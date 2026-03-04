import { NextResponse } from 'next/server';

export const maxDuration = 120; // 2min timeout for image generation

export async function POST(req: Request) {
    try {
        const {
            bookId,
            bookUserId,
            bookTitle,
            pageId,
            sourceImageUrl,
            prompt,
            model,
            useModalities,
        } = await req.json();

        if (!bookId || !pageId || !sourceImageUrl || !bookUserId) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const modelId = model || 'sourceful/riverflow-v2-standard-preview';
        const apiKey = process.env.OPENROUTER_API;
        if (!apiKey) return NextResponse.json({ success: false, error: 'Missing API key' }, { status: 500 });

        // Fetch source image server-side (bypass CORS)
        let sourceBase64: string;
        try {
            const imgRes = await fetch(sourceImageUrl);
            const buf = await imgRes.arrayBuffer();
            const ct = imgRes.headers.get('content-type') || 'image/jpeg';
            sourceBase64 = `data:${ct};base64,${Buffer.from(buf).toString('base64')}`;
        } catch {
            return NextResponse.json({ success: false, error: 'Failed to fetch source image' }, { status: 500 });
        }

        const pagePrompt = prompt ||
            `Transform this photo into a high-contrast, black-and-white line art coloring book page suitable for children. 
Extract the main subject(s) and render them in clean, simplified line art. Remove all color, shading, and backgrounds.
Output should be clean white paper with bold black outlines only — ready to print and color.
CRITICAL: Return ONLY the raw Base64 Data URI of the generated image (starting with 'data:image/...'). No text.`;

        // Call OpenRouter
        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                'X-Title': 'Coloring Book Studio',
            },
            body: JSON.stringify({
                model: modelId,
                ...(useModalities !== false ? { modalities: ['image', 'text'] } : {}),
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: sourceBase64 } },
                        { type: 'text', text: pagePrompt },
                    ],
                }],
            }),
        });

        if (!orRes.ok) {
            const errText = await orRes.text();
            return NextResponse.json({ success: false, error: `OpenRouter error: ${errText}` }, { status: 500 });
        }

        const orData = await orRes.json();
        const choice = orData.choices?.[0]?.message;

        // Extract image data
        let imageData: string | null = null;
        if (choice?.images?.[0]?.image_url?.url) {
            imageData = choice.images[0].image_url.url;
        } else if (typeof choice?.content === 'string' && choice.content.startsWith('data:image')) {
            imageData = choice.content;
        } else if (Array.isArray(choice?.content)) {
            for (const part of choice.content) {
                if (part.type === 'image_url') { imageData = part.image_url?.url; break; }
                if (part.type === 'text' && part.text?.startsWith('data:image')) { imageData = part.text; break; }
            }
        }

        if (!imageData) {
            return NextResponse.json({ success: false, error: 'Model did not return an image' }, { status: 500 });
        }

        // Upload to Firebase Storage
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');
        const { getStorage } = await import('firebase-admin/storage');
        const { getFirestore } = await import('firebase-admin/firestore');

        // Lazy-initialize firebase-admin
        if (!getApps().length) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
            initializeApp({ credential: cert(serviceAccount), storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET });
        }

        const bucket = getStorage().bucket();
        const storagePath = `users/${bookUserId}/books/${bookId}/pages/${pageId}.jpg`;

        // Strip data URI prefix for upload
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        const fileRef = bucket.file(storagePath);
        await fileRef.save(imgBuffer, { metadata: { contentType: 'image/jpeg' } });
        await fileRef.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        // Update the page in Firestore
        const adminDb = getFirestore();
        const bookRef = adminDb.collection('books').doc(bookId);
        const bookSnap = await bookRef.get();
        if (!bookSnap.exists) throw new Error('Book not found');

        const bookData = bookSnap.data()!;
        const generatedPages: any[] = bookData.generatedPages || [];
        const pageIdx = generatedPages.findIndex((p: any) => p.id === pageId);

        if (pageIdx === -1) {
            // New page: append
            generatedPages.push({
                id: pageId,
                url: publicUrl,
                status: 'pending_review',
                prompt: pagePrompt,
                sourceImageUrl,
                version: 1,
                feedback: '',
                order: generatedPages.length,
            });
        } else {
            // Update existing page (regeneration)
            generatedPages[pageIdx] = {
                ...generatedPages[pageIdx],
                url: publicUrl,
                status: 'pending_review',
                prompt: pagePrompt,
                version: (generatedPages[pageIdx].version || 1) + 1,
                feedback: '',
            };
        }

        // Check if all pages are now generated (none are in 'generating' state)
        const allGenerated = generatedPages.every((p: any) => p.status !== 'generating');

        await bookRef.update({
            generatedPages,
            status: allGenerated ? 'InReview' : 'Processing',
            updatedAt: new Date(),
        });

        // Notify the book owner if all pages are now in review
        if (allGenerated) {
            const notifType = pageIdx === -1 ? 'pages_ready' : 'page_updated';
            const isRegen = pageIdx !== -1;
            await adminDb.collection('notifications').add({
                userId: bookUserId,
                type: notifType,
                title: isRegen ? '🔄 A page was updated!' : '🎨 Your pages are ready to review!',
                message: isRegen
                    ? `We updated a page in "${bookTitle}" based on your feedback. Tap to review it.`
                    : `Your coloring book "${bookTitle}" has ${generatedPages.length} pages ready for your review!`,
                linkTo: `/books/${bookId}/review`,
                bookId,
                read: false,
                createdAt: new Date(),
            });
        }

        return NextResponse.json({ success: true, url: publicUrl, allGenerated });

    } catch (err: any) {
        console.error('generate-page error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
