/**
 * =============================================================================
 * RoleGuard Usage Examples
 * =============================================================================
 * Demonstration component showing various RoleGuard use cases
 * Use this as a reference for implementing authorization in your components
 * =============================================================================
 */

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  TextField,
  FormControlLabel,
  Checkbox,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import RoleGuard from './RoleGuard';

/**
 * Example 1: Basic Role-Based Access
 */
export function Example1_BasicRoleAccess() {
  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Example 1: Basic Role-Based Access
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Only teachers and admins can see the "Create Module" button
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<ViewIcon />}>
            Ver Módulos (Todos)
          </Button>

          <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
            <Button variant="contained" startIcon={<AddIcon />}>
              Crear Módulo (Solo Teachers/Admins)
            </Button>
          </RoleGuard>
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * Example 2: Permission-Based Access
 */
export function Example2_PermissionAccess() {
  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Example 2: Permission-Based Access
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Buttons shown based on specific permissions
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <RoleGuard requiredPermissions={['create_modules']}>
            <Button startIcon={<AddIcon />}>Crear</Button>
          </RoleGuard>

          <RoleGuard requiredPermissions={['edit_modules']}>
            <Button startIcon={<EditIcon />}>Editar</Button>
          </RoleGuard>

          <RoleGuard requiredPermissions={['delete_modules']}>
            <Button color="error" startIcon={<DeleteIcon />}>
              Eliminar
            </Button>
          </RoleGuard>
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * Example 3: Multiple Permissions with OR Logic
 */
export function Example3_MultiplePermissionsOR() {
  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Example 3: Multiple Permissions (OR Logic)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          User needs AT LEAST ONE of the permissions
        </Typography>

        <RoleGuard
          requiredPermissions={['view_all_progress', 'view_own_progress']}
          requireAll={false}
        >
          <Alert severity="success">
            ✓ You can view progress (you have at least one permission)
          </Alert>
        </RoleGuard>
      </CardContent>
    </Card>
  );
}

/**
 * Example 4: Multiple Permissions with AND Logic
 */
export function Example4_MultiplePermissionsAND() {
  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Example 4: Multiple Permissions (AND Logic)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          User needs ALL specified permissions
        </Typography>

        <RoleGuard
          requiredPermissions={['create_modules', 'edit_modules', 'delete_modules']}
          requireAll={true}
        >
          <Alert severity="info">
            ✓ Full Module Management Access (you have all permissions)
          </Alert>
        </RoleGuard>
      </CardContent>
    </Card>
  );
}

/**
 * Example 5: Combined Role and Permission
 */
export function Example5_CombinedAuthorization() {
  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Example 5: Combined Role and Permission
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          User must be Teacher/Admin AND have delete permission
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined">Ver Módulo</Button>

          <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
            <Button variant="outlined" startIcon={<EditIcon />}>
              Editar (Teacher/Admin)
            </Button>
          </RoleGuard>

          <RoleGuard
            allowedRoles={['TEACHER', 'ADMIN']}
            requiredPermissions={['delete_modules']}
          >
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
            >
              Eliminar (Teacher/Admin + Permission)
            </Button>
          </RoleGuard>
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * Example 6: With Fallback Content
 */
export function Example6_WithFallback() {
  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Example 6: With Fallback Content
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Shows alternative content when unauthorized
        </Typography>

        <RoleGuard
          allowedRoles={['ADMIN']}
          fallback={
            <Alert severity="info">
              Esta sección está disponible solo para administradores.
              <br />
              Contacta a un administrador para solicitar acceso.
            </Alert>
          }
        >
          <Alert severity="success">
            ✓ Panel de Administración (solo visible para admins)
          </Alert>
        </RoleGuard>
      </CardContent>
    </Card>
  );
}

/**
 * Example 7: With Error Display
 */
export function Example7_WithError() {
  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Example 7: With Error Display
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Shows detailed error message when unauthorized
        </Typography>

        <RoleGuard
          allowedRoles={['TEACHER', 'ADMIN']}
          requiredPermissions={['manage_users']}
          showError={true}
        >
          <Alert severity="success">
            ✓ User Management Panel (Teacher/Admin with manage_users permission)
          </Alert>
        </RoleGuard>
      </CardContent>
    </Card>
  );
}

/**
 * Example 8: Conditional Navigation Menu
 */
export function Example8_ConditionalNavigation() {
  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Example 8: Conditional Navigation Menu
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Different menu items based on user role
        </Typography>

        <List>
          <ListItem button>
            <ListItemText primary="🏠 Inicio" secondary="Available to all" />
          </ListItem>

          <Divider />

          <RoleGuard allowedRoles={['STUDENT']}>
            <ListItem button>
              <ListItemText
                primary="📚 Mis Lecciones"
                secondary="Student only"
              />
            </ListItem>
          </RoleGuard>

          <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
            <ListItem button>
              <ListItemText
                primary="📝 Gestionar Contenido"
                secondary="Teacher/Admin"
              />
            </ListItem>
          </RoleGuard>

          <RoleGuard allowedRoles={['ADMIN']}>
            <ListItem button>
              <ListItemText
                primary="⚙️ Administración"
                secondary="Admin only"
              />
            </ListItem>
          </RoleGuard>
        </List>
      </CardContent>
    </Card>
  );
}

/**
 * Example 9: Nested Guards
 */
export function Example9_NestedGuards() {
  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Example 9: Nested Guards for Complex Logic
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Multiple levels of authorization
        </Typography>

        <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Panel de Gestión de Módulos (Teacher/Admin)
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              <RoleGuard requiredPermissions={['create_modules']}>
                <Button size="small" startIcon={<AddIcon />}>
                  Crear
                </Button>
              </RoleGuard>

              <RoleGuard requiredPermissions={['edit_modules']}>
                <Button size="small" startIcon={<EditIcon />}>
                  Editar
                </Button>
              </RoleGuard>

              <RoleGuard
                allowedRoles={['ADMIN']}
                requiredPermissions={['delete_modules']}
              >
                <Button size="small" color="error" startIcon={<DeleteIcon />}>
                  Eliminar (Admin only)
                </Button>
              </RoleGuard>
            </Box>
          </Box>
        </RoleGuard>
      </CardContent>
    </Card>
  );
}

/**
 * Example 10: Conditional Form Fields
 */
export function Example10_ConditionalFormFields() {
  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Example 10: Conditional Form Fields
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Show different form fields based on permissions
        </Typography>

        <Box component="form" sx={{ '& > *': { mb: 2 } }}>
          <TextField
            label="Título del Módulo"
            fullWidth
            size="small"
            helperText="Available to all"
          />

          <TextField
            label="Descripción"
            fullWidth
            multiline
            rows={2}
            size="small"
            helperText="Available to all"
          />

          <RoleGuard requiredPermissions={['generate_ai_content']}>
            <FormControlLabel
              control={<Checkbox />}
              label="Generar contenido con IA (requires generate_ai_content permission)"
            />
          </RoleGuard>

          <RoleGuard allowedRoles={['ADMIN']}>
            <FormControlLabel
              control={<Switch />}
              label="Publicar inmediatamente (Admin only)"
            />
          </RoleGuard>

          <Button variant="contained" type="button">
            Guardar
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * Example 11: Module Card with Conditional Actions
 */
export function Example11_ModuleCard({ module = { title: 'Example Module', description: 'This is an example module' } }) {
  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Typography variant="h6">{module.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {module.description}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small">Ver Detalles</Button>

        <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
          <Button size="small" startIcon={<EditIcon />}>
            Editar
          </Button>
        </RoleGuard>

        <RoleGuard
          allowedRoles={['ADMIN']}
          requiredPermissions={['delete_any_module']}
        >
          <IconButton size="small" color="error">
            <DeleteIcon />
          </IconButton>
        </RoleGuard>
      </CardActions>
    </Card>
  );
}

/**
 * Main Demo Component - Shows All Examples
 */
export default function RoleGuardExamples() {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        RoleGuard Component Examples
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Interactive demonstrations of RoleGuard usage. The visibility of elements
        changes based on your current user role and permissions.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Note:</strong> Log in with different roles (STUDENT, TEACHER, ADMIN)
        to see how the components adapt to authorization rules.
      </Alert>

      <Example1_BasicRoleAccess />
      <Example2_PermissionAccess />
      <Example3_MultiplePermissionsOR />
      <Example4_MultiplePermissionsAND />
      <Example5_CombinedAuthorization />
      <Example6_WithFallback />
      <Example7_WithError />
      <Example8_ConditionalNavigation />
      <Example9_NestedGuards />
      <Example10_ConditionalFormFields />
      <Example11_ModuleCard />
    </Box>
  );
}
