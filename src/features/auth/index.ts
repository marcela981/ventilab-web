/*
* Funcionalidad: Auth feature public API
* Descripción: Public surface of the auth feature for pages and other features: the LoginPage and RegisterPage components used by the thin routes pages/auth/login and pages/auth/register. Logout, guards and the session itself live in @shared/session. v1.1 (B3.4, D4): exports RegisterPage. v1.2 (B3.7): exports AccessDeniedPage and ForgotPasswordPage (ported from the legacy shell).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { AccessDeniedPage } from "./application/pages/access-denied.page";
export { ForgotPasswordPage } from "./application/pages/forgot-password.page";
export { LoginPage } from "./application/pages/login.page";
export { RegisterPage } from "./application/pages/register.page";
