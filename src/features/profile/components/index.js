/**
 * =============================================================================
 * Profile Components - VentyLab
 * =============================================================================
 * Centralized export for all profile-related components
 *
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 * =============================================================================
 */

import ProfileInfo from './ProfileInfo';
import EditProfileForm from './EditProfileForm';
import ChangePasswordForm from './ChangePasswordForm';

// Named exports
export { ProfileInfo } from './ProfileInfo';
export { EditProfileForm } from './EditProfileForm';
export { ChangePasswordForm } from './ChangePasswordForm';

// Default export
const profileComponents = {
  ProfileInfo,
  EditProfileForm,
  ChangePasswordForm,
};

export default profileComponents;

