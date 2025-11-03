/**
 * =============================================================================
 * Profile Components - VentyLab
 * =============================================================================
 * Centralized export for all profile-related components
 * =============================================================================
 */

import ProfileInfo from './ProfileInfo';
import EditProfileForm from './EditProfileForm';
import ChangePasswordForm from './ChangePasswordForm';
import UserStatsPanel from './UserStatsPanel';

// Named exports
export { ProfileInfo } from './ProfileInfo';
export { EditProfileForm } from './EditProfileForm';
export { ChangePasswordForm } from './ChangePasswordForm';
export { UserStatsPanel } from './UserStatsPanel';

// Default export
export default {
  ProfileInfo,
  EditProfileForm,
  ChangePasswordForm,
  UserStatsPanel,
};

