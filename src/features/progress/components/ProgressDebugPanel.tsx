import { useLearningProgress } from '@/features/progress/LearningProgressContext';
import { debug } from '@/shared/utils/debug';
import { getAuthToken } from '@/shared/services/authService';

// Get debug flag from environment
function isDebugEnabled(): boolean {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_DEBUG_PROGRESS === 'true';
  }
  return process.env.DEBUG_PROGRESS === 'true' || process.env.NEXT_PUBLIC_DEBUG_PROGRESS === 'true';
}

// Get API URL from environment
function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001/api';
}

export default function ProgressDebugPanel() {
  if (!isDebugEnabled()) return null;
  const { snapshot, isLoadingSnapshot, snapshotError, refetchSnapshot } = useLearningProgress();
  const token = getAuthToken() || '';
  const baseURL = getApiUrl();

  return (
    <div style={{fontSize:12, padding:12, border:'1px dashed #0aa', borderRadius:8, marginTop:12}}>
      <b>Debug Progreso</b>
      <div>baseURL: {baseURL}</div>
      <div>userId: {snapshot?.userId || 'none'}</div>
      <div>token: {token ? `${token.slice(0,4)}…${token.slice(-4)}` : 'none'}</div>
      <div>source: {snapshot?.source}</div>
      <div>completed/total: {snapshot?.overview?.completedLessons}/{snapshot?.overview?.totalLessons}</div>
      <div>modules: {snapshot?.overview?.modulesCompleted}/{snapshot?.overview?.totalModules}</div>
      <div>loading: {String(isLoadingSnapshot)} | error: {String(!!snapshotError)}</div>
      <button onClick={()=>refetchSnapshot()}>Revalidate</button>
      <button onClick={()=> (window as any).__VENTY_DEBUG?.debug.disable() } style={{marginLeft:8}}>Disable Logs</button>
    </div>
  );
}

