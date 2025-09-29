import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  LinearProgress,
  Breadcrumbs,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Paper,
  Drawer,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogContent,
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import {
  Home,
  School,
  CheckCircle,
  RadioButtonUnchecked,
  ExpandMore,
  Menu,
  Close,
  NavigateBefore,
  NavigateNext,
  AccessTime,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  ZoomIn,
  Notes,
  Lightbulb,
  Functions,
  Link as LinkIcon,
  Quiz,
  Image as ImageIcon
} from '@mui/icons-material';

const LessonViewer = ({ lessonData, onClose, onNavigateLesson, onMarkComplete }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  // Estados del componente
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [tabValue, setTabValue] = useState(0);

  // Datos de ejemplo si no se proporciona lessonData
  const defaultLessonData = {
    id: 'respiratory-anatomy',
    moduleId: 'fundamentals',
    moduleName: 'Fundamentos Fisiológicos',
    title: 'Anatomía del Sistema Respiratorio',
    estimatedTime: 30,
    currentProgress: 25,
    sections: [
      {
        id: 'intro',
        title: 'Introducción',
        type: 'text',
        content: {
          text: 'El sistema respiratorio es esencial para mantener la vida, proporcionando oxígeno al organismo y eliminando dióxido de carbono. Su comprensión es fundamental para entender los principios de la ventilación mecánica.',
          highlights: [
            'Función principal: intercambio gaseoso',
            'Estructura dividida en vías aéreas superiores e inferiores',
            'Superficie alveolar total: aproximadamente 70 m²'
          ]
        }
      },
      {
        id: 'upper-airways',
        title: 'Vías Aéreas Superiores',
        type: 'mixed',
        content: {
          text: 'Las vías aéreas superiores comprenden las estructuras desde la nariz hasta la laringe, siendo responsables de filtrar, calentar y humidificar el aire inspirado.',
          image: '/images/upper-airways.png',
          imageCaption: 'Anatomía de vías aéreas superiores',
          list: [
            'Nariz y cavidad nasal: filtración inicial',
            'Faringe: vía común respiratoria y digestiva',
            'Laringe: contiene las cuerdas vocales',
            'Epiglotis: previene aspiración'
          ]
        }
      },
      {
        id: 'lung-anatomy',
        title: 'Anatomía Pulmonar',
        type: 'interactive',
        content: {
          description: 'Explora la estructura pulmonar detallada:',
          components: ['Lóbulos', 'Segmentos', 'Alvéolos', 'Pleura'],
          tableData: [
            { structure: 'Pulmón Derecho', lobules: '3', segments: '10' },
            { structure: 'Pulmón Izquierdo', lobules: '2', segments: '8' },
            { structure: 'Total Alvéolos', lobules: '-', segments: '~300 millones' }
          ],
          quiz: {
            question: '¿Cuántos lóbulos tiene el pulmón derecho?',
            options: ['2', '3', '4', '5'],
            correct: 1,
            explanation: 'El pulmón derecho tiene 3 lóbulos: superior, medio e inferior.'
          }
        }
      }
    ],
    keyPoints: [
      'El pulmón derecho tiene 3 lóbulos, el izquierdo 2',
      'La superficie alveolar total es de aproximadamente 70m²',
      'El intercambio gaseoso ocurre exclusivamente en los alvéolos',
      'Las vías aéreas se dividen hasta 23 generaciones'
    ],
    formulas: [
      { name: 'Compliance Pulmonar', formula: 'C = ΔV/ΔP', unit: 'mL/cmH₂O' },
      { name: 'Resistencia de Vías Aéreas', formula: 'R = ΔP/Flow', unit: 'cmH₂O/L/s' },
      { name: 'Capacidad Pulmonar Total', formula: 'CPT = CV + VR', unit: 'mL' }
    ],
    references: [
      { title: 'West Fisiología Respiratoria - 10ª Edición', url: '#', type: 'book' },
      { title: 'Guías ARDS Network', url: '#', type: 'guideline' },
      { title: 'Anatomía Respiratoria - Atlas Interactivo', url: '#', type: 'interactive' }
    ]
  };

  const lesson = lessonData || defaultLessonData;
  const currentSection = lesson.sections[currentSectionIndex];

  // Efectos
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Handlers
  const handleSectionClick = (index) => {
    setCurrentSectionIndex(index);
    if (isMobile) setSidebarOpen(false);
  };

  const handleMarkSectionComplete = (sectionIndex) => {
    const newCompleted = new Set(completedSections);
    if (newCompleted.has(sectionIndex)) {
      newCompleted.delete(sectionIndex);
    } else {
      newCompleted.add(sectionIndex);
    }
    setCompletedSections(newCompleted);
  };

  const handleImageClick = (imageSrc) => {
    setSelectedImage(imageSrc);
    setImageDialogOpen(true);
  };

  const handleQuizAnswer = (sectionId, answer) => {
    setQuizAnswers(prev => ({
      ...prev,
      [sectionId]: answer
    }));
  };

  const handleNextSection = () => {
    if (currentSectionIndex < lesson.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  };

  const handlePrevSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  // Renderizadores de contenido
  const renderTextContent = (content) => (
    <Box>
      <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, mb: 3 }}>
        {content.text}
      </Typography>
      
      {content.highlights && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
            Puntos Destacados:
          </Typography>
          <List dense>
            {content.highlights.map((highlight, index) => (
              <ListItem key={index} sx={{ py: 0 }}>
                <ListItemIcon sx={{ minWidth: 20 }}>
                  <Typography variant="body2">•</Typography>
                </ListItemIcon>
                <ListItemText 
                  primary={highlight}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}
    </Box>
  );

  const renderMixedContent = (content) => (
    <Box>
      <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, mb: 3 }}>
        {content.text}
      </Typography>

      {content.image && (
        <Card sx={{ mb: 3, cursor: 'pointer' }} onClick={() => handleImageClick(content.image)}>
          <Box
            component="img"
            src={content.image}
            alt={content.imageCaption}
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: 400,
              objectFit: 'contain',
              '&:hover': { opacity: 0.9 }
            }}
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==';
            }}
          />
          <CardContent>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
              <ZoomIn sx={{ mr: 1, fontSize: 16 }} />
              {content.imageCaption} (Click para ampliar)
            </Typography>
          </CardContent>
        </Card>
      )}

      {content.list && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <List>
              {content.list.map((item, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckCircle color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={item} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  const renderInteractiveContent = (content) => (
    <Box>
      <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, mb: 3 }}>
        {content.description}
      </Typography>

      {content.tableData && (
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Estructura</strong></TableCell>
                <TableCell><strong>Lóbulos</strong></TableCell>
                <TableCell><strong>Segmentos</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {content.tableData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.structure}</TableCell>
                  <TableCell>{row.lobules}</TableCell>
                  <TableCell>{row.segments}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {content.quiz && (
        <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Quiz sx={{ mr: 1 }} />
            Quiz Rápido
          </Typography>
          <Typography variant="body1" gutterBottom>
            {content.quiz.question}
          </Typography>
          <RadioGroup
            value={quizAnswers[currentSection.id] || ''}
            onChange={(e) => handleQuizAnswer(currentSection.id, e.target.value)}
          >
            {content.quiz.options.map((option, index) => (
              <FormControlLabel
                key={index}
                value={index.toString()}
                control={<Radio />}
                label={option}
              />
            ))}
          </RadioGroup>
          {quizAnswers[currentSection.id] !== undefined && (
            <Alert 
              severity={quizAnswers[currentSection.id] == content.quiz.correct ? 'success' : 'error'}
              sx={{ mt: 2 }}
            >
              {quizAnswers[currentSection.id] == content.quiz.correct 
                ? '¡Correcto! ' + content.quiz.explanation
                : 'Incorrecto. ' + content.quiz.explanation
              }
            </Alert>
          )}
        </Card>
      )}
    </Box>
  );

  const renderContent = () => {
    switch (currentSection.type) {
      case 'text':
        return renderTextContent(currentSection.content);
      case 'mixed':
        return renderMixedContent(currentSection.content);
      case 'interactive':
        return renderInteractiveContent(currentSection.content);
      default:
        return <Typography>Tipo de contenido no soportado</Typography>;
    }
  };

  // Sidebar de navegación
  const sidebarContent = (
    <Box sx={{ width: isMobile ? 280 : '100%', p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ px: 1, color: theme.palette.primary.main }}>
        Contenido de la Lección
      </Typography>
      <List>
        {lesson.sections.map((section, index) => (
          <ListItemButton
            key={section.id}
            selected={index === currentSectionIndex}
            onClick={() => handleSectionClick(index)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.main + '15',
                '&:hover': {
                  backgroundColor: theme.palette.primary.main + '25',
                }
              }
            }}
          >
            <ListItemIcon>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkSectionComplete(index);
                }}
              >
                {completedSections.has(index) ? (
                  <CheckCircle color="success" />
                ) : (
                  <RadioButtonUnchecked color="action" />
                )}
              </IconButton>
            </ListItemIcon>
            <ListItemText 
              primary={section.title}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: index === currentSectionIndex ? 'bold' : 'normal'
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header de la Lección */}
      <Paper elevation={2} sx={{ p: 2, zIndex: 1200 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs aria-label="breadcrumb">
              <Link underline="hover" color="inherit" href="/" sx={{ display: 'flex', alignItems: 'center' }}>
                <Home sx={{ mr: 0.5 }} fontSize="inherit" />
                Inicio
              </Link>
              <Link underline="hover" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}>
                <School sx={{ mr: 0.5 }} fontSize="inherit" />
                {lesson.moduleName}
              </Link>
              <Typography color="text.primary">{lesson.title}</Typography>
            </Breadcrumbs>

            {/* Botón cerrar */}
            <IconButton onClick={onClose} size="large">
              <Close />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            {/* Título y tiempo */}
            <Box>
              <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom>
                {lesson.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  icon={<AccessTime />}
                  label={`${lesson.estimatedTime} min`}
                  size="small"
                  variant="outlined"
                />
                <Typography variant="body2" color="text.secondary">
                  Sección {currentSectionIndex + 1} de {lesson.sections.length}
                </Typography>
              </Box>
            </Box>

            {/* Botón sidebar mobile */}
            {isMobile && (
              <IconButton onClick={() => setSidebarOpen(true)}>
                <Menu />
              </IconButton>
            )}
          </Box>

          {/* Progreso de la lección */}
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progreso de la Lección
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round((completedSections.size / lesson.sections.length) * 100)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(completedSections.size / lesson.sections.length) * 100}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        </Container>
      </Paper>

      {/* Contenido Principal */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar Desktop */}
        {!isMobile && (
          <Paper 
            elevation={1} 
            sx={{ 
              width: isTablet ? '25%' : '20%', 
              borderRadius: 0, 
              borderRight: `1px solid ${theme.palette.divider}`,
              overflow: 'auto'
            }}
          >
            {sidebarContent}
          </Paper>
        )}

        {/* Sidebar Mobile */}
        <Drawer
          anchor="left"
          open={sidebarOpen && isMobile}
          onClose={() => setSidebarOpen(false)}
        >
          {sidebarContent}
        </Drawer>

        {/* Área de Contenido Central */}
        <Box 
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            display: 'flex'
          }}
        >
          <Container maxWidth="lg" sx={{ py: 3, flex: 1 }}>
            <Grid container spacing={3}>
              {/* Contenido Principal */}
              <Grid item xs={12} lg={8}>
                <Paper elevation={1} sx={{ p: 3, minHeight: 400 }}>
                  <Typography variant="h5" gutterBottom sx={{ color: theme.palette.primary.main }}>
                    {currentSection.title}
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  {renderContent()}
                </Paper>
              </Grid>

              {/* Panel de Recursos */}
              <Grid item xs={12} lg={4}>
                <Box sx={{ position: 'sticky', top: 16 }}>
                  {/* Puntos Clave */}
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <Lightbulb sx={{ mr: 1, color: theme.palette.warning.main }} />
                        Puntos Clave
                      </Typography>
                      <List dense>
                        {lesson.keyPoints.map((point, index) => (
                          <ListItem key={index} sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 20 }}>
                              <Typography variant="body2" color="primary">•</Typography>
                            </ListItemIcon>
                            <ListItemText 
                              primary={point}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>

                  {/* Fórmulas */}
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <Functions sx={{ mr: 1, color: theme.palette.info.main }} />
                        Fórmulas
                      </Typography>
                      {lesson.formulas.map((formula, index) => (
                        <Box key={index} sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="primary">
                            {formula.name}
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', backgroundColor: theme.palette.grey[100], p: 1, borderRadius: 1 }}>
                            {formula.formula}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Unidad: {formula.unit}
                          </Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Referencias */}
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <LinkIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                        Referencias
                      </Typography>
                      {lesson.references.map((ref, index) => (
                        <Box key={index} sx={{ mb: 1 }}>
                          <Link 
                            href={ref.url} 
                            target="_blank" 
                            underline="hover"
                            sx={{ display: 'block', fontSize: '0.875rem' }}
                          >
                            {ref.title}
                          </Link>
                          <Chip 
                            label={ref.type} 
                            size="small" 
                            variant="outlined" 
                            sx={{ mt: 0.5, fontSize: '0.75rem', height: 20 }}
                          />
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </Box>

      {/* Footer de Navegación */}
      <Paper elevation={3} sx={{ p: 2, mt: 'auto' }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            {/* Navegación anterior */}
            <Button
              startIcon={<NavigateBefore />}
              disabled={currentSectionIndex === 0}
              onClick={handlePrevSection}
              variant="outlined"
            >
              Sección Anterior
            </Button>

            {/* Indicador central */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Sección {currentSectionIndex + 1} de {lesson.sections.length}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleMarkSectionComplete(currentSectionIndex)}
                sx={{ mt: 1 }}
              >
                {completedSections.has(currentSectionIndex) ? 'Marcar Incompleta' : 'Marcar Completada'}
              </Button>
            </Box>

            {/* Navegación siguiente */}
            <Button
              endIcon={<NavigateNext />}
              disabled={currentSectionIndex === lesson.sections.length - 1}
              onClick={handleNextSection}
              variant="contained"
            >
              Siguiente Sección
            </Button>
          </Box>
        </Container>
      </Paper>

      {/* Dialog para imágenes */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          {selectedImage && (
            <Box
              component="img"
              src={selectedImage}
              alt="Imagen ampliada"
              sx={{ width: '100%', height: 'auto' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LessonViewer;
