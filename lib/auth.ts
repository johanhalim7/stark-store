import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "./db";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: string } & DefaultSession["user"];
  }
  interface User {
    // Opsional: @auth/prisma-adapter memakai salinan @auth/core yang berbeda
    // dari next-auth; role wajib akan merusak kompatibilitas struktural Adapter.
    role?: string;
  }
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email || "").toLowerCase().trim();
      const password = String(credentials?.password || "");
      if (!email || !password) return null;
      const user = await db.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      };
    },
  }),
];

// Google OAuth hanya aktif bila kredensialnya diisi (opsional)
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // JWT: proxy (edge) bisa baca sesi tanpa query DB
  session: { strategy: "jwt" },
  // Wajib true di production agar Auth.js tidak melempar UntrustedHost
  // (mis. bila deploy di luar Vercel / di balik proxy).
  trustHost: true,
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // role terbaru dari DB saat login
        const fresh = await db.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        // JWT tidak diaugmentasi (tipe JWT hidup di @auth/core); pakai cast lokal.
        (token as Record<string, unknown>).role =
          fresh?.role ?? user.role ?? "CUSTOMER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const t = token as unknown as { sub?: string; role?: string };
        session.user.id = t.sub ?? "";
        session.user.role = t.role ?? "CUSTOMER";
      }
      return session;
    },
  },
});
