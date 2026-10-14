/*
* Funcionalidad: Profile route
* Descripción: Thin route for /profile: composes the student layout (RequireAuth + AppShell; any authenticated role) with the ProfilePage of the profile feature, which reads and edits the own profile against the backend (GET/PATCH /api/users/me). Replaces the legacy profile page (T10). Depends on @features/profile and @shared/layouts/student-layout.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { ProfilePage } from "@features/profile";
import type { NextPageWithLayout } from "@shared/layouts/get-layout";
// Direct module import: the layouts index would pull every layout into this chunk.
import { withStudentLayout } from "@shared/layouts/student-layout";

const ProfileRoute: NextPageWithLayout = () => <ProfilePage />;

ProfileRoute.getLayout = withStudentLayout;

export default ProfileRoute;
