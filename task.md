# Ejecución del Proyecto: Dashboard de Profesor y Administrador

## Paso 1: Actualización de Esquema (Completado)
- [x] Agregar modelo `Group` (incluyendo jerarquía).
- [x] Agregar modelo `GroupMember` (incluyendo roles).
- [x] Agregar campo `groupId` a `VentilatorReservation`.
- [x] Sincronizar Prisma DB schema (`ventylab-server` y `ventilab-web`) e impactar la base de datos local.

## Paso 2: Desarrollo del Backend y API Routes
- [x] Implementar rutas CRUD para Grupos (crear, editar, borrar).
- [x] Implementar rutas para unir subgrupos y manejar usuarios de `GroupMember`.
- [x] Ajustar WebSockets (Server) para interceptar trama si hay reservas.
- [x] Implementar API Rest de Reserva ("first come, first served").

## Paso 3: Desarrollo Frontend (Dashboard Profesor)
- [ ] Crear la interfaz y Panel de Grupos.
- [ ] Crear el UI de Reserva del Simulador con botón "Reservar" y validaciones de estado en vivo.
- [ ] Implementar UI de listado y detalle de estudiantes y métricas.
- [ ] Integrar el CMS dinámico de lecciones (modo edición de acordeón) que soporta renderizado de URLs multimedia y puntajes manuales.

## Paso 4: Desarrollo Frontend (Dashboard Admin)
- [ ] Incorporar tabla de listado de profesores e información y capacidad para dar privilegios `INSTRUCTOR` a estudiantes corrientes.
