import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    try {
        const snap = await getDocs(collection(db as any, 'books'));
        const books = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ success: true, count: books.length, books });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
