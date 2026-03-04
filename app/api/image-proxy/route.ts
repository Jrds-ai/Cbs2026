import { NextResponse } from 'next/server';

/**
 * GET /api/image-proxy?url=<firebase-storage-url>
 *
 * Server-side proxy that fetches an image from any URL and streams it back
 * as the actual image content. This bypasses CORS restrictions in the browser
 * and can be used directly as an <img src> or Next.js <Image src>.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, immutable',
            },
        });
    } catch (err: any) {
        console.error('Image proxy error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
