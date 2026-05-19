'use client';

import { useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { Loader2 } from 'lucide-react';

export default function TestPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string>('');
    const isDev = process.env.NODE_ENV !== 'production';

    const generateData = async () => {
        if (!isDev) {
            setResult('Test data generation is disabled in production.');
            return;
        }

        if (!user || !db) {
            setResult('Please login first to run the test securely.');
            return;
        }

        setLoading(true);
        setResult('Starting test...');

        try {
            // 1. Upload 12 Random Images (Fake books)
            const booksRef = collection(db, 'books');
            for (let i = 0; i < 12; i++) {
                await addDoc(booksRef, {
                    userId: user.uid,
                    title: `Magical Book ${i + 1}`,
                    pages: Math.floor(Math.random() * 20) + 10,
                    status: i % 2 === 0 ? 'Completed' : 'In Progress',
                    image: `https://picsum.photos/seed/${user.uid}-book${i}/400/300`,
                    createdAt: serverTimestamp(),
                });
            }

            // 2. Pretend an order was submitted
            const ordersRef = collection(db, 'orders');
            await addDoc(ordersRef, {
                userId: user.uid,
                status: 'pending',
                shipping: {
                    fullName: user.name,
                    address: '123 Test Street',
                    city: 'Magic City',
                    zip: '12345'
                },
                items: [
                    { type: 'Hardcover Book', quantity: 1, price: 29.99 }
                ],
                total: 34.98,
                createdAt: serverTimestamp(),
            });

            setResult('Success: 12 random images/books generated and 1 order submitted! Check the library.');
        } catch (e: any) {
            setResult('Error: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <h1 className="text-3xl font-bold mb-4 mt-20">System Test</h1>

            {!isDev ? (
                <p className="text-slate-500 mb-8 p-4 bg-red-50 text-red-600 rounded-xl">
                    Test data generation is disabled in production.
                </p>
            ) : user ? (
                <div className="space-y-6 flex flex-col items-center">
                    <p className="text-slate-500 max-w-sm">
                        Authenticated as <strong>{user.email}</strong>.<br /><br />
                        Click below to generate 12 dummy creations and submit a fake order. This tests Firestore security rules and upload processes.
                    </p>

                    <button
                        onClick={generateData}
                        disabled={loading}
                        className="bg-primary text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-primary/30 flex justify-center items-center gap-2 hover:scale-105 transition-transform"
                    >
                        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                        {loading ? 'Running Tests...' : 'Run Data Test'}
                    </button>

                    {result && (
                        <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 mt-4 max-w-md">
                            <p className={result.startsWith('Error') ? 'text-red-500' : 'text-green-500'}>{result}</p>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-slate-500 mb-8 p-4 bg-red-50 text-red-600 rounded-xl">
                    You must be logged in to test data creation (to verify Secure rules).
                </p>
            )}
        </div>
    );
}
