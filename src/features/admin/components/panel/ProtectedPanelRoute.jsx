/**
 * ProtectedPanelRoute - Obsoleto
 * La protección de rutas del panel ahora se maneja con withTeacherAuth / withAdminAuth
 * en cada página de pages/panel/*.
 * Este archivo se mantiene por compatibilidad pero ya no es usado.
 */
export default function ProtectedPanelRoute({ children }) {
  return children ?? null;
}
