// Next.js Home Page - VentyLab
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard on home page load
    router.replace('/dashboard');
  }, [router]);

  return null; // This will not render anything as we redirect immediately
}

