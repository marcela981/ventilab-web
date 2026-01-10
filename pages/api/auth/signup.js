/**
 * =============================================================================
 * User Registration API Route for VentyLab
 * =============================================================================
 * This endpoint handles new user registration with comprehensive validation,
 * security measures, and error handling following OWASP best practices.
 *
 * Method: POST
 * Body: { name, email, password, confirmPassword }
 * Returns: { success, user, message }
 *
 * Security Features:
 * - Input validation with Zod
 * - Password strength validation
 * - Email uniqueness check
 * - bcrypt password hashing (10 rounds)
 * - SQL injection prevention via Prisma
 * - No sensitive data in responses
 * =============================================================================
 */

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { validatePasswordStrength } from '@/utils/passwordValidator';

/**
 * Zod Schema for Registration Validation
 * Provides type-safe validation with detailed error messages
 */
const signupSchema = z
  .object({
    name: z
      .string({
        required_error: 'El nombre es requerido',
        invalid_type_error: 'El nombre debe ser texto',
      })
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(50, 'El nombre no puede exceder 50 caracteres')
      .regex(
        /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/,
        'El nombre solo puede contener letras y espacios'
      )
      .transform((val) => val.trim()),

    email: z
      .string({
        required_error: 'El email es requerido',
        invalid_type_error: 'El email debe ser texto',
      })
      .email('Por favor ingresa un email válido')
      .max(100, 'El email no puede exceder 100 caracteres')
      .transform((val) => val.toLowerCase().trim()),

    password: z
      .string({
        required_error: 'La contraseña es requerida',
        invalid_type_error: 'La contraseña debe ser texto',
      })
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(128, 'La contraseña no puede exceder 128 caracteres'),

    confirmPassword: z.string({
      required_error: 'Debes confirmar tu contraseña',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

/**
 * User Registration Handler
 * POST /api/auth/signup
 */
export default async function handler(req, res) {
  // =============================================================================
  // 1. METHOD VALIDATION
  // =============================================================================
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Método no permitido',
      message: 'Este endpoint solo acepta solicitudes POST',
    });
  }

  try {
    // =============================================================================
    // 2. INPUT VALIDATION WITH ZOD
    // =============================================================================
    let validatedData;
    try {
      validatedData = signupSchema.parse(req.body);
    } catch (zodError) {
      // Format Zod errors for user-friendly response
      const errors = zodError.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validación fallida',
        message: 'Por favor corrige los siguientes errores',
        errors: errors,
      });
    }

    const { name, email, password } = validatedData;

    // =============================================================================
    // 3. PASSWORD STRENGTH VALIDATION
    // =============================================================================
    const passwordValidation = validatePasswordStrength(password);

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Contraseña débil',
        message: 'La contraseña no cumple con los requisitos de seguridad',
        feedback: passwordValidation.feedback,
        strength: passwordValidation.strength,
        score: passwordValidation.score,
      });
    }

    // Additional check: warn if password is medium strength
    if (passwordValidation.strength === 'medium') {
      console.warn(
        `[Signup] User registering with medium-strength password: ${email}`
      );
    }

    // =============================================================================
    // 4. EMAIL UNIQUENESS CHECK
    // =============================================================================
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, isActive: true },
    });

    if (existingUser) {
      // Check if account is inactive (could allow reactivation)
      if (!existingUser.isActive) {
        return res.status(409).json({
          success: false,
          error: 'Cuenta desactivada',
          message:
            'Ya existe una cuenta con este email pero está desactivada. Contacta al administrador para reactivarla.',
          code: 'ACCOUNT_DEACTIVATED',
        });
      }

      // Active account already exists
      return res.status(409).json({
        success: false,
        error: 'Email ya registrado',
        message:
          'Ya existe una cuenta con este email. Por favor inicia sesión o usa otro email.',
        code: 'EMAIL_DUPLICATE',
      });
    }

    // =============================================================================
    // 5. PASSWORD HASHING
    // =============================================================================
    // Use bcrypt with 10 salt rounds (good balance of security and performance)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // =============================================================================
    // 6. USER CREATION IN DATABASE
    // =============================================================================
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'STUDENT', // Default role for new registrations
        isActive: true,
        emailVerified: null, // Will be set after email verification (future feature)
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        isActive: true,
        createdAt: true,
        // IMPORTANT: Never return password, even if hashed
      },
    });

    // =============================================================================
    // 7. SUCCESS LOGGING
    // =============================================================================
    console.log(`[Signup] New user registered: ${newUser.email} (${newUser.id})`);

    // TODO: Send welcome email
    // TODO: Log analytics event
    // TODO: Create initial user preferences/settings

    // =============================================================================
    // 8. SUCCESS RESPONSE
    // =============================================================================
    return res.status(201).json({
      success: true,
      message: 'Cuenta creada exitosamente',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        image: newUser.image,
        createdAt: newUser.createdAt,
      },
      nextStep: 'login',
      loginUrl: '/auth/login',
    });
  } catch (error) {
    // =============================================================================
    // 9. ERROR HANDLING
    // =============================================================================

    // Log error for debugging (never expose internal errors to client)
    console.error('[Signup] Error during user registration:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      email: req.body?.email,
    });

    // Handle Prisma-specific errors
    if (error.code === 'P2002') {
      // Unique constraint violation (email already exists)
      // This is a backup check in case the earlier check missed it (race condition)
      return res.status(409).json({
        success: false,
        error: 'Email ya registrado',
        message: 'Ya existe una cuenta con este email',
        code: 'EMAIL_DUPLICATE',
      });
    }

    if (error.code === 'P2003') {
      // Foreign key constraint violation
      return res.status(400).json({
        success: false,
        error: 'Error de validación',
        message: 'Datos inválidos proporcionados',
      });
    }

    // Handle bcrypt errors
    if (error.name === 'Error' && error.message.includes('bcrypt')) {
      return res.status(500).json({
        success: false,
        error: 'Error de seguridad',
        message:
          'Error al procesar la contraseña. Por favor intenta nuevamente.',
      });
    }

    // Generic error response (don't leak implementation details)
    return res.status(500).json({
      success: false,
      error: 'Error del servidor',
      message:
        'Ocurrió un error al crear tu cuenta. Por favor intenta nuevamente más tarde.',
      ...(process.env.NODE_ENV === 'development' && {
        debug: error.message,
      }),
    });
  }
}

/**
 * =============================================================================
 * RATE LIMITING CONFIGURATION (Future Enhancement)
 * =============================================================================
 * Consider implementing rate limiting to prevent abuse:
 *
 * import rateLimit from 'express-rate-limit';
 *
 * const limiter = rateLimit({
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   max: 5, // limit each IP to 5 requests per windowMs
 *   message: 'Demasiados intentos de registro. Intenta nuevamente en 15 minutos.',
 * });
 *
 * Apply to this route via Next.js middleware or API route wrapper
 * =============================================================================
 */

/**
 * =============================================================================
 * EMAIL VERIFICATION (Future Enhancement)
 * =============================================================================
 * After successful registration, consider:
 *
 * 1. Generate verification token
 * 2. Send verification email with link
 * 3. Set emailVerified to null initially
 * 4. Create /api/auth/verify-email endpoint
 * 5. Only allow login after email verification (optional)
 *
 * Example token generation:
 * const verificationToken = crypto.randomBytes(32).toString('hex');
 * await prisma.verificationToken.create({
 *   data: {
 *     identifier: email,
 *     token: verificationToken,
 *     expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
 *   },
 * });
 * =============================================================================
 */
