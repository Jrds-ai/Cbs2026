'use client';

import { useAuth } from '@/components/auth-provider';
import { Book, Plus, Search, Filter, MoreVertical, Clock, Download, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Library() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchBooks = async () => {
      try {
        const { db } = await import('@/lib/firebase');
        if (!db) return;
        const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
        const q = query(
          collection(db, 'books'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const fetchedBooks = snapshot.docs.map(doc => {
          const data = doc.data();
          const rawImage = data.image || (Array.isArray(data.sourceImages) && data.sourceImages[0]) || '';
          // Proxy Firebase Storage URLs to avoid CORS issues in the browser
          const image = rawImage.includes('firebasestorage.googleapis.com')
            ? `/api/image-proxy?url=${encodeURIComponent(rawImage)}`
            : rawImage || 'https://picsum.photos/seed/placeholder/400/300';
          return {
            id: doc.id,
            title: data.title || 'Untitled Book',
            date: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Just now',
            pages: data.pages || 10,
            status: data.status || 'Completed',
            image,
          };
        });
        setBooks(fetchedBooks);
      } catch (error) {
        console.error("Error fetching books:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [user]);

  const generateDummyData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { db } = await import('@/lib/firebase');
      if (!db) return;
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');

      await addDoc(collection(db, 'books'), {
        userId: user.uid,
        title: 'Magical Book 5',
        pages: 42,
        status: 'Completed',
        image: 'https://picsum.photos/seed/magicalbook5/400/300',
        createdAt: serverTimestamp()
      });
      // reload after 1 sec to catch the new doc
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error("Error adding dummy data:", error);
      setLoading(false);
    }
  };

  const handleDownload = (bookTitle: string) => {
    alert(`Starting download for ${bookTitle}...`);
  };

  const deleteBook = async (bookId: string) => {
    if (!user) return;
    try {
      const { db } = await import('@/lib/firebase');
      if (!db) return;
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'books', bookId));
      setBooks(books.filter(b => b.id !== bookId));
      setMenuOpen(null);
    } catch (error) {
      console.error("Error deleting book:", error);
    }
  };

  const filteredBooks = books.filter(book =>
    book.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col px-6 pb-32 max-w-md mx-auto w-full pt-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">My Library</h1>
          <p className="text-slate-500 dark:text-pink-200/60 text-sm">Your magical collection</p>
        </div>
        <Link href="/create/step-1" className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
          <Plus className="w-6 h-6" />
        </Link>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search your books..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="size-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
            <p className="text-slate-500 dark:text-pink-200/60">Loading your magical books...</p>
          </div>
        ) : filteredBooks.length > 0 ? (
          filteredBooks.map((book) => (
            <div key={book.id} className="group bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={book.image}
                  alt={book.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 z-10 flex flex-col items-end">
                  <button onClick={() => setMenuOpen(menuOpen === book.id ? null : book.id)} className="size-10 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-md flex items-center justify-center text-slate-900 dark:text-white shadow-lg hover:bg-white dark:hover:bg-black/70 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {menuOpen === book.id && (
                    <div className="mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-white/10 overflow-hidden w-32 animate-in fade-in slide-in-from-top-2">
                      <button onClick={() => { router.push(`/books/${book.id}`); setMenuOpen(null); }} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Edit</button>
                      <button onClick={() => deleteBook(book.id)} className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">Delete</button>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${book.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                    {book.status}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{book.title}</h3>
                  <div className="flex items-center gap-1 text-slate-400 dark:text-pink-200/40">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">{book.date}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-pink-200/60">{book.pages} Pages</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleDownload(book.title)} className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                    <Link href={`/books/${book.id}`} className="px-4 py-2 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary dark:text-pink-400 font-bold text-sm hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors">
                      Open
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 flex flex-col items-center text-center">
            <div className="size-20 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-300 dark:text-white/10 mb-4">
              <Book className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No books found</h3>
            <p className="text-slate-500 dark:text-pink-200/60 max-w-[200px] mb-6">Start your first creation to see it here!</p>
            <button onClick={generateDummyData} className="px-6 py-3 rounded-xl bg-primary/10 text-primary dark:text-pink-400 font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-2 group">
              <Sparkles className="w-5 h-5 text-primary dark:text-pink-400 group-hover:scale-110 transition-transform" />
              <span>Make "Magical Book 5" Dummy Data</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}