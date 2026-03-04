"use client";

import React, { useEffect, useRef, useState } from 'react';

interface GenerativeLoaderProps {
    imageUrl: string;
    onComplete?: () => void;
    isLoading: boolean;
}

export default function GenerativeLoader({ imageUrl, onComplete, isLoading }: GenerativeLoaderProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isAnimationFinished, setIsAnimationFinished] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || !imageUrl) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let startTime: number | null = null;
        const duration = 6000; // 6 seconds for the animation

        // Load the image onto the canvas
        const img = new Image();
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            // Set canvas size to match container
            const { width, height } = container.getBoundingClientRect();
            canvas.width = width;
            canvas.height = height;

            // Calculate scaling to fill the canvas ('cover' behavior)
            const scale = Math.max(width / img.width, height / img.height);
            const x = (width / 2) - (img.width / 2) * scale;
            const y = (height / 2) - (img.height / 2) * scale;

            // Pen simulation parameters
            let currentX = width / 2;
            let currentY = height / 2;

            const animate = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const progress = (timestamp - startTime) / duration;

                // 1. Draw the blurred/fading background photo
                ctx.globalCompositeOperation = 'source-over';
                // Fade out the original image over the first 80% of the animation
                const globalAlpha = Math.max(0, 1 - (progress / 0.8));
                ctx.globalAlpha = globalAlpha;

                // Add a blur effect
                ctx.filter = `blur(${progress * 10}px) grayscale(${progress * 100}%)`;

                // Clear and draw image
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                ctx.filter = 'none';

                // 2. Erase to white as it progresses
                if (progress > 0) {
                    ctx.globalAlpha = Math.min(1, progress * 1.5);
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, width, height);
                }

                // 3. Draw the animated "sketch lines" over top
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = '#1e293b'; // Slate-800
                ctx.lineWidth = 1.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                const linesToDrawPerFrame = Math.floor(20 + (progress * 50)); // Speed up as it goes

                ctx.beginPath();
                ctx.moveTo(currentX, currentY);

                for (let i = 0; i < linesToDrawPerFrame; i++) {
                    // Random walk favoring edges somewhat
                    const step = 15;
                    const angle = Math.random() * Math.PI * 2;

                    let nextX = currentX + Math.cos(angle) * step;
                    let nextY = currentY + Math.sin(angle) * step;

                    // Bounce off walls
                    if (nextX < 0) nextX = Math.abs(nextX);
                    if (nextX > width) nextX = width - (nextX - width);
                    if (nextY < 0) nextY = Math.abs(nextY);
                    if (nextY > height) nextY = height - (nextY - height);

                    ctx.lineTo(nextX, nextY);
                    currentX = nextX;
                    currentY = nextY;
                }
                ctx.stroke();

                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(animate);
                } else {
                    setIsAnimationFinished(true);
                    if (onComplete && !isLoading) {
                        onComplete();
                    }
                }
            };

            animationFrameId = requestAnimationFrame(animate);
        };

        // If the image is from Firebase Storage, route through a server-side proxy to avoid CORS
        const isFirebaseStorage = imageUrl.includes('firebasestorage.googleapis.com');

        if (isFirebaseStorage) {
            // Proxy returns raw image bytes — set src directly
            img.src = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
        } else {
            // For non-Firebase Storage URLs (e.g. blob:, data:), fetch directly
            fetch(imageUrl)
                .then(res => res.blob())
                .then(blob => {
                    const objectUrl = URL.createObjectURL(blob);
                    img.src = objectUrl;
                })
                .catch(err => {
                    console.error("Failed to load image blob for canvas:", err);
                    img.src = imageUrl;
                });
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
            // We can't easily revoke the URL here without storing it in state, but the browser
            // cleans it up on document unload, which is acceptable for this temporary view.
        };
    }, [imageUrl, onComplete, isLoading]);

    // If the actual loading finishes BEFORE the animation, we wait.
    // If the animation finishes BEFORE the actual loading, we wait.
    useEffect(() => {
        if (isAnimationFinished && !isLoading && onComplete) {
            onComplete();
        }
    }, [isAnimationFinished, isLoading, onComplete]);

    return (
        <div ref={containerRef} className="w-full h-full relative bg-white overflow-hidden rounded-[24px]">
            <canvas
                ref={canvasRef}
                className="w-full h-full absolute inset-0"
            />
            {/* Loading overlay text */}
            <div className="absolute inset-x-0 bottom-8 flex flex-col items-center justify-center gap-3">
                <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-slate-200 border-white/20 flex flex-col items-center gap-1">
                    <span className="text-slate-900 font-bold animate-pulse text-sm uppercase tracking-wide">
                        Sketching Your Cover
                    </span>
                    <span className="text-slate-500 text-xs text-center max-w-[200px] leading-tight flex gap-1">
                        <span>Drawing outlines</span>
                        <span className="animate-[bounce_1s_infinite_0ms]">.</span>
                        <span className="animate-[bounce_1s_infinite_200ms]">.</span>
                        <span className="animate-[bounce_1s_infinite_400ms]">.</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
