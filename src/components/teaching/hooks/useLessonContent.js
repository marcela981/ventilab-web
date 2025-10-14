import { useState, useEffect, useCallback } from 'react';

/**
 * useLessonContent - Hook personalizado para manejo de contenido de lección
 *
 * Gestiona el estado del contenido de la lección, incluyendo navegación
 * entre secciones, tracking de secciones completadas, y respuestas de quiz.
 *
 * @param {Object} lesson - Datos de la lección actual
 * @param {boolean} isMobile - Indica si está en vista móvil
 * @returns {Object} Objeto con estado y funciones del contenido
 */
const useLessonContent = (lesson, isMobile = false) => {
  // Estados para el contenido
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [expandedModules, setExpandedModules] = useState(new Set());

  // Tiempo de inicio para tracking
  const [timeStarted] = useState(Date.now());
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);

  // Obtener sección actual
  const currentSection = lesson?.sections?.[currentSectionIndex];

  // Efecto para cerrar sidebar en mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Efecto para calcular tiempo restante
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const timeElapsed = (Date.now() - timeStarted) / 1000 / 60; // en minutos
      const totalEstimatedTime = lesson?.estimatedTime || 30;
      const remaining = Math.max(0, totalEstimatedTime - timeElapsed);
      setEstimatedTimeRemaining(remaining);
    };

    const interval = setInterval(calculateTimeRemaining, 60000); // actualizar cada minuto
    calculateTimeRemaining(); // calcular inmediatamente

    return () => clearInterval(interval);
  }, [timeStarted, lesson?.estimatedTime]);

  // Handlers de navegación de secciones
  const handleSectionClick = useCallback((index) => {
    setCurrentSectionIndex(index);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const handleNextSection = useCallback(() => {
    if (lesson && currentSectionIndex < lesson.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  }, [currentSectionIndex, lesson]);

  const handlePrevSection = useCallback(() => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  }, [currentSectionIndex]);

  // Handlers de estado de secciones
  const handleMarkSectionComplete = useCallback((sectionIndex) => {
    const newCompleted = new Set(completedSections);
    if (newCompleted.has(sectionIndex)) {
      newCompleted.delete(sectionIndex);
    } else {
      newCompleted.add(sectionIndex);
    }
    setCompletedSections(newCompleted);
  }, [completedSections]);

  // Handlers de módulos expandidos
  const handleToggleModuleExpansion = useCallback((moduleId) => {
    setExpandedModules(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(moduleId)) {
        newExpanded.delete(moduleId);
      } else {
        newExpanded.add(moduleId);
      }
      return newExpanded;
    });
  }, []);

  // Handlers de imágenes
  const handleImageClick = useCallback((imageSrc) => {
    setSelectedImage(imageSrc);
    setImageDialogOpen(true);
  }, []);

  const handleCloseImageDialog = useCallback(() => {
    setImageDialogOpen(false);
  }, []);

  // Handlers de quiz
  const handleQuizAnswer = useCallback((sectionId, answer) => {
    setQuizAnswers(prev => ({
      ...prev,
      [sectionId]: answer
    }));
  }, []);

  // Handlers de sidebar
  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Expander módulo actual automáticamente
  const expandCurrentModule = useCallback((moduleId) => {
    if (moduleId) {
      setExpandedModules(prev => new Set([...prev, moduleId]));
    }
  }, []);

  return {
    // Estado
    currentSectionIndex,
    completedSections,
    sidebarOpen,
    imageDialogOpen,
    selectedImage,
    quizAnswers,
    expandedModules,
    estimatedTimeRemaining,
    currentSection,

    // Handlers
    handleSectionClick,
    handleNextSection,
    handlePrevSection,
    handleMarkSectionComplete,
    handleToggleModuleExpansion,
    handleImageClick,
    handleCloseImageDialog,
    handleQuizAnswer,
    handleToggleSidebar,
    expandCurrentModule,

    // Setters directos (para casos especiales)
    setSidebarOpen,
    setExpandedModules
  };
};

export default useLessonContent;
