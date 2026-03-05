'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, Bell } from 'lucide-react';
import { useNotifications } from '@/components/notification-provider';

// Actionable notification types that should show the magic overlay
const MAGIC_TYPES = ['cover_updated', 'pages_ready', 'page_updated', 'cover_review_requested'];

export function MagicNotification() {
    const { notifications, markAsRead } = useNotifications();
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const [animOut, setAnimOut] = useState(false);
    const [current, setCurrent] = useState<(typeof notifications)[0] | null>(null);
    const shownIds = useRef<Set<string>>(new Set());

    // Find the newest unread actionable notification we haven't shown yet
    useEffect(() => {
        if (visible) return; // don't interrupt current display
        const next = notifications.find(
            n => !n.read && MAGIC_TYPES.includes(n.type as string) && !shownIds.current.has(n.id)
        );
        if (next) {
            shownIds.current.add(next.id);
            setCurrent(next);
            setAnimOut(false);
            setVisible(true);
        }
    }, [notifications, visible]);

    const dismiss = async (go = false) => {
        setAnimOut(true);
        setTimeout(() => {
            setVisible(false);
            setAnimOut(false);
            setCurrent(null);
        }, 500);
        if (current) await markAsRead(current.id);
        if (go && current?.linkTo) router.push(current.linkTo);
    };

    if (!visible || !current) return null;

    return (
        <div
            className={`fixed inset-0 z-[200] flex items-center justify-center p-6 transition-all duration-500 ${animOut ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                }`}
            style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.6)' }}
        >
            {/* Starburst particles */}
            <StarburstParticles />

            {/* Card */}
            <div
                className={`relative max-w-sm w-full rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-700 ${animOut ? 'opacity-0 translate-y-8 scale-90' : 'opacity-100 translate-y-0 scale-100'
                    }`}
                style={{
                    background: 'linear-gradient(135deg, #1a0533 0%, #160c2e 50%, #0d0d2b 100%)',
                    border: '1px solid rgba(168,85,247,0.3)',
                    boxShadow: '0 0 60px rgba(168,85,247,0.25), 0 25px 50px rgba(0,0,0,0.5)',
                }}
            >
                {/* Shimmer top bar */}
                <div
                    className="h-1 w-full"
                    style={{
                        background: 'linear-gradient(90deg, #a855f7, #ec4899, #6366f1, #a855f7)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s infinite linear',
                    }}
                />

                {/* Dismiss button */}
                <button
                    onClick={() => dismiss(false)}
                    className="absolute top-4 right-4 text-white/40 hover:text-white/80 bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="p-8 flex flex-col items-center text-center">
                    {/* Icon with glow */}
                    <div
                        className="relative w-20 h-20 rounded-full flex items-center justify-center mb-6"
                        style={{
                            background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.3))',
                            boxShadow: '0 0 40px rgba(168,85,247,0.5)',
                            animation: 'pulse-glow 2s ease-in-out infinite',
                        }}
                    >
                        <Sparkles className="w-9 h-9 text-purple-300 drop-shadow-lg" />
                        {/* Orbiting ring */}
                        <div
                            className="absolute inset-0 rounded-full border-2 border-purple-400/30"
                            style={{ animation: 'spin 4s linear infinite' }}
                        />
                        <div
                            className="absolute inset-[-6px] rounded-full border border-pink-400/20"
                            style={{ animation: 'spin 6s linear infinite reverse' }}
                        />
                    </div>

                    <div
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
                        style={{
                            background: 'rgba(168,85,247,0.15)',
                            border: '1px solid rgba(168,85,247,0.3)',
                            color: '#c084fc',
                        }}
                    >
                        <Bell className="w-3 h-3" /> New Update
                    </div>

                    <h2 className="text-2xl font-black text-white mb-3 leading-tight">
                        {current.title}
                    </h2>
                    <p className="text-sm text-purple-200/70 leading-relaxed mb-8">
                        {current.message}
                    </p>

                    <div className="flex flex-col w-full gap-3">
                        {current.linkTo && (
                            <button
                                onClick={() => dismiss(true)}
                                className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all hover:scale-[1.03] active:scale-[0.98]"
                                style={{
                                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                                    boxShadow: '0 8px 30px rgba(168,85,247,0.4)',
                                }}
                            >
                                ✨ Take me there
                            </button>
                        )}
                        <button
                            onClick={() => dismiss(false)}
                            className="w-full py-3 rounded-2xl font-bold text-white/50 hover:text-white/70 text-sm transition-colors"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 40px rgba(168,85,247,0.5); }
                    50% { box-shadow: 0 0 70px rgba(168,85,247,0.8), 0 0 100px rgba(236,72,153,0.3); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

// Animated starburst particles floating behind the card
function StarburstParticles() {
    const particles = Array.from({ length: 16 }, (_, i) => ({
        id: i,
        size: Math.random() * 6 + 3,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 3,
        duration: Math.random() * 3 + 3,
        color: i % 3 === 0 ? '#a855f7' : i % 3 === 1 ? '#ec4899' : '#6366f1',
    }));

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        width: p.size,
                        height: p.size,
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        background: p.color,
                        boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                        animation: `float-particle ${p.duration}s ease-in-out ${p.delay}s infinite`,
                        opacity: 0.7,
                    }}
                />
            ))}
            <style jsx>{`
                @keyframes float-particle {
                    0%, 100% { transform: translateY(0px) scale(1); opacity: 0.7; }
                    50% { transform: translateY(-20px) scale(1.4); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
