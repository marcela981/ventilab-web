/**
 * Rutas de Administración de Usuarios
 * Proporciona endpoints completos para la gestión administrativa de usuarios
 * 
 * @module routes/admin/users
 * @requires express
 * @requires express-validator
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate, isAdmin } from '../../middleware/auth';
import { PAGINATION, VALIDATION, HTTP_STATUS, ERROR_CODES } from '../../config/constants';
import { AppError } from '../../middleware/errorHandler';

// Importar controladores
import {
  getUsersList,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  resetUserPassword,
  deleteUser,
  getUserStats,
} from '../../controllers/admin/users.controller';

const router = Router();

// =============================================================================
// VALIDADORES
// =============================================================================

/**
 * Validador para la lista de usuarios con filtros
 */
const getUsersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El número de página debe ser un entero positivo')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: PAGINATION.MAX_LIMIT })
    .withMessage(`El límite debe estar entre 1 y ${PAGINATION.MAX_LIMIT}`)
    .toInt(),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La búsqueda no puede exceder 100 caracteres'),
  
  query('role')
    .optional()
    .trim()
    .isIn(['STUDENT', 'TEACHER', 'ADMIN'])
    .withMessage('El rol debe ser STUDENT, TEACHER o ADMIN'),
  
  query('status')
    .optional()
    .trim()
    .isIn(['active', 'inactive'])
    .withMessage('El estado debe ser active o inactive'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('dateFrom debe estar en formato ISO 8601'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('dateTo debe estar en formato ISO 8601'),
  
  query('orderBy')
    .optional()
    .trim()
    .isIn(['createdAt', 'name', 'email', 'role'])
    .withMessage('orderBy debe ser createdAt, name, email o role'),
  
  query('order')
    .optional()
    .trim()
    .isIn(['asc', 'desc'])
    .withMessage('order debe ser asc o desc'),
];

/**
 * Validador para actualizar usuario
 */
const updateUserValidator = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('El ID es requerido')
    .isString()
    .withMessage('El ID debe ser una cadena válida'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: VALIDATION.NAME_MAX_LENGTH })
    .withMessage(`El nombre debe tener entre 3 y ${VALIDATION.NAME_MAX_LENGTH} caracteres`)
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail()
    .isLength({ max: VALIDATION.EMAIL_MAX_LENGTH })
    .withMessage(`El email no puede exceder ${VALIDATION.EMAIL_MAX_LENGTH} caracteres`),
  
  body('role')
    .optional()
    .trim()
    .isIn(['STUDENT', 'TEACHER', 'ADMIN'])
    .withMessage('El rol debe ser STUDENT, TEACHER o ADMIN'),
];

/**
 * Validador para cambiar estado de usuario
 */
const updateStatusValidator = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('El ID es requerido'),
  
  body('isActive')
    .isBoolean()
    .withMessage('isActive debe ser un valor booleano'),
];

/**
 * Validador para crear usuario
 */
const createUserValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 3, max: VALIDATION.NAME_MAX_LENGTH })
    .withMessage(`El nombre debe tener entre 3 y ${VALIDATION.NAME_MAX_LENGTH} caracteres`)
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('El email es requerido')
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail()
    .isLength({ max: VALIDATION.EMAIL_MAX_LENGTH })
    .withMessage(`El email no puede exceder ${VALIDATION.EMAIL_MAX_LENGTH} caracteres`),
  
  body('password')
    .trim()
    .notEmpty()
    .withMessage('La contraseña es requerida')
    .isLength({ min: VALIDATION.PASSWORD_MIN_LENGTH })
    .withMessage(`La contraseña debe tener al menos ${VALIDATION.PASSWORD_MIN_LENGTH} caracteres`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  
  body('role')
    .optional()
    .trim()
    .isIn(['STUDENT', 'TEACHER', 'ADMIN'])
    .withMessage('El rol debe ser STUDENT, TEACHER o ADMIN'),
];

/**
 * Validador para parámetro ID
 */
const idValidator = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('El ID es requerido'),
];

/**
 * Middleware para manejar errores de validación
 */
const handleValidationErrors = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(
      'Errores de validación',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      true,
      errors.array().map(err => err.msg)
    );
  }
  next();
};

// =============================================================================
// DEFINICIÓN DE RUTAS
// =============================================================================

// Todas las rutas requieren autenticación y rol de administrador
router.use(authenticate, isAdmin);

/**
 * @route   GET /api/admin/users
 * @desc    Lista paginada de usuarios con filtros
 * @access  Private/Admin
 */
router.get(
  '/',
  getUsersValidator,
  handleValidationErrors,
  getUsersList
);

/**
 * @route   POST /api/admin/users
 * @desc    Crear un nuevo usuario
 * @access  Private/Admin
 */
router.post(
  '/',
  createUserValidator,
  handleValidationErrors,
  createUser
);

/**
 * @route   GET /api/admin/users/:id/stats
 * @desc    Obtener estadísticas detalladas de un usuario
 * @access  Private/Admin
 */
router.get(
  '/:id/stats',
  idValidator,
  handleValidationErrors,
  getUserStats
);

/**
 * @route   POST /api/admin/users/:id/reset-password
 * @desc    Resetear contraseña de un usuario
 * @access  Private/Admin
 */
router.post(
  '/:id/reset-password',
  idValidator,
  handleValidationErrors,
  resetUserPassword
);

/**
 * @route   PATCH /api/admin/users/:id/status
 * @desc    Cambiar estado de un usuario (activar/desactivar)
 * @access  Private/Admin
 */
router.patch(
  '/:id/status',
  updateStatusValidator,
  handleValidationErrors,
  updateUserStatus
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Obtener un usuario específico por ID
 * @access  Private/Admin
 */
router.get(
  '/:id',
  idValidator,
  handleValidationErrors,
  getUserById
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Actualizar información de un usuario
 * @access  Private/Admin
 */
router.put(
  '/:id',
  updateUserValidator,
  handleValidationErrors,
  updateUser
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Eliminar un usuario (soft delete)
 * @access  Private/Admin
 */
router.delete(
  '/:id',
  idValidator,
  handleValidationErrors,
  deleteUser
);

export default router;
