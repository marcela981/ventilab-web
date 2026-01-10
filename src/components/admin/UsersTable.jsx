/**
 * =============================================================================
 * UsersTable Component
 * =============================================================================
 *
 * Tabla principal de usuarios para el panel de administración con funcionalidades
 * completas de visualización, ordenamiento, paginación y acciones.
 *
 * Características:
 * - Tabla completa con avatar, nombre, email, rol, fechas y estado
 * - Ordenamiento por cualquier columna
 * - Paginación con múltiples opciones de filas por página
 * - Acciones inline (editar, activar/desactivar)
 * - Menú de acciones adicionales (estadísticas, resetear password, historial, eliminar)
 * - Vista responsive: tabla en desktop, cards en mobile
 * - Estados de loading con Skeleton
 * - Manejo de estados vacíos
 * - Avatares con colores basados en hash del nombre
 * - Fechas relativas para último acceso
 *
 * =============================================================================
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  IconButton,
  Avatar,
  Chip,
  Typography,
  Tooltip,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Edit,
  MoreVert,
  ToggleOn,
  ToggleOff,
  Assessment,
  VpnKey,
  History,
  DeleteOutline,
  PersonOutline,
} from '@mui/icons-material';
import { formatDistanceToNow, format, isAfter, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Columnas de la tabla
 */
const TABLE_COLUMNS = [
  { id: 'avatar', label: 'Usuario', sortable: false, align: 'left' },
  { id: 'name', label: 'Nombre', sortable: true, align: 'left' },
  { id: 'email', label: 'Email', sortable: true, align: 'left' },
  { id: 'role', label: 'Rol', sortable: true, align: 'left' },
  { id: 'createdAt', label: 'Fecha de Registro', sortable: true, align: 'left' },
  { id: 'lastAccess', label: 'Último Acceso', sortable: true, align: 'left' },
  { id: 'isActive', label: 'Estado', sortable: true, align: 'center' },
  { id: 'actions', label: 'Acciones', sortable: false, align: 'right' },
];

/**
 * Genera un color basado en el hash de un string
 *
 * @param {string} str - String para generar el hash
 * @returns {string} Color en formato hex
 */
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    '#1976d2', // blue
    '#388e3c', // green
    '#d32f2f', // red
    '#f57c00', // orange
    '#7b1fa2', // purple
    '#0097a7', // cyan
    '#c2185b', // pink
    '#5d4037', // brown
    '#455a64', // blue grey
    '#00897b', // teal
  ];

  return colors[Math.abs(hash) % colors.length];
};

/**
 * Obtiene las iniciales de un nombre
 *
 * @param {string} name - Nombre completo
 * @returns {string} Iniciales (máximo 2 caracteres)
 */
const getInitials = (name) => {
  if (!name) return '?';

  const nameParts = name.trim().split(' ');
  if (nameParts.length === 1) {
    return nameParts[0].substring(0, 2).toUpperCase();
  }

  return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
};

/**
 * Obtiene el color del chip según el rol
 *
 * @param {string} role - Rol del usuario
 * @returns {string} Color del chip
 */
const getRoleColor = (role) => {
  switch (role) {
    case 'STUDENT':
      return 'primary';
    case 'TEACHER':
      return 'success';
    case 'ADMIN':
      return 'warning';
    default:
      return 'default';
  }
};

/**
 * Obtiene la etiqueta en español del rol
 *
 * @param {string} role - Rol del usuario
 * @returns {string} Etiqueta en español
 */
const getRoleLabel = (role) => {
  switch (role) {
    case 'STUDENT':
      return 'Estudiante';
    case 'TEACHER':
      return 'Profesor';
    case 'ADMIN':
      return 'Administrador';
    default:
      return role;
  }
};

/**
 * Formatea una fecha de forma relativa si es reciente, o absoluta si es antigua
 *
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
const formatRelativeDate = (date) => {
  if (!date) return 'Nunca';

  const dateObj = new Date(date);
  const sevenDaysAgo = subDays(new Date(), 7);

  // Si es de hace menos de 7 días, mostrar fecha relativa
  if (isAfter(dateObj, sevenDaysAgo)) {
    return formatDistanceToNow(dateObj, {
      addSuffix: true,
      locale: es,
    });
  }

  // Si es más antigua, mostrar fecha completa
  return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: es });
};

/**
 * Componente de fila de la tabla (Vista Desktop)
 */
const UserTableRow = ({
  user,
  onEdit,
  onToggleStatus,
  onViewStats,
  onResetPassword,
  onViewHistory,
  onDelete,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMenuAction = (action) => {
    handleMenuClose();
    action(user);
  };

  const avatarColor = stringToColor(user.name);
  const initials = getInitials(user.name);

  return (
    <TableRow hover>
      {/* Avatar */}
      <TableCell>
        <Avatar
          sx={{
            bgcolor: avatarColor,
            width: 40,
            height: 40,
            fontSize: '0.875rem',
            fontWeight: 'bold',
          }}
        >
          {initials}
        </Avatar>
      </TableCell>

      {/* Nombre */}
      <TableCell>
        <Typography variant="body2" fontWeight={500}>
          {user.name}
        </Typography>
      </TableCell>

      {/* Email */}
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {user.email}
        </Typography>
      </TableCell>

      {/* Rol */}
      <TableCell>
        <Chip
          label={getRoleLabel(user.role)}
          color={getRoleColor(user.role)}
          size="small"
          variant="filled"
        />
      </TableCell>

      {/* Fecha de Registro */}
      <TableCell>
        <Typography variant="body2">
          {new Date(user.createdAt).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Typography>
      </TableCell>

      {/* Último Acceso */}
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {formatRelativeDate(user.lastAccess)}
        </Typography>
      </TableCell>

      {/* Estado */}
      <TableCell align="center">
        <Chip
          label={user.isActive ? 'Activo' : 'Inactivo'}
          color={user.isActive ? 'success' : 'error'}
          size="small"
        />
      </TableCell>

      {/* Acciones */}
      <TableCell align="right">
        <Tooltip title="Editar usuario">
          <IconButton
            size="small"
            color="primary"
            onClick={() => onEdit(user)}
          >
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={user.isActive ? 'Desactivar usuario' : 'Activar usuario'}>
          <IconButton
            size="small"
            color={user.isActive ? 'error' : 'success'}
            onClick={() => onToggleStatus(user)}
          >
            {user.isActive ? (
              <ToggleOff fontSize="small" />
            ) : (
              <ToggleOn fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title="Más opciones">
          <IconButton
            size="small"
            onClick={handleMenuOpen}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Menú de opciones adicionales */}
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={() => handleMenuAction(onViewStats)}>
            <Assessment fontSize="small" sx={{ mr: 1 }} />
            Ver estadísticas
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction(onResetPassword)}>
            <VpnKey fontSize="small" sx={{ mr: 1 }} />
            Resetear contraseña
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction(onViewHistory)}>
            <History fontSize="small" sx={{ mr: 1 }} />
            Ver historial
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => handleMenuAction(onDelete)}
            sx={{ color: 'error.main' }}
          >
            <DeleteOutline fontSize="small" sx={{ mr: 1 }} />
            Eliminar usuario
          </MenuItem>
        </Menu>
      </TableCell>
    </TableRow>
  );
};

/**
 * Componente de card para vista mobile
 */
const UserCard = ({
  user,
  onEdit,
  onToggleStatus,
  onViewStats,
  onResetPassword,
  onViewHistory,
  onDelete,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMenuAction = (action) => {
    handleMenuClose();
    action(user);
  };

  const avatarColor = stringToColor(user.name);
  const initials = getInitials(user.name);

  return (
    <Card elevation={2} sx={{ mb: 2 }}>
      <CardContent>
        {/* Header con Avatar y Acciones */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: avatarColor,
              width: 48,
              height: 48,
              fontSize: '1rem',
              fontWeight: 'bold',
              mr: 2,
            }}
          >
            {initials}
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {user.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
          </Box>

          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
        </Box>

        {/* Información del Usuario */}
        <Stack spacing={1} divider={<Divider />}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Rol
            </Typography>
            <Chip
              label={getRoleLabel(user.role)}
              color={getRoleColor(user.role)}
              size="small"
              variant="filled"
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Estado
            </Typography>
            <Chip
              label={user.isActive ? 'Activo' : 'Inactivo'}
              color={user.isActive ? 'success' : 'error'}
              size="small"
            />
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Registro
            </Typography>
            <Typography variant="body2">
              {new Date(user.createdAt).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Último acceso
            </Typography>
            <Typography variant="body2">
              {formatRelativeDate(user.lastAccess)}
            </Typography>
          </Box>
        </Stack>

        {/* Acciones */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Tooltip title="Editar usuario">
            <IconButton
              size="small"
              color="primary"
              onClick={() => onEdit(user)}
              sx={{ flex: 1 }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={user.isActive ? 'Desactivar usuario' : 'Activar usuario'}>
            <IconButton
              size="small"
              color={user.isActive ? 'error' : 'success'}
              onClick={() => onToggleStatus(user)}
              sx={{ flex: 1 }}
            >
              {user.isActive ? <ToggleOff /> : <ToggleOn />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Menú de opciones adicionales */}
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={() => handleMenuAction(onViewStats)}>
            <Assessment fontSize="small" sx={{ mr: 1 }} />
            Ver estadísticas
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction(onResetPassword)}>
            <VpnKey fontSize="small" sx={{ mr: 1 }} />
            Resetear contraseña
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction(onViewHistory)}>
            <History fontSize="small" sx={{ mr: 1 }} />
            Ver historial
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => handleMenuAction(onDelete)}
            sx={{ color: 'error.main' }}
          >
            <DeleteOutline fontSize="small" sx={{ mr: 1 }} />
            Eliminar usuario
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
};

/**
 * Componente principal UsersTable
 *
 * Renderiza la tabla de usuarios con todas las funcionalidades de ordenamiento,
 * paginación y acciones. Se adapta automáticamente a mobile mostrando cards.
 *
 * @component
 * @example
 * ```jsx
 * <UsersTable
 *   users={users}
 *   onEdit={(user) => handleEdit(user)}
 *   onToggleStatus={(user) => handleToggleStatus(user)}
 *   onViewStats={(user) => handleViewStats(user)}
 *   onResetPassword={(user) => handleResetPassword(user)}
 *   onViewHistory={(user) => handleViewHistory(user)}
 *   onDelete={(user) => handleDelete(user)}
 *   orderBy="name"
 *   order="asc"
 *   onRequestSort={(property) => handleSort(property)}
 *   page={0}
 *   rowsPerPage={10}
 *   onPageChange={(event, newPage) => setPage(newPage)}
 *   onRowsPerPageChange={(event) => setRowsPerPage(event.target.value)}
 *   totalUsers={150}
 *   isLoading={false}
 * />
 * ```
 */
const UsersTable = ({
  users,
  onEdit,
  onToggleStatus,
  onViewStats,
  onResetPassword,
  onViewHistory,
  onDelete,
  orderBy,
  order,
  onRequestSort,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  totalUsers,
  isLoading,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  /**
   * Maneja el click en un header de columna para ordenar
   */
  const handleRequestSort = (property) => {
    onRequestSort(property);
  };

  /**
   * Renderiza el estado de loading con Skeletons
   */
  const renderLoadingState = () => {
    if (isMobile) {
      return (
        <Box>
          {[...Array(rowsPerPage)].map((_, index) => (
            <Card key={index} elevation={2} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={24} />
                    <Skeleton variant="text" width="80%" height={20} />
                  </Box>
                </Box>
                <Stack spacing={1}>
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="100%" height={20} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      );
    }

    return (
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              {TABLE_COLUMNS.map((column) => (
                <TableCell key={column.id} align={column.align}>
                  <Skeleton variant="text" width="80%" />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(rowsPerPage)].map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton variant="circular" width={40} height={40} />
                </TableCell>
                {[...Array(TABLE_COLUMNS.length - 1)].map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton variant="text" width="80%" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  /**
   * Renderiza el estado vacío
   */
  const renderEmptyState = () => (
    <Box
      sx={{
        textAlign: 'center',
        py: 8,
        px: 2,
      }}
    >
      <PersonOutline
        sx={{
          fontSize: 80,
          color: 'text.secondary',
          mb: 2,
        }}
      />
      <Typography variant="h6" gutterBottom>
        No hay usuarios registrados
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Cuando se registren usuarios, aparecerán aquí
      </Typography>
    </Box>
  );

  /**
   * Renderiza la vista mobile (cards)
   */
  const renderMobileView = () => (
    <Box>
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onViewStats={onViewStats}
          onResetPassword={onResetPassword}
          onViewHistory={onViewHistory}
          onDelete={onDelete}
        />
      ))}
    </Box>
  );

  /**
   * Renderiza la vista desktop (tabla)
   */
  const renderDesktopView = () => (
    <TableContainer component={Paper} elevation={0}>
      <Table>
        <TableHead>
          <TableRow>
            {TABLE_COLUMNS.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                sx={{ fontWeight: 'bold' }}
              >
                {column.sortable ? (
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={() => handleRequestSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
              onViewStats={onViewStats}
              onResetPassword={onResetPassword}
              onViewHistory={onViewHistory}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // ============================================================================
  // Renderizado Principal
  // ============================================================================

  return (
    <Box>
      {/* Tabla o Cards */}
      {isLoading ? (
        renderLoadingState()
      ) : users.length === 0 ? (
        renderEmptyState()
      ) : isMobile ? (
        renderMobileView()
      ) : (
        renderDesktopView()
      )}

      {/* Paginación */}
      {!isLoading && users.length > 0 && (
        <TablePagination
          component="div"
          count={totalUsers}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            mt: 2,
          }}
        />
      )}
    </Box>
  );
};

// ============================================================================
// PropTypes para Validación
// ============================================================================

UserTableRow.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    role: PropTypes.oneOf(['STUDENT', 'TEACHER', 'ADMIN']).isRequired,
    isActive: PropTypes.bool.isRequired,
    createdAt: PropTypes.string.isRequired,
    lastAccess: PropTypes.string,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onToggleStatus: PropTypes.func.isRequired,
  onViewStats: PropTypes.func.isRequired,
  onResetPassword: PropTypes.func.isRequired,
  onViewHistory: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

UserCard.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    role: PropTypes.oneOf(['STUDENT', 'TEACHER', 'ADMIN']).isRequired,
    isActive: PropTypes.bool.isRequired,
    createdAt: PropTypes.string.isRequired,
    lastAccess: PropTypes.string,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onToggleStatus: PropTypes.func.isRequired,
  onViewStats: PropTypes.func.isRequired,
  onResetPassword: PropTypes.func.isRequired,
  onViewHistory: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

UsersTable.propTypes = {
  /**
   * Array de usuarios a mostrar en la tabla
   */
  users: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired,
      role: PropTypes.oneOf(['STUDENT', 'TEACHER', 'ADMIN']).isRequired,
      isActive: PropTypes.bool.isRequired,
      createdAt: PropTypes.string.isRequired,
      lastAccess: PropTypes.string,
    })
  ).isRequired,

  /**
   * Callback llamado al editar un usuario
   */
  onEdit: PropTypes.func.isRequired,

  /**
   * Callback llamado al cambiar el estado activo/inactivo de un usuario
   */
  onToggleStatus: PropTypes.func.isRequired,

  /**
   * Callback llamado al ver las estadísticas de un usuario
   */
  onViewStats: PropTypes.func.isRequired,

  /**
   * Callback llamado al resetear la contraseña de un usuario
   */
  onResetPassword: PropTypes.func.isRequired,

  /**
   * Callback llamado al ver el historial de un usuario
   */
  onViewHistory: PropTypes.func.isRequired,

  /**
   * Callback llamado al eliminar un usuario
   */
  onDelete: PropTypes.func.isRequired,

  /**
   * Propiedad por la cual está ordenada la tabla
   */
  orderBy: PropTypes.string.isRequired,

  /**
   * Dirección del ordenamiento ('asc' o 'desc')
   */
  order: PropTypes.oneOf(['asc', 'desc']).isRequired,

  /**
   * Callback llamado al solicitar ordenar por una propiedad
   */
  onRequestSort: PropTypes.func.isRequired,

  /**
   * Página actual (comenzando desde 0)
   */
  page: PropTypes.number.isRequired,

  /**
   * Número de filas por página
   */
  rowsPerPage: PropTypes.number.isRequired,

  /**
   * Callback llamado al cambiar de página
   */
  onPageChange: PropTypes.func.isRequired,

  /**
   * Callback llamado al cambiar el número de filas por página
   */
  onRowsPerPageChange: PropTypes.func.isRequired,

  /**
   * Número total de usuarios (para paginación)
   */
  totalUsers: PropTypes.number.isRequired,

  /**
   * Indica si los datos están cargando
   */
  isLoading: PropTypes.bool,
};

UsersTable.defaultProps = {
  isLoading: false,
};

// ============================================================================
// Exportación
// ============================================================================

export default UsersTable;
