'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';

export type FirestoreNotification = {
    id: string;
    userId: string;
    type: 'pages_ready' | 'page_updated' | 'page_rejected' | 'order' | 'feature' | 'social' | 'cover_updated' | 'cover_review_requested' | 'cover_review_unpaid';
    title: string;
    message: string;
    linkTo?: string;
    bookId?: string;
    pageId?: string;
    read: boolean;
    createdAt: { seconds: number } | null;
};

type NotificationContextType = {
    notifications: FirestoreNotification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<FirestoreNotification[]>([]);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        let unsubscribe: (() => void) | undefined;

        const setup = async () => {
            const { db } = await import('@/lib/firebase');
            if (!db) return;
            const { collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');
            const q = query(
                collection(db, 'notifications'),
                where('userId', '==', user.uid),
                orderBy('createdAt', 'desc')
            );
            unsubscribe = onSnapshot(q, (snap) => {
                const notifs: FirestoreNotification[] = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as FirestoreNotification));
                setNotifications(notifs);
            });
        };

        setup();
        return () => unsubscribe?.();
    }, [user]);

    const markAsRead = async (id: string) => {
        const { db } = await import('@/lib/firebase');
        if (!db) return;
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'notifications', id), { read: true });
    };

    const markAllAsRead = async () => {
        const { db } = await import('@/lib/firebase');
        if (!db) return;
        const { doc, updateDoc, writeBatch } = await import('firebase/firestore');
        const batch = writeBatch(db);
        notifications.filter(n => !n.read).forEach(n => {
            batch.update(doc(db, 'notifications', n.id), { read: true });
        });
        await batch.commit();
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
    return context;
};

// Helper to create a notification document in Firestore (call from client)
export async function createNotification(notif: Omit<FirestoreNotification, 'id'>) {
    const { db } = await import('@/lib/firebase');
    if (!db) return;
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    await addDoc(collection(db, 'notifications'), {
        ...notif,
        createdAt: serverTimestamp(),
    });
}
