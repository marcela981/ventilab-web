/**
 * =============================================================================
 * RoleGuard Component for VentyLab
 * =============================================================================
 * Conditional rendering utility based on user roles and permissions
 * Provides flexible access control for UI elements
 * =============================================================================
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Box } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

/**
 * RoleGuard Component
 *
 * Renders children only if the user meets the specified role and permission requirements.
 * Supports multiple authorization strategies:
 * - Role-based: User must have one of the allowed roles
 * - Permission-based: User must have required permissions (all or any)
 * - Combined: User must meet both role AND permission requirements
 *
 * @component
 * @example
 * // Simple role check - Only teachers and admins can see this button
 * <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
 *   <Button>Crear Módulo</Button>
 * </RoleGuard>
 *
 * @example
 * // Permission check - User needs permission to create modules
 * <RoleGuard requiredPermissions={['create_modules']}>
 *   <Button>Crear Módulo</Button>
 * </RoleGuard>
 *
 * @example
 * // Multiple permissions with requireAll - User needs ALL permissions
 * <RoleGuard
 *   requiredPermissions={['create_modules', 'edit_modules']}
 *   requireAll={true}
 * >
 *   <Button>Gestionar Módulos</Button>
 * </RoleGuard>
 *
 * @example
 * // Multiple permissions with any - User needs AT LEAST ONE permission
 * <RoleGuard
 *   requiredPermissions={['view_all_progress', 'view_own_progress']}
 *   requireAll={false}
 * >
 *   <Link href="/progress">Ver Progreso</Link>
 * </RoleGuard>
 *
 * @example
 * // Combined role and permission check
 * <RoleGuard
 *   allowedRoles={['TEACHER', 'ADMIN']}
 *   requiredPermissions={['delete_modules']}
 * >
 *   <IconButton><DeleteIcon /></IconButton>
 * </RoleGuard>
 *
 * @example
 * // With fallback - Show alternative content if unauthorized
 * <RoleGuard
 *   allowedRoles={['ADMIN']}
 *   fallback={<Typography>Solo administradores pueden ver esto</Typography>}
 * >
 *   <AdminPanel />
 * </RoleGuard>
 *
 * @example
 * // With error message - Show error alert if unauthorized
 * <RoleGuard
 *   allowedRoles={['TEACHER']}
 *   showError={true}
 * >
 *   <TeacherDashboard />
 * </RoleGuard>
 *
 * @example
 * // Hide for specific roles - Show to students only
 * <RoleGuard allowedRoles={['STUDENT']}>
 *   <EnrollmentButton />
 * </RoleGuard>
 *
 * @example
 * // Complex nested guards
 * <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
 *   <Box>
 *     <Typography>Panel de Gestión</Typography>
 *     <RoleGuard requiredPermissions={['create_modules']}>
 *       <Button>Crear Módulo</Button>
 *     </RoleGuard>
 *     <RoleGuard requiredPermissions={['delete_modules']} allowedRoles={['ADMIN']}>
 *       <Button>Eliminar Módulo</Button>
 *     </RoleGuard>
 *   </Box>
 * </RoleGuard>
 */
export const RoleGuard = ({
  children,
  allowedRoles = null,
  requiredPermissions = null,
  requireAll = false,
  fallback = null,
  showError = false,
}) => {
  // Get authentication state and user info
  const { user, isAuthenticated, hasPermission, hasAnyPermission } = useAuth();

  // ============================================================================
  // AUTHENTICATION CHECK
  // ============================================================================

  /**
   * First check: User must be authenticated
   * If not authenticated, return fallback or null
   */
  if (!isAuthenticated || !user) {
    if (showError) {
      return (
        <Alert severity="warning" sx={{ my: 2 }}>
          Debes iniciar sesión para ver este contenido.
        </Alert>
      );
    }
    return fallback || null;
  }

  // ============================================================================
  // ROLE VERIFICATION
  // ============================================================================

  /**
   * Second check: Verify user role if allowedRoles is specified
   * User's role must be in the allowedRoles array
   */
  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRole = user.role;
    const hasAllowedRole = allowedRoles.includes(userRole);

    if (!hasAllowedRole) {
      if (showError) {
        const rolesText = allowedRoles.join(', ');
        return (
          <Alert severity="error" sx={{ my: 2 }}>
            No tienes permiso para acceder a este contenido.
            <br />
            <strong>Rol requerido:</strong> {rolesText}
            <br />
            <strong>Tu rol:</strong> {userRole}
          </Alert>
        );
      }
      return fallback || null;
    }
  }

  // ============================================================================
  // PERMISSION VERIFICATION
  // ============================================================================

  /**
   * Third check: Verify permissions if requiredPermissions is specified
   * Supports two modes:
   * - requireAll = true: User must have ALL specified permissions (AND logic)
   * - requireAll = false: User must have AT LEAST ONE permission (OR logic)
   */
  if (
    requiredPermissions &&
    Array.isArray(requiredPermissions) &&
    requiredPermissions.length > 0
  ) {
    let hasRequiredPermissions = false;

    if (requireAll) {
      // AND logic: User must have ALL permissions
      hasRequiredPermissions = requiredPermissions.every((permission) =>
        hasPermission(permission)
      );
    } else {
      // OR logic: User must have AT LEAST ONE permission
      hasRequiredPermissions = hasAnyPermission(requiredPermissions);
    }

    if (!hasRequiredPermissions) {
      if (showError) {
        const permissionsText = requiredPermissions.join(', ');
        const logicText = requireAll
          ? 'todos los siguientes permisos'
          : 'al menos uno de los siguientes permisos';

        return (
          <Alert severity="error" sx={{ my: 2 }}>
            No tienes los permisos necesarios para acceder a este contenido.
            <br />
            <strong>Necesitas {logicText}:</strong> {permissionsText}
          </Alert>
        );
      }
      return fallback || null;
    }
  }

  // ============================================================================
  // RENDER AUTHORIZED CONTENT
  // ============================================================================

  /**
   * All checks passed - render children
   */
  return <>{children}</>;
};

/**
 * PropTypes validation
 */
RoleGuard.propTypes = {
  /**
   * Content to render if user is authorized
   */
  children: PropTypes.node.isRequired,

  /**
   * Array of allowed user roles (e.g., ['TEACHER', 'ADMIN'])
   * User must have one of these roles to see the content
   * If null or empty, role check is skipped
   */
  allowedRoles: PropTypes.arrayOf(PropTypes.string),

  /**
   * Array of required permissions (e.g., ['create_modules', 'edit_modules'])
   * Behavior depends on requireAll prop
   * If null or empty, permission check is skipped
   */
  requiredPermissions: PropTypes.arrayOf(PropTypes.string),

  /**
   * If true, user must have ALL permissions in requiredPermissions (AND logic)
   * If false, user must have AT LEAST ONE permission (OR logic)
   * Default: false
   */
  requireAll: PropTypes.bool,

  /**
   * React element to render if user is not authorized
   * If null, nothing is rendered when unauthorized
   */
  fallback: PropTypes.node,

  /**
   * If true, shows an error Alert when user is not authorized
   * Takes priority over fallback
   * Default: false
   */
  showError: PropTypes.bool,
};

/**
 * Default export
 */
export default RoleGuard;

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/**
 * Example 1: Simple Role Check
 * Only teachers and admins can create modules
 *
 * <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
 *   <Button variant="contained" color="primary">
 *     Crear Módulo
 *   </Button>
 * </RoleGuard>
 */

/**
 * Example 2: Single Permission Check
 * User needs permission to view all progress
 *
 * <RoleGuard requiredPermissions={['view_all_progress']}>
 *   <Link href="/admin/progress">Ver Progreso de Todos</Link>
 * </RoleGuard>
 */

/**
 * Example 3: Multiple Permissions (Any)
 * User needs at least one permission to view progress
 *
 * <RoleGuard
 *   requiredPermissions={['view_all_progress', 'view_own_progress']}
 *   requireAll={false}
 * >
 *   <ProgressCard />
 * </RoleGuard>
 */

/**
 * Example 4: Multiple Permissions (All)
 * User needs both permissions to manage modules
 *
 * <RoleGuard
 *   requiredPermissions={['create_modules', 'edit_modules', 'delete_modules']}
 *   requireAll={true}
 * >
 *   <ModuleManagementPanel />
 * </RoleGuard>
 */

/**
 * Example 5: Combined Role and Permission
 * User must be teacher/admin AND have delete permission
 *
 * <RoleGuard
 *   allowedRoles={['TEACHER', 'ADMIN']}
 *   requiredPermissions={['delete_modules']}
 * >
 *   <IconButton color="error">
 *     <DeleteIcon />
 *   </IconButton>
 * </RoleGuard>
 */

/**
 * Example 6: With Fallback Message
 * Show alternative content for unauthorized users
 *
 * <RoleGuard
 *   allowedRoles={['ADMIN']}
 *   fallback={
 *     <Alert severity="info">
 *       Esta sección está disponible solo para administradores.
 *     </Alert>
 *   }
 * >
 *   <AdminDashboard />
 * </RoleGuard>
 */

/**
 * Example 7: With Error Display
 * Show detailed error message when unauthorized
 *
 * <RoleGuard
 *   allowedRoles={['TEACHER', 'ADMIN']}
 *   requiredPermissions={['manage_users']}
 *   showError={true}
 * >
 *   <UserManagementTable />
 * </RoleGuard>
 */

/**
 * Example 8: Student-Only Content
 * Hide content from teachers and admins
 *
 * <RoleGuard allowedRoles={['STUDENT']}>
 *   <Card>
 *     <CardContent>
 *       <Typography>¡Bienvenido estudiante!</Typography>
 *       <Button>Comenzar Lección</Button>
 *     </CardContent>
 *   </Card>
 * </RoleGuard>
 */

/**
 * Example 9: Conditional Navigation Items
 * Show different menu items based on role
 *
 * <List>
 *   <ListItem button>
 *     <ListItemText primary="Inicio" />
 *   </ListItem>
 *
 *   <RoleGuard allowedRoles={['STUDENT']}>
 *     <ListItem button>
 *       <ListItemText primary="Mis Lecciones" />
 *     </ListItem>
 *   </RoleGuard>
 *
 *   <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
 *     <ListItem button>
 *       <ListItemText primary="Gestionar Contenido" />
 *     </ListItem>
 *   </RoleGuard>
 *
 *   <RoleGuard allowedRoles={['ADMIN']}>
 *     <ListItem button>
 *       <ListItemText primary="Administración" />
 *     </ListItem>
 *   </RoleGuard>
 * </List>
 */

/**
 * Example 10: Nested Guards for Complex Logic
 * Multiple levels of authorization
 *
 * <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
 *   <Box>
 *     <Typography variant="h5">Panel de Gestión de Módulos</Typography>
 *
 *     <RoleGuard requiredPermissions={['create_modules']}>
 *       <Button startIcon={<AddIcon />}>Crear Nuevo Módulo</Button>
 *     </RoleGuard>
 *
 *     <RoleGuard requiredPermissions={['edit_modules']}>
 *       <Button startIcon={<EditIcon />}>Editar Módulo</Button>
 *     </RoleGuard>
 *
 *     <RoleGuard
 *       allowedRoles={['ADMIN']}
 *       requiredPermissions={['delete_modules']}
 *     >
 *       <Button color="error" startIcon={<DeleteIcon />}>
 *         Eliminar Módulo
 *       </Button>
 *     </RoleGuard>
 *   </Box>
 * </RoleGuard>
 */

/**
 * Example 11: Conditional Form Fields
 * Show different form fields based on permissions
 *
 * <form>
 *   <TextField label="Título del Módulo" fullWidth />
 *   <TextField label="Descripción" fullWidth multiline />
 *
 *   <RoleGuard requiredPermissions={['generate_ai_content']}>
 *     <FormControlLabel
 *       control={<Checkbox />}
 *       label="Generar contenido con IA"
 *     />
 *   </RoleGuard>
 *
 *   <RoleGuard allowedRoles={['ADMIN']}>
 *     <FormControlLabel
 *       control={<Switch />}
 *       label="Publicar inmediatamente"
 *     />
 *   </RoleGuard>
 *
 *   <Button type="submit">Guardar</Button>
 * </form>
 */

/**
 * Example 12: Conditional Table Columns
 * Show action columns only to authorized users
 *
 * <Table>
 *   <TableHead>
 *     <TableRow>
 *       <TableCell>Nombre</TableCell>
 *       <TableCell>Email</TableCell>
 *       <TableCell>Rol</TableCell>
 *
 *       <RoleGuard allowedRoles={['ADMIN']}>
 *         <TableCell>Acciones</TableCell>
 *       </RoleGuard>
 *     </TableRow>
 *   </TableHead>
 *   <TableBody>
 *     {users.map(user => (
 *       <TableRow key={user.id}>
 *         <TableCell>{user.name}</TableCell>
 *         <TableCell>{user.email}</TableCell>
 *         <TableCell>{user.role}</TableCell>
 *
 *         <RoleGuard allowedRoles={['ADMIN']}>
 *           <TableCell>
 *             <IconButton><EditIcon /></IconButton>
 *             <IconButton><DeleteIcon /></IconButton>
 *           </TableCell>
 *         </RoleGuard>
 *       </TableRow>
 *     ))}
 *   </TableBody>
 * </Table>
 */
