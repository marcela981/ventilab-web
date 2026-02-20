import React from 'react';
import Head from 'next/head';
import { LearningProgressProvider } from '@/features/progress/LearningProgressContext';
import FlashcardDashboardPage from '@/features/teaching/FlashcardDashboardPage';

const FlashcardsPage = () => {
  return (
    <>
      <Head>
        <title>Dashboard de Flashcards - Ventilab</title>
        <meta name="description" content="Sistema de repetición espaciada para el aprendizaje de ventilación mecánica" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <LearningProgressProvider>
        <FlashcardDashboardPage />
      </LearningProgressProvider>
    </>
  );
};

export default FlashcardsPage;

