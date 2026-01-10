/**
 * =============================================================================
 * Common Components Index
 * =============================================================================
 * Central export point for all common/shared components
 * =============================================================================
 */

export { default as RoleGuard } from './RoleGuard';
export { RoleGuard as RoleGuardComponent } from './RoleGuard';

export { default as LevelBadge } from './LevelBadge';
export { LevelBadge as LevelBadgeComponent } from './LevelBadge';

export { default as SearchBar } from './SearchBar';
export { SearchBar as SearchBarComponent } from './SearchBar';

// Export examples for development/documentation
export { default as RoleGuardExamples } from './RoleGuardExamples';
export {
  Example1_BasicRoleAccess,
  Example2_PermissionAccess,
  Example3_MultiplePermissionsOR,
  Example4_MultiplePermissionsAND,
  Example5_CombinedAuthorization,
  Example6_WithFallback,
  Example7_WithError,
  Example8_ConditionalNavigation,
  Example9_NestedGuards,
  Example10_ConditionalFormFields,
  Example11_ModuleCard,
} from './RoleGuardExamples';

export { default as SearchBarExamples } from './SearchBar.examples';
export {
  BasicSearchBar,
  AppBarSearchBar,
  SearchBarWithCustomHandler,
  CenteredSearchBar,
  SidebarSearchBar,
  SearchBarNoShortcut,
  MultipleSearchBars,
  DashboardSearchBar,
} from './SearchBar.examples';
