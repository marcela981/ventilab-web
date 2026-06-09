// Barrel export for conexion sub-module
export * from './websocket/hooks/useVentilatorData';
export * from './websocket/hooks/useRemoteVentilator';
export * from './websocket/hooks/useVentilatorConnection';
export * from './websocket/hooks/useConexionVentilador';
export * from './websocket/registro/ChartRegistry';
export {
  ConexionVentiladorProvider,
  useConexionVentiladorContext,
} from './contexto/ConexionVentiladorContext';
export { ConexionVentiladorTab } from './componentes/ConexionVentiladorTab';
