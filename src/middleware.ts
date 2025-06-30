
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/request";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for all API routes to prevent interference with NextAuth session checks.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  const publicPaths = ['/join-server', '/maintenance', '/vip-only', '/terms', '/privacy', '/'];
  
  let siteSettings = { maintenanceMode: false, betaVipMode: false };
  try {
    // Middleware runs on the Edge and cannot access the database directly.
    // So we fetch all settings from a dedicated API route.
    const settingsRes = await fetch(new URL('/api/settings', req.url));
    if (settingsRes.ok) {
        siteSettings = await settingsRes.json();
    } else {
        throw new Error(`Failed to fetch settings: ${settingsRes.status}`);
    }
  } catch (error) {
    console.error("Middleware settings check failed, allowing access to avoid lockout:", error);
    // Em caso de erro na verificação, permite o acesso para não bloquear o site inteiro.
  }
  
  // --- Verificação de Modo de Manutenção ---
  if (siteSettings.maintenanceMode) {
    // Permite acesso ao painel de administração para que o admin possa desativar o modo
    if (pathname.startsWith('/admin')) {
        // Continua para a verificação de autenticação abaixo
    } 
    // Permite acesso à própria página de manutenção
    else if (pathname === '/maintenance') {
      return NextResponse.next();
    } 
    // Redireciona todos os outros para a página de manutenção
    else {
      return NextResponse.redirect(new URL('/maintenance', req.url));
    }
  } else {
    // Se o modo de manutenção não estiver ativo, redireciona o usuário para fora da página de manutenção
    if (pathname === '/maintenance') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // --- Verificação de Modo Beta VIP ---
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (siteSettings.betaVipMode) {
      const isSpecialPage = publicPaths.includes(pathname);
      
      // Allow admins to access everything
      if (token?.admin) {
          return NextResponse.next();
      }
      
      // Allow access to public pages and the VIP-only warning page
      if (isSpecialPage) {
          return NextResponse.next();
      }

      // Allow access for VIP users
      if (token?.isVip) {
          return NextResponse.next();
      }
      
      // If the user is not a VIP and the page is not public, redirect them
      return NextResponse.redirect(new URL('/vip-only', req.url));
  }

  // --- Verificação de Autenticação e Autorização (se não estiver em modo beta) ---
  const isPublicPage = publicPaths.includes(pathname);

  // Se o usuário não está autenticado e a página não é pública, redireciona para a página inicial para login.
  if (!token && !isPublicPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Se o usuário está autenticado
  if (token) {
    // Redireciona para fora da página de erro de entrada no servidor se já estiver logado
    if (pathname === '/join-server') {
        return NextResponse.redirect(new URL('/bet', req.url));
    }
    // Protege as rotas de admin
    if (pathname.startsWith('/admin')) {
      if (token.admin) {
        // Admins têm acesso a tudo
        return NextResponse.next();
      }
      
      // Permissões específicas para não-admins
      const canAccessPosts = pathname.startsWith('/admin/announcements') && token.canPost;
      
      if (canAccessPosts) {
        return NextResponse.next();
      }

      // Se não for admin e não tiver permissão específica, redireciona
      return NextResponse.redirect(new URL('/bet', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * 
     * API routes are intentionally not excluded here so they can be
     * handled by the logic at the top of the middleware function.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
