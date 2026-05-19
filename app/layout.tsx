import type { Metadata } from 'next';
import { Epilogue, Inter } from 'next/font/google';
import './globals.css'; // Global styles
import { AuthProvider } from '@/components/auth-provider';
import { NotificationProvider } from '@/components/notification-provider';
import { MagicNotification } from '@/components/MagicNotification';
import { TopNav } from '@/components/top-nav';
import { BottomNav } from '@/components/bottom-nav';

export const metadata: Metadata = {
  title: 'Coloring Book Studio',
  description: 'Create your own magical coloring books',
};

const epilogue = Epilogue({
  subsets: ['latin'],
  weight: ['400', '700', '800', '900'],
  variable: '--font-epilogue',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${epilogue.variable} ${inter.variable}`}>
      <body className="bg-background-light dark:bg-background-dark font-display min-h-screen text-slate-900 dark:text-pink-50 flex flex-col antialiased selection:bg-primary selection:text-white pb-24" suppressHydrationWarning>
        <AuthProvider>
          <NotificationProvider>
            <MagicNotification />
            <TopNav />
            {children}
            <BottomNav />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
