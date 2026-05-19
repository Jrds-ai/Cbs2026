const AUTH_ROUTES = new Set(['/login', '/signup']);
const FULL_PAGE_ROUTES = new Set(['/brand']);

export function shouldHideTopNav(pathname: string, hasUser: boolean) {
  return AUTH_ROUTES.has(pathname)
    || FULL_PAGE_ROUTES.has(pathname)
    || pathname === '/templates'
    || (pathname === '/' && !hasUser);
}

export function shouldHideBottomNav(pathname: string, hasUser: boolean) {
  return AUTH_ROUTES.has(pathname)
    || FULL_PAGE_ROUTES.has(pathname)
    || pathname.startsWith('/create')
    || pathname.includes('/review')
    || (pathname === '/' && !hasUser);
}
