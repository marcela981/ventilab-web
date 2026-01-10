/**
 * =============================================================================
 * NextAuth.js Configuration for VentyLab
 * =============================================================================
 * This file exports the authOptions configuration for NextAuth.js
 * It's kept separate from the API route to allow importing in both
 * Pages Router and App Router API routes.
 * =============================================================================
 */

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getRedirectPath, isSafeRedirectUrl } from '@/utils/redirectByRole';

/**
 * NextAuth.js Configuration Object
 * Documentation: https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  // =============================================================================
  // ADAPTER: Database integration with Prisma
  // =============================================================================
  adapter: PrismaAdapter(prisma),

  // =============================================================================
  // PROVIDERS: Authentication methods
  // =============================================================================
  providers: [
    /**
     * Credentials Provider - Email/Password Authentication
     * Used for traditional login with email and password stored in database
     */
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'estudiante@ventilab.com',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      /**
       * Authorization function - Validates user credentials
       * @param {Object} credentials - Email and password from login form
       * @returns {Object|null} User object if valid, null if invalid
       */
      async authorize(credentials) {
        try {
          // Validate that email and password are provided
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Por favor ingresa tu email y contraseña');
          }

          // Find user in database by email
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email.toLowerCase(),
            },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              image: true,
              emailVerified: true,
            },
          });

          // Check if user exists
          if (!user) {
            throw new Error('No se encontró una cuenta con este email');
          }

          // Check if user has a password (not OAuth-only account)
          if (!user.password) {
            throw new Error('Esta cuenta usa autenticación con Google. Por favor inicia sesión con Google');
          }

          // Verify password using bcrypt
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error('Contraseña incorrecta');
          }

          // Return user object WITHOUT password (security)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
            emailVerified: user.emailVerified,
          };
        } catch (error: any) {
          // Log error for debugging (do not expose to user)
          console.error('[NextAuth] Credentials authorization error:', error.message);

          // Throw error to display to user
          throw new Error(error.message || 'Error al iniciar sesión');
        }
      },
    }),

    /**
     * Google OAuth Provider
     * Allows users to sign in with their Google account
     */
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
      /**
       * Profile mapping from Google to our User model
       * @param {Object} profile - Profile data from Google
       * @returns {Object} User data for our database
       */
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null,
          role: 'STUDENT', // Default role for new Google OAuth users
        };
      },
    }),
  ],

  // =============================================================================
  // SESSION: Configuration for user sessions
  // =============================================================================
  session: {
    strategy: 'jwt', // Use JSON Web Tokens for sessions (faster, no DB queries)
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },

  // =============================================================================
  // JWT: Configuration for JSON Web Tokens
  // =============================================================================
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // =============================================================================
  // PAGES: Custom authentication pages
  // =============================================================================
  pages: {
    signIn: '/auth/login', // Custom login page
    signOut: '/auth/logout', // Custom logout page
    error: '/auth/error', // Error page for auth errors
  },

  // =============================================================================
  // CALLBACKS: Customize authentication flow
  // =============================================================================
  callbacks: {
    /**
     * JWT Callback - Runs whenever a JWT is created or updated
     */
    async jwt({ token, user, account, trigger, session }: { 
      token: any; 
      user?: any; 
      account?: any; 
      trigger?: string; 
      session?: any 
    }) {
      // On sign in, add user data to token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.image = user.image;
      }

      // If this is an OAuth sign in, store additional data
      if (account?.provider === 'google') {
        token.provider = 'google';
      } else if (account?.provider === 'credentials') {
        token.provider = 'credentials';
      }

      // Handle session updates (when using update() from client)
      if (trigger === 'update' && session) {
        token.name = session.name || token.name;
        token.image = session.image || token.image;
      }

      return token;
    },

    /**
     * Session Callback - Runs whenever session is checked/accessed
     */
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.image = token.image;
        session.user.provider = token.provider;
      }

      return session;
    },

    /**
     * SignIn Callback - Controls whether user is allowed to sign in
     */
    async signIn({ user, account, profile }: { user: any; account: any; profile?: any }) {
      try {
        // For OAuth providers (Google)
        if (account?.provider === 'google') {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (existingUser) {
            if (existingUser.image !== user.image) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { image: user.image },
              });
            }
          }
        }

        return true;
      } catch (error) {
        console.error('[NextAuth] SignIn callback error:', error);
        return '/auth/error?error=SignInError';
      }
    },

    /**
     * Redirect Callback - Controls where to redirect after sign in/out
     */
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      try {
        const urlObj = new URL(url, baseUrl);
        const callbackUrl = urlObj.searchParams.get('callbackUrl');

        if (callbackUrl && isSafeRedirectUrl(callbackUrl, baseUrl)) {
          const authPages = ['/auth/login', '/auth/register', '/auth/logout', '/auth/error'];
          const isAuthPage = authPages.some(page => callbackUrl.startsWith(page));

          if (!isAuthPage) {
            console.log('[NextAuth] Redirecting to attempted URL:', callbackUrl);
            return callbackUrl.startsWith('/') ? `${baseUrl}${callbackUrl}` : callbackUrl;
          }
        }

        if (isSafeRedirectUrl(url, baseUrl)) {
          if (url.startsWith('/')) {
            return `${baseUrl}${url}`;
          } else if (new URL(url).origin === baseUrl) {
            return url;
          }
        }

        console.log('[NextAuth] Redirecting to base URL');
        return baseUrl;
      } catch (error) {
        console.error('[NextAuth] Redirect callback error:', error);
        return baseUrl;
      }
    },
  },

  // =============================================================================
  // EVENTS: React to authentication events
  // =============================================================================
  events: {
    async signIn({ user, account, isNewUser }: { user: any; account: any; isNewUser?: boolean }) {
      console.log(`[NextAuth] User signed in: ${user.email} (${account.provider})`);

      if (isNewUser) {
        console.log(`[NextAuth] New user created: ${user.email}`);
      }
    },

    async signOut({ token, session }: { token?: any; session?: any }) {
      console.log(`[NextAuth] User signed out: ${token?.email || session?.user?.email}`);
    },

    async createUser({ user }: { user: any }) {
      console.log(`[NextAuth] New user account created: ${user.email}`);
    },
  },

  // =============================================================================
  // DEBUG: Enable debug messages (only in development)
  // =============================================================================
  debug: process.env.NODE_ENV === 'development',

  // =============================================================================
  // SECRET: Used to encrypt JWT tokens and cookies
  // =============================================================================
  secret: process.env.NEXTAUTH_SECRET,
};
