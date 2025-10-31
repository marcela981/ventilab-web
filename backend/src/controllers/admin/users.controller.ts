/**
 * Controladores de Administración de Usuarios
 * Contiene toda la lógica de negocio para la gestión administrativa de usuarios
 * 
 * @module controllers/admin/users
 * @requires express
 * @requires prisma
 * @requires bcrypt
 * @requires crypto
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { sendSuccess, sendPaginatedSuccess, sendCreated } from '../../utils/response';
import prisma from '../../config/database';
import {
  HTTP_STATUS,
  ERROR_CODES,
  ERROR_MESSAGES,
  PAGINATION,
  USER_ROLES,
} from '../../config/constants';
import { hashPassword } from '../../utils/password';
import crypto from 'crypto';

// =============================================================================
// TIPOS Y UTILIDADES
// =============================================================================

/**
 * Interfaz para filtros de búsqueda de usuarios
 */
interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  orderBy?: string;
  order?: string;
}

/**
 * Genera una contraseña temporal segura usando crypto
 * @param length - Longitud de la contraseña (default: 12)
 * @returns Contraseña temporal aleatoria segura
 */
const generateSecurePassword = (length: number = 12): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';
  
  // Asegurar al menos un carácter de cada tipo
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += symbols[crypto.randomInt(0, symbols.length)];

  // Rellenar el resto con caracteres aleatorios
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }

  // Mezclar la contraseña usando crypto para mayor aleatoriedad
  return password
    .split('')
    .sort(() => crypto.randomInt(0, 2) - 1)
    .join('');
};

// =============================================================================
// CONTROLADORES
// =============================================================================

/**
 * Obtiene una lista paginada de usuarios con filtros opcionales
 * 
 * @route   GET /api/admin/users
 * @access  Private/Admin
 * 
 * @param {AuthRequest} req - Request de Express con usuario autenticado
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Next function de Express
 * 
 * @returns {Promise<void>} Lista paginada de usuarios con metadata
 * 
 * @throws {AppError} Si hay un error en la consulta a la base de datos
 * 
 * @description
 * Esta función maneja la obtención de usuarios con soporte para:
 * - Paginación (page, limit)
 * - Búsqueda por nombre o email (search)
 * - Filtro por rol (role)
 * - Filtro por estado activo/inactivo (status)
 * - Filtro por rango de fechas (dateFrom, dateTo)
 * - Ordenamiento configurable (orderBy, order)
 */
export const getUsersList = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extraer y parsear query parameters
      const page = parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE;
      const limit = Math.min(
        parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT,
        PAGINATION.MAX_LIMIT
      );
      const search = req.query.search as string;
      const role = req.query.role as string;
      const status = req.query.status as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const orderBy = (req.query.orderBy as string) || 'createdAt';
      const order = (req.query.order as string) || 'desc';

      // Construir objeto where para Prisma
      const where: any = {};

      // Filtro de búsqueda en nombre o email (OR)
      if (search) {
        where.OR = [
          {
            name: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        ];
      }

      // Filtro por rol
      if (role && Object.values(USER_ROLES).includes(role as any)) {
        where.role = role;
      }

      // Filtro por estado (activo/inactivo)
      if (status === 'active' || status === 'inactive') {
        where.isActive = status === 'active';
      }

      // Filtro por rango de fechas
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.createdAt.lte = new Date(dateTo);
        }
      }

      // Calcular skip para paginación
      const skip = (page - 1) * limit;

      // Construir objeto orderBy
      const orderByClause: any = {};
      orderByClause[orderBy] = order;

      // Ejecutar consultas en paralelo para mejor rendimiento
      const [users, totalUsers] = await Promise.all([
        // Obtener usuarios con paginación
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            image: true,
            emailVerified: true,
            bio: true,
            // Incluir contadores de relaciones
            _count: {
              select: {
                learningProgress: true,
                quizAttempts: true,
                learningSessions: true,
                achievements: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: orderByClause,
        }),
        // Contar total de usuarios con los mismos filtros
        prisma.user.count({ where }),
      ]);

      // Calcular total de páginas
      const totalPages = Math.ceil(totalUsers / limit);

      // Log para debugging en desarrollo
      console.log(`📋 [Admin] Lista de usuarios obtenida - Página ${page}/${totalPages}, Total: ${totalUsers}`);

      // Enviar respuesta paginada
      sendPaginatedSuccess(
        res,
        users,
        page,
        limit,
        totalUsers,
        'Lista de usuarios obtenida exitosamente'
      );
    } catch (error) {
      console.error('❌ [Admin] Error al obtener lista de usuarios:', error);
      throw new AppError(
        'Error al obtener la lista de usuarios',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        true,
        ['Ocurrió un error al procesar la solicitud. Por favor, intente nuevamente.']
      );
    }
  }
);

/**
 * Obtiene un usuario específico por ID con todas sus relaciones y estadísticas
 * 
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 * 
 * @param {AuthRequest} req - Request con el ID del usuario en params
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Next function de Express
 * 
 * @returns {Promise<void>} Usuario completo con estadísticas
 * 
 * @throws {AppError} 404 - Si el usuario no existe
 * @throws {AppError} 500 - Si hay un error en la consulta
 */
export const getUserById = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Buscar usuario con todas sus relaciones
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          image: true,
          emailVerified: true,
          bio: true,
          // Incluir progreso de aprendizaje con módulos
          learningProgress: {
            select: {
              id: true,
              moduleId: true,
              completedAt: true,
              timeSpent: true,
              score: true,
              module: {
                select: {
                  id: true,
                  title: true,
                  category: true,
                  difficulty: true,
                },
              },
              lessonProgress: {
                select: {
                  id: true,
                  lessonId: true,
                  completed: true,
                  timeSpent: true,
                  lastAccessed: true,
                },
              },
            },
          },
          // Incluir intentos de quiz
          quizAttempts: {
            select: {
              id: true,
              quizId: true,
              answer: true,
              isCorrect: true,
              timeSpent: true,
              attemptedAt: true,
            },
            orderBy: {
              attemptedAt: 'desc' as const,
            },
            take: 50, // Limitar a los últimos 50 intentos
          },
          // Incluir sesiones de aprendizaje
          learningSessions: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              duration: true,
              modulesAccessed: true,
              lessonsViewed: true,
              quizzesTaken: true,
            },
            orderBy: {
              startTime: 'desc' as const,
            },
            take: 10, // Limitar a las últimas 10 sesiones
          },
          // Incluir logros
          achievements: {
            select: {
              id: true,
              type: true,
              title: true,
              description: true,
              icon: true,
              points: true,
              unlockedAt: true,
            },
            orderBy: {
              unlockedAt: 'desc' as const,
            },
          },
        },
      });

      // Verificar si el usuario existe
      if (!user) {
        throw new AppError(
          'Usuario no encontrado',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.USER_NOT_FOUND,
          true,
          ['No se encontró un usuario con el ID proporcionado']
        );
      }

      // Calcular estadísticas agregadas
      const modulesCompleted = user.learningProgress.filter(
        (progress) => progress.completedAt !== null
      ).length;

      const totalLessons = user.learningProgress.reduce(
        (total, progress) => total + progress.lessonProgress.length,
        0
      );

      const lessonsCompleted = user.learningProgress.reduce(
        (total, progress) =>
          total + progress.lessonProgress.filter((lp) => lp.completed).length,
        0
      );

      const totalStudyTime = user.learningProgress.reduce(
        (total, progress) => total + progress.timeSpent,
        0
      );

      // Calcular última actividad
      const lastActivity =
        user.learningSessions.length > 0
          ? user.learningSessions[0].startTime
          : user.updatedAt;

      // Estadísticas de quizzes
      const totalQuizAttempts = user.quizAttempts.length;
      const correctQuizAnswers = user.quizAttempts.filter(
        (attempt) => attempt.isCorrect
      ).length;
      const quizSuccessRate =
        totalQuizAttempts > 0
          ? ((correctQuizAnswers / totalQuizAttempts) * 100).toFixed(2)
          : '0.00';

      // Total de logros
      const totalAchievements = user.achievements.length;

      // Preparar respuesta estructurada
      const response = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          image: user.image,
          emailVerified: user.emailVerified,
          bio: user.bio,
        },
        stats: {
          modulesCompleted,
          totalModules: user.learningProgress.length,
          lessonsCompleted,
          totalLessons,
          totalStudyTime,
          lastActivity,
          totalQuizAttempts,
          correctQuizAnswers,
          quizSuccessRate,
          totalAchievements,
        },
        progress: user.learningProgress,
        recentQuizAttempts: user.quizAttempts.slice(0, 10),
        recentSessions: user.learningSessions,
        achievements: user.achievements,
      };

      console.log(`👤 [Admin] Usuario obtenido: ${user.email} (ID: ${id})`);

      sendSuccess(
        res,
        HTTP_STATUS.OK,
        'Usuario obtenido exitosamente',
        response
      );
    } catch (error) {
      // Si ya es un AppError, relanzarlo
      if (error instanceof AppError) {
        throw error;
      }

      console.error('❌ [Admin] Error al obtener usuario por ID:', error);
      throw new AppError(
        'Error al obtener el usuario',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        true,
        ['Ocurrió un error al procesar la solicitud. Por favor, intente nuevamente.']
      );
    }
  }
);

/**
 * Actualiza la información de un usuario existente
 * 
 * @route   PUT /api/admin/users/:id
 * @access  Private/Admin
 * 
 * @param {AuthRequest} req - Request con ID en params y datos en body
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Next function de Express
 * 
 * @returns {Promise<void>} Usuario actualizado
 * 
 * @throws {AppError} 404 - Si el usuario no existe
 * @throws {AppError} 409 - Si el email ya está en uso
 * @throws {AppError} 400 - Si los datos son inválidos
 */
export const updateUser = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, email, role } = req.body;

      // Verificar que el usuario existe
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true },
      });

      if (!existingUser) {
        throw new AppError(
          'Usuario no encontrado',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.USER_NOT_FOUND,
          true,
          ['No se encontró un usuario con el ID proporcionado']
        );
      }

      // Si se está actualizando el email, verificar que sea único
      if (email && email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });

        if (emailExists) {
          throw new AppError(
            'Email ya está en uso',
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.EMAIL_ALREADY_EXISTS,
            true,
            ['El email proporcionado ya está registrado por otro usuario']
          );
        }
      }

      // Construir objeto de actualización solo con campos proporcionados
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined && Object.values(USER_ROLES).includes(role)) {
        updateData.role = role;
      }

      // Actualizar usuario
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          image: true,
          emailVerified: true,
          bio: true,
        },
      });

      console.log(`✏️ [Admin] Usuario actualizado: ${updatedUser.email} (ID: ${id})`);

      sendSuccess(
        res,
        HTTP_STATUS.OK,
        'Usuario actualizado exitosamente',
        updatedUser
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('❌ [Admin] Error al actualizar usuario:', error);
      throw new AppError(
        'Error al actualizar el usuario',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        true,
        ['Ocurrió un error al procesar la solicitud. Por favor, intente nuevamente.']
      );
    }
  }
);

/**
 * Actualiza únicamente el estado activo/inactivo de un usuario
 * 
 * @route   PATCH /api/admin/users/:id/status
 * @access  Private/Admin
 * 
 * @param {AuthRequest} req - Request con ID en params e isActive en body
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Next function de Express
 * 
 * @returns {Promise<void>} Usuario con estado actualizado
 * 
 * @throws {AppError} 404 - Si el usuario no existe
 */
export const updateUserStatus = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      // Verificar que el usuario existe
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, isActive: true },
      });

      if (!user) {
        throw new AppError(
          'Usuario no encontrado',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.USER_NOT_FOUND,
          true,
          ['No se encontró un usuario con el ID proporcionado']
        );
      }

      // Actualizar solo el estado
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      console.log(
        `🔄 [Admin] Estado de usuario actualizado: ${updatedUser.email} - ${
          isActive ? 'Activado' : 'Desactivado'
        }`
      );

      sendSuccess(
        res,
        HTTP_STATUS.OK,
        `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
        updatedUser
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('❌ [Admin] Error al actualizar estado del usuario:', error);
      throw new AppError(
        'Error al actualizar el estado del usuario',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        true,
        ['Ocurrió un error al procesar la solicitud. Por favor, intente nuevamente.']
      );
    }
  }
);

/**
 * Genera y asigna una contraseña temporal a un usuario
 * 
 * @route   POST /api/admin/users/:id/reset-password
 * @access  Private/Admin
 * 
 * @param {AuthRequest} req - Request con ID del usuario en params
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Next function de Express
 * 
 * @returns {Promise<void>} Contraseña temporal en texto plano
 * 
 * @throws {AppError} 404 - Si el usuario no existe
 * 
 * @description
 * Genera una contraseña temporal segura de 12 caracteres usando crypto,
 * la hashea con bcrypt (10 salt rounds) y la almacena en la base de datos.
 * Retorna la contraseña en texto plano para que el admin la proporcione al usuario.
 */
export const resetUserPassword = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Verificar que el usuario existe
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      if (!user) {
        throw new AppError(
          'Usuario no encontrado',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.USER_NOT_FOUND,
          true,
          ['No se encontró un usuario con el ID proporcionado']
        );
      }

      // Generar contraseña temporal segura usando crypto
      const temporaryPassword = generateSecurePassword(12);

      console.log(`🔐 [Admin] Generando nueva contraseña para: ${user.email}`);

      // Hashear contraseña con bcrypt (10 salt rounds)
      const hashedPassword = await hashPassword(temporaryPassword);

      // Actualizar contraseña en la base de datos
      await prisma.user.update({
        where: { id },
        data: {
          password: hashedPassword,
        },
      });

      console.log(`✅ [Admin] Contraseña reseteada exitosamente para: ${user.email}`);

      // TODO: Implementar envío de email con la contraseña temporal
      // await sendPasswordResetEmail(user.email, user.name, temporaryPassword);

      sendSuccess(res, HTTP_STATUS.OK, 'Contraseña temporal generada exitosamente', {
        temporaryPassword,
        userId: user.id,
        email: user.email,
        message:
          'Guarde esta contraseña temporal de forma segura. Esta es la única vez que se mostrará.',
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('❌ [Admin] Error al resetear contraseña:', error);
      throw new AppError(
        'Error al resetear la contraseña',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        true,
        ['Ocurrió un error al procesar la solicitud. Por favor, intente nuevamente.']
      );
    }
  }
);

/**
 * Elimina un usuario (soft delete)
 * 
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 * 
 * @param {AuthRequest} req - Request con ID del usuario en params
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Next function de Express
 * 
 * @returns {Promise<void>} Confirmación de eliminación
 * 
 * @throws {AppError} 404 - Si el usuario no existe
 * @throws {AppError} 400 - Si el usuario tiene progreso crítico
 * 
 * @description
 * Realiza un soft delete del usuario marcándolo como inactivo.
 * Verifica que el usuario no tenga progreso crítico (lecciones completadas)
 * antes de permitir la eliminación. Si tiene progreso, retorna error 400.
 */
export const deleteUser = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Verificar que el usuario existe
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      if (!user) {
        throw new AppError(
          'Usuario no encontrado',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.USER_NOT_FOUND,
          true,
          ['No se encontró un usuario con el ID proporcionado']
        );
      }

      // Verificar progreso crítico: contar lecciones completadas
      const completedLessonsCount = await prisma.lessonProgress.count({
        where: {
          completed: true,
          learningProgress: {
            userId: id,
          },
        },
      });

      // Verificar si tiene módulos completados
      const completedModulesCount = await prisma.learningProgress.count({
        where: {
          userId: id,
          completedAt: {
            not: null,
          },
        },
      });

      // Si tiene progreso crítico, no permitir eliminación
      if (completedLessonsCount > 0 || completedModulesCount > 0) {
        throw new AppError(
          'No se puede eliminar el usuario',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
          true,
          [
            'Este usuario tiene lecciones o módulos completados y no puede ser eliminado',
            `Lecciones completadas: ${completedLessonsCount}`,
            `Módulos completados: ${completedModulesCount}`,
            'Por razones de integridad de datos, los usuarios con progreso deben ser desactivados en lugar de eliminados',
          ]
        );
      }

      // Realizar soft delete: marcar como inactivo
      await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
        },
      });

      console.log(`🗑️ [Admin] Usuario eliminado (soft delete): ${user.email} (ID: ${id})`);

      sendSuccess(res, HTTP_STATUS.OK, 'Usuario eliminado exitosamente', {
        id,
        email: user.email,
        name: user.name,
        deletedAt: new Date(),
        message:
          'El usuario ha sido desactivado. Sus datos permanecen en el sistema por razones de auditoría.',
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('❌ [Admin] Error al eliminar usuario:', error);
      throw new AppError(
        'Error al eliminar el usuario',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        true,
        ['Ocurrió un error al procesar la solicitud. Por favor, intente nuevamente.']
      );
    }
  }
);

/**
 * Crea un nuevo usuario desde el panel de administración
 * 
 * @route   POST /api/admin/users
 * @access  Private/Admin
 * 
 * @param {AuthRequest} req - Request con datos del nuevo usuario en body
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Next function de Express
 * 
 * @returns {Promise<void>} Usuario creado
 * 
 * @throws {AppError} 409 - Si el email ya está en uso
 * @throws {AppError} 400 - Si los datos son inválidos
 * 
 * @description
 * Crea un nuevo usuario con los datos proporcionados, hasheando la contraseña
 * con bcrypt y estableciendo el rol y estado activo por defecto.
 */
export const createUser = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password, role = USER_ROLES.STUDENT } = req.body;

      // Verificar que el email sea único
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
      });

      if (existingUser) {
        throw new AppError(
          'Email ya está en uso',
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.EMAIL_ALREADY_EXISTS,
          true,
          ['El email proporcionado ya está registrado en el sistema']
        );
      }

      // Validar que el rol sea válido
      if (!Object.values(USER_ROLES).includes(role)) {
        throw new AppError(
          'Rol inválido',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          true,
          [`El rol debe ser uno de: ${Object.values(USER_ROLES).join(', ')}`]
        );
      }

      console.log(`➕ [Admin] Creando nuevo usuario: ${email} con rol ${role}`);

      // Hashear contraseña con bcrypt (10 salt rounds)
      const hashedPassword = await hashPassword(password);

      // Crear usuario
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          image: true,
          emailVerified: true,
        },
      });

      console.log(`✅ [Admin] Usuario creado exitosamente: ${newUser.email} (ID: ${newUser.id})`);

      sendCreated(res, 'Usuario creado exitosamente', newUser);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('❌ [Admin] Error al crear usuario:', error);
      throw new AppError(
        'Error al crear el usuario',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        true,
        ['Ocurrió un error al procesar la solicitud. Por favor, intente nuevamente.']
      );
    }
  }
);

/**
 * Obtiene estadísticas detalladas de un usuario
 * 
 * @route   GET /api/admin/users/:id/stats
 * @access  Private/Admin
 * 
 * @param {AuthRequest} req - Request con ID del usuario en params
 * @param {Response} res - Response de Express
 * @param {NextFunction} next - Next function de Express
 * 
 * @returns {Promise<void>} Estadísticas completas del usuario
 * 
 * @throws {AppError} 404 - Si el usuario no existe
 * 
 * @description
 * Retorna estadísticas detalladas incluyendo:
 * - Resumen general (módulos, lecciones, tiempo de estudio)
 * - Progreso por módulo
 * - Estadísticas de quizzes
 * - Actividad reciente
 * - Progreso temporal agrupado por mes
 * - Logros obtenidos
 */
export const getUserStats = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Verificar que el usuario existe y obtener todos sus datos
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          // Incluir todo el progreso de aprendizaje
          learningProgress: {
            include: {
              module: {
                select: {
                  id: true,
                  title: true,
                  category: true,
                  difficulty: true,
                  estimatedTime: true,
                },
              },
              lessonProgress: {
                select: {
                  lessonId: true,
                  completed: true,
                  timeSpent: true,
                  lastAccessed: true,
                },
              },
            },
          },
          // Incluir todos los intentos de quiz
          quizAttempts: {
            select: {
              quizId: true,
              isCorrect: true,
              attemptedAt: true,
              quiz: {
                select: {
                  points: true,
                  lessonId: true,
                },
              },
            },
          },
          // Incluir todas las sesiones de aprendizaje
          learningSessions: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              duration: true,
              modulesAccessed: true,
              lessonsViewed: true,
              quizzesTaken: true,
            },
            orderBy: {
              startTime: 'desc' as const,
            },
          },
          // Incluir todos los logros
          achievements: {
            select: {
              id: true,
              type: true,
              title: true,
              description: true,
              icon: true,
              points: true,
              unlockedAt: true,
            },
            orderBy: {
              unlockedAt: 'desc' as const,
            },
          },
        },
      });

      if (!user) {
        throw new AppError(
          'Usuario no encontrado',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.USER_NOT_FOUND,
          true,
          ['No se encontró un usuario con el ID proporcionado']
        );
      }

      // ===== CALCULAR ESTADÍSTICAS GENERALES =====

      const totalModules = user.learningProgress.length;
      const completedModules = user.learningProgress.filter(
        (p) => p.completedAt !== null
      ).length;

      const totalLessons = user.learningProgress.reduce(
        (sum, p) => sum + p.lessonProgress.length,
        0
      );
      const completedLessons = user.learningProgress.reduce(
        (sum, p) => sum + p.lessonProgress.filter((lp) => lp.completed).length,
        0
      );

      const totalStudyTime = user.learningProgress.reduce(
        (sum, p) => sum + p.timeSpent,
        0
      );

      const averageStudyTimePerModule =
        totalModules > 0 ? Math.round(totalStudyTime / totalModules) : 0;

      const moduleCompletionRate =
        totalModules > 0 ? ((completedModules / totalModules) * 100).toFixed(2) : '0.00';

      const lessonCompletionRate =
        totalLessons > 0 ? ((completedLessons / totalLessons) * 100).toFixed(2) : '0.00';

      // ===== ESTADÍSTICAS DE QUIZZES =====

      const totalQuizAttempts = user.quizAttempts.length;
      const correctQuizAnswers = user.quizAttempts.filter((a) => a.isCorrect).length;
      const quizSuccessRate =
        totalQuizAttempts > 0
          ? ((correctQuizAnswers / totalQuizAttempts) * 100).toFixed(2)
          : '0.00';
      const totalQuizPoints = user.quizAttempts
        .filter((a) => a.isCorrect)
        .reduce((sum, a) => sum + (a.quiz.points || 0), 0);

      // ===== PROGRESO POR MÓDULO =====

      const progressByModule = user.learningProgress.map((progress) => ({
        moduleId: progress.module.id,
        moduleTitle: progress.module.title,
        category: progress.module.category,
        difficulty: progress.module.difficulty,
        estimatedTime: progress.module.estimatedTime,
        completed: progress.completedAt !== null,
        completedAt: progress.completedAt,
        lessonsCompleted: progress.lessonProgress.filter((lp) => lp.completed).length,
        totalLessons: progress.lessonProgress.length,
        timeSpent: progress.timeSpent,
        score: progress.score,
        completionRate:
          progress.lessonProgress.length > 0
            ? (
                (progress.lessonProgress.filter((lp) => lp.completed).length /
                  progress.lessonProgress.length) *
                100
              ).toFixed(2)
            : '0.00',
      }));

      // ===== ACTIVIDAD RECIENTE =====

      const recentSessions = user.learningSessions.slice(0, 10).map((session) => ({
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        modulesAccessed: session.modulesAccessed,
        lessonsViewed: session.lessonsViewed,
        quizzesTaken: session.quizzesTaken,
      }));

      const lastActivity =
        user.learningSessions.length > 0
          ? user.learningSessions[0].startTime
          : user.createdAt;

      const totalSessions = user.learningSessions.length;
      const totalSessionTime = user.learningSessions.reduce(
        (sum, s) => sum + (s.duration || 0),
        0
      );

      // ===== PROGRESO TEMPORAL (agrupado por mes) =====

      const progressOverTime = user.learningProgress
        .filter((p) => p.completedAt)
        .reduce((acc: any[], progress) => {
          const month = progress.completedAt!.toISOString().substring(0, 7); // YYYY-MM
          const existing = acc.find((item) => item.month === month);
          if (existing) {
            existing.modulesCompleted += 1;
          } else {
            acc.push({
              month,
              modulesCompleted: 1,
            });
          }
          return acc;
        }, [])
        .sort((a, b) => a.month.localeCompare(b.month));

      // ===== LOGROS =====

      const achievements = user.achievements.map((achievement) => ({
        id: achievement.id,
        type: achievement.type,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        points: achievement.points,
        unlockedAt: achievement.unlockedAt,
      }));

      const totalAchievementPoints = achievements.reduce(
        (sum, a) => sum + a.points,
        0
      );

      // ===== CONSTRUIR RESPUESTA ESTRUCTURADA =====

      const stats = {
        overview: {
          totalModules,
          completedModules,
          moduleCompletionRate,
          totalLessons,
          completedLessons,
          lessonCompletionRate,
          totalStudyTime,
          averageStudyTimePerModule,
        },
        quizzes: {
          totalAttempts: totalQuizAttempts,
          correctAnswers: correctQuizAnswers,
          successRate: quizSuccessRate,
          totalPoints: totalQuizPoints,
        },
        progress: progressByModule,
        activity: {
          recentSessions,
          totalSessions,
          totalSessionTime,
          lastActivity,
        },
        progressOverTime,
        achievements: {
          total: achievements.length,
          totalPoints: totalAchievementPoints,
          list: achievements,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          memberSince: user.createdAt,
        },
      };

      console.log(`📊 [Admin] Estadísticas obtenidas para: ${user.email}`);

      sendSuccess(
        res,
        HTTP_STATUS.OK,
        'Estadísticas del usuario obtenidas exitosamente',
        stats
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error('❌ [Admin] Error al obtener estadísticas del usuario:', error);
      throw new AppError(
        'Error al obtener estadísticas del usuario',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        true,
        ['Ocurrió un error al procesar la solicitud. Por favor, intente nuevamente.']
      );
    }
  }
);

