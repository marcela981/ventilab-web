// Redirección permanente: /dashboard → /simulador
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/simulador');
  }, [router]);
  return null;
}
