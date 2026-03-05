import { useAuth } from '@/components/auth-provider';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

export function useIsAdmin(): boolean {
    const { user } = useAuth();
    if (!user?.email) return false;
    return ADMIN_EMAILS.includes(user.email.toLowerCase());
}
