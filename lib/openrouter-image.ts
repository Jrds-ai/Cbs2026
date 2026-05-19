import { NextResponse } from 'next/server';

type OpenRouterImageRequest = {
  image?: string;
  prompt?: string;
  model?: string;
  useModalities?: boolean;
};

export async function generateOpenRouterImage(req: Request) {
  try {
    const { image, prompt, model, useModalities } = await req.json() as OpenRouterImageRequest;
    const modelId = model || 'sourceful/riverflow-v2-standard-preview';

    if (!image || !prompt) {
      return NextResponse.json({ success: false, error: 'Missing image or prompt' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    let imageData = image;
    if (image.startsWith('http://') || image.startsWith('https://')) {
      try {
        const imgResponse = await fetch(image);
        if (!imgResponse.ok) throw new Error(`Failed to fetch image: ${imgResponse.statusText}`);
        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
        const buffer = await imgResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        imageData = `data:${contentType};base64,${base64}`;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown image fetch error';
        return NextResponse.json({ success: false, error: `Could not fetch cover image: ${message}` }, { status: 500 });
      }
    }

    const response = await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
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
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to generate preview');
    }

    const previewImage = extractImageFromOpenRouterResponse(data);
    if (!previewImage || !previewImage.startsWith('data:image/')) {
      console.error('AI returned no image. Full response:', JSON.stringify(data).substring(0, 1000));
      throw new Error('The AI did not generate an image. Please try again.');
    }

    return NextResponse.json({ success: true, image: previewImage });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown generation error';
    console.error('Error generating preview:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Unknown connection error';
  throw new Error(`OpenRouter connection failed: ${message}`);
}

function extractImageFromOpenRouterResponse(data: any): string {
  const message = data.choices?.[0]?.message;

  if (message?.images?.length > 0) {
    return message.images[0]?.image_url?.url || '';
  }

  const content = message?.content;
  const contentText = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map((part: any) => part.text || part.image_url?.url || '').join('')
      : '';

  return contentText.match(/(data:image\/[a-zA-Z0-9\-+]+;base64,[a-zA-Z0-9+/=]+)/)?.[1] || '';
}
