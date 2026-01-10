// Next.js Home Page - VentyLab
// This page redirects to dashboard, middleware handles auth protection
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard on home page load
    // If not authenticated, middleware will redirect to login first
    router.replace('/dashboard');
  }, [router]);

  return null; // This will not render anything as we redirect immediately
}
