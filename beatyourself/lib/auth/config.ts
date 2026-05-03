import "server-only";

import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import { env } from "@/config/env";
import { prisma } from "@/lib/db/prisma";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export const authConfig: NextAuthConfig = {
  secret: env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: THIRTY_DAYS_SECONDS,
  },
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ profile, account }) {
      if (account?.provider !== "google") return false;
      if (!profile?.email_verified) return false;

      const email = profile.email;
      if (!email) return false;
      if (env.ALLOWED_EMAIL && email.toLowerCase() !== env.ALLOWED_EMAIL.toLowerCase()) {
        return false;
      }

      const providerId = profile.sub;
      if (!providerId) return false;

      await prisma.user.upsert({
        where: { provider_providerId: { provider: "google", providerId } },
        update: {
          email,
          name: profile.name ?? null,
          avatarUrl: typeof profile.picture === "string" ? profile.picture : null,
        },
        create: {
          email,
          provider: "google",
          providerId,
          name: profile.name ?? null,
          avatarUrl: typeof profile.picture === "string" ? profile.picture : null,
          settings: { create: {} },
        },
      });

      return true;
    },
    async jwt({ token, profile, account }) {
      if (account?.provider === "google" && profile?.sub) {
        const user = await prisma.user.findUnique({
          where: { provider_providerId: { provider: "google", providerId: profile.sub } },
          select: { id: true },
        });
        if (user) token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
