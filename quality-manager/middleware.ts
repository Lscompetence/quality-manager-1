import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// In-memory store for rate limiting (works per-instance)
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
// 100 requêtes/minute/IP en production. En développement, le rechargement à chaud
// déclenche bien plus de requêtes depuis la même IP : la limite y est relevée pour
// ne pas renvoyer de 429 pendant le travail. La protection reste entière en production.
const MAX_REQUESTS = process.env.NODE_ENV === "production" ? 100 : 1000;

export async function middleware(request: NextRequest) {
  // Simple Rate Limiting
  const ip = request.ip || request.headers.get("x-forwarded-for") || "127.0.0.1";
  
  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, resetTime: Date.now() + WINDOW_MS });
  } else {
    const data = rateLimit.get(ip)!;
    if (Date.now() > data.resetTime) {
      rateLimit.set(ip, { count: 1, resetTime: Date.now() + WINDOW_MS });
    } else {
      data.count++;
      if (data.count > MAX_REQUESTS) {
        return new Response("Too Many Requests", { status: 429 });
      }
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes SAUF :
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, manifest.webmanifest (doivent rester publics)
     * - *.svg, *.png, *.jpg, *.jpeg, *.gif, *.webp, *.ico
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
