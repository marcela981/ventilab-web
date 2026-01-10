/**
 * =============================================================================
 * NextAuth.js Configuration for VentyLab
 * =============================================================================
 * This file configures authentication for the VentyLab platform including:
 * - Credentials provider (email/password)
 * - Google OAuth provider
 * - JWT-based sessions with role-based access control
 * - Custom callbacks for session and token management
 * - Database integration via Prisma
 * =============================================================================
 */

import NextAuth from 'next-auth';
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
export const authOptions = {
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
        } catch (error) {
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
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
    // verifyRequest: '/auth/verify-request', // Email verification page (future)
    // newUser: '/auth/new-user', // New user onboarding (future)
  },

  // =============================================================================
  // CALLBACKS: Customize authentication flow
  // =============================================================================
  callbacks: {
    /**
     * JWT Callback - Runs whenever a JWT is created or updated
     * Add user information to the JWT token
     *
     * @param {Object} token - The JWT token
     * @param {Object} user - User object (only available on sign in)
     * @param {Object} account - Account object (only available on sign in)
     * @returns {Object} Modified JWT token
     */
    async jwt({ token, user, account, trigger, session }) {
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
        // Update token with new session data
        token.name = session.name || token.name;
        token.image = session.image || token.image;
      }

      return token;
    },

    /**
     * Session Callback - Runs whenever session is checked/accessed
     * Transfer information from JWT token to session object (client-side accessible)
     *
     * @param {Object} session - The session object
     * @param {Object} token - The JWT token
     * @returns {Object} Modified session object
     */
    async session({ session, token }) {
      // Add user information from token to session
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
     * Perform additional validation before allowing access
     *
     * @param {Object} user - User object
     * @param {Object} account - Account object (OAuth data)
     * @param {Object} profile - Profile data from OAuth provider
     * @returns {boolean|string} true to allow, false to deny, or URL to redirect
     */
    async signIn({ user, account, profile }) {
      try {
        // For OAuth providers (Google)
        if (account?.provider === 'google') {
          // Check if user already exists in database
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          // If user exists, update their image if it changed
          if (existingUser) {
            if (existingUser.image !== user.image) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { image: user.image },
              });
            }
          }
          // If new user, they will be created automatically by PrismaAdapter
          // with default role STUDENT
        }

        // Allow sign in
        return true;
      } catch (error) {
        console.error('[NextAuth] SignIn callback error:', error);
        return '/auth/error?error=SignInError';
      }
    },

    /**
     * Redirect Callback - Controls where to redirect after sign in/out
     * Redirects users to role-specific dashboards or attempted URL
     *
     * @param {string} url - The URL to redirect to (from callbackUrl)
     * @param {string} baseUrl - The base URL of the application
     * @returns {string} URL to redirect to
     */
    async redirect({ url, baseUrl }) {
      // Parse the URL to extract query parameters
      try {
        const urlObj = new URL(url, baseUrl);
        const callbackUrl = urlObj.searchParams.get('callbackUrl');

        // Check if there's a specific callback URL (user tried to access protected route)
        if (callbackUrl && isSafeRedirectUrl(callbackUrl, baseUrl)) {
          // Exclude auth pages from redirect
          const authPages = ['/auth/login', '/auth/register', '/auth/logout', '/auth/error'];
          const isAuthPage = authPages.some(page => callbackUrl.startsWith(page));

          if (!isAuthPage) {
            console.log('[NextAuth] Redirecting to attempted URL:', callbackUrl);
            return callbackUrl.startsWith('/') ? `${baseUrl}${callbackUrl}` : callbackUrl;
          }
        }

        // Get the user's session to determine their role
        // Note: At this point in the flow, the JWT token has been created
        // We need to fetch the session to get the user's role
        // However, in the redirect callback, we don't have direct access to the session
        // So we'll parse the URL path to see if it contains role information

        // For role-based redirect, we need to check if this is a post-login redirect
        // The URL structure from NextAuth after sign in is typically the callbackUrl

        // If the URL is just the base dashboard, we should use role-based routing
        // But we don't have access to the user/session here yet

        // Security: Validate URL is safe before redirecting
        if (isSafeRedirectUrl(url, baseUrl)) {
          // If URL is relative, prepend baseUrl
          if (url.startsWith('/')) {
            return `${baseUrl}${url}`;
          }
          // If URL is on the same origin, allow it
          else if (new URL(url).origin === baseUrl) {
            return url;
          }
        }

        // Default: redirect to base URL
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
    /**
     * Sign In Event - Triggered when user successfully signs in
     * Use for logging, analytics, or welcome emails
     */
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`[NextAuth] User signed in: ${user.email} (${account.provider})`);

      // If this is a new user (first time OAuth login)
      if (isNewUser) {
        console.log(`[NextAuth] New user created: ${user.email}`);
        // TODO: Send welcome email
        // TODO: Log analytics event
      }
    },

    /**
     * Sign Out Event - Triggered when user signs out
     */
    async signOut({ token, session }) {
      console.log(`[NextAuth] User signed out: ${token?.email || session?.user?.email}`);
    },

    /**
     * Create User Event - Triggered when new user is created (OAuth)
     */
    async createUser({ user }) {
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

// Export NextAuth handler with configuration
export default NextAuth(authOptions);
