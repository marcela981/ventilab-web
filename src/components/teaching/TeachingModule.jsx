import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  LinearProgress,
  Breadcrumbs,
  Link,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Biotech,
  Settings,
  MonitorHeart,
  Home,
  School,
  CheckCircle,
  RadioButtonUnchecked,
  PlayArrow,
  Refresh
} from '@mui/icons-material';

const TeachingModule = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Mock data para progreso (hardcodeado por ahora)
  const [moduleProgress] = useState({
    overall: 0,
    sections: {
      fundamentals: 0,
      principles: 0,
      clinical: 0
    }
  });

  // Datos estructurados de las secciones
  const learningSections = [
    {
      id: 'fundamentals',
      title: 'Fundamentos Fisiológicos y Respiratorios',
      description: 'Comprende la base anatómica y fisiológica del sistema respiratorio para entender los principios de la ventilación mecánica.',
      icon: <Biotech sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      progress: moduleProgress.sections.fundamentals,
      topics: [
        'Anatomía del sistema respiratorio',
        'Mecánica respiratoria (presión, volumen, flujo)',
        'Intercambio gaseoso',
        'Gasometría arterial'
      ],
      available: true,
      color: theme.palette.primary.main
    },
    {
      id: 'principles',
      title: 'Principios de Ventilación Mecánica',
      description: 'Aprende las modalidades ventilatorias, parámetros básicos y sistemas de monitorización esenciales.',
      icon: <Settings sx={{ fontSize: 40, color: theme.palette.secondary.main }} />,
      progress: moduleProgress.sections.principles,
      topics: [
        'Modalidades ventilatorias (VCV, PCV, SIMV, PSV)',
        'Parámetros básicos (Vt, f, PEEP, FiO₂)',
        'Monitorización y alarmas'
      ],
      available: false, // Próximamente
      color: theme.palette.secondary.main
    },
    {
      id: 'clinical',
      title: 'Configuración y Manejo Clínico',
      description: 'Domina el ajuste inicial del ventilador y las estrategias específicas para diferentes patologías.',
      icon: <MonitorHeart sx={{ fontSize: 40, color: theme.palette.success.main }} />,
      progress: moduleProgress.sections.clinical,
      topics: [
        'Ajuste inicial del ventilador',
        'Configuración por patologías específicas',
        'Estrategias de protección pulmonar'
      ],
      available: false, // Próximamente
      color: theme.palette.success.main
    }
  ];

  const handleSectionClick = (sectionId) => {
    const section = learningSections.find(s => s.id === sectionId);
    if (section.available) {
      // Aquí iría la navegación a la lección específica
      console.log(`Navegando a la sección: ${sectionId}`);
    }
  };

  const getButtonText = (section) => {
    if (!section.available) return 'Próximamente';
    return section.progress > 0 ? 'Continuar' : 'Comenzar';
  };

  const getButtonIcon = (section) => {
    if (!section.available) return null;
    return section.progress > 0 ? <Refresh /> : <PlayArrow />;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Section */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mb: 4, 
          background: `linear-gradient(135deg, ${theme.palette.primary.main}10, ${theme.palette.secondary.main}10)`
        }}
      >
        {/* Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link 
            underline="hover" 
            color="inherit" 
            href="/"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <Home sx={{ mr: 0.5 }} fontSize="inherit" />
            Inicio
          </Link>
          <Typography 
            color="text.primary"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <School sx={{ mr: 0.5 }} fontSize="inherit" />
            Módulo de Enseñanza
          </Typography>
        </Breadcrumbs>

        {/* Título Principal */}
        <Typography 
          variant={isMobile ? "h4" : "h3"} 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 'bold',
            color: theme.palette.primary.main,
            mb: 2
          }}
        >
          Módulo de Enseñanza - Mecánica Ventilatoria
        </Typography>

        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ mb: 3, maxWidth: '800px' }}
        >
          Aprende los fundamentos de la ventilación mecánica a través de un programa estructurado 
          que combina teoría, práctica y simulaciones interactivas.
        </Typography>

        {/* Progreso General */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progreso General del Módulo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {moduleProgress.overall}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={moduleProgress.overall} 
            sx={{ 
              height: 8, 
              borderRadius: 4,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              }
            }}
          />
        </Box>
      </Paper>

      {/* Secciones de Aprendizaje */}
      <Grid container spacing={3}>
        {learningSections.map((section) => (
          <Grid item xs={12} md={4} key={section.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease-in-out',
                cursor: section.available ? 'pointer' : 'default',
                opacity: section.available ? 1 : 0.7,
                '&:hover': section.available ? {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                  '& .section-icon': {
                    transform: 'scale(1.1)',
                  }
                } : {},
                border: `2px solid ${section.available ? 'transparent' : theme.palette.grey[300]}`,
                position: 'relative'
              }}
              onClick={() => handleSectionClick(section.id)}
            >
              {/* Badge de estado */}
              {!section.available && (
                <Chip
                  label="Próximamente"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 1,
                    backgroundColor: theme.palette.warning.light,
                    color: theme.palette.warning.contrastText
                  }}
                />
              )}

              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                {/* Icono y Título */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box 
                    className="section-icon"
                    sx={{ 
                      mr: 2, 
                      transition: 'transform 0.3s ease-in-out',
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: `${section.color}15`
                    }}
                  >
                    {section.icon}
                  </Box>
                  <Typography 
                    variant="h6" 
                    component="h2" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: section.color,
                      lineHeight: 1.2
                    }}
                  >
                    {section.title}
                  </Typography>
                </Box>

                {/* Descripción */}
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ mb: 3, lineHeight: 1.6 }}
                >
                  {section.description}
                </Typography>

                {/* Lista de Temas */}
                <Typography 
                  variant="subtitle2" 
                  sx={{ mb: 1, fontWeight: 'bold', color: section.color }}
                >
                  Contenido incluido:
                </Typography>
                <List dense sx={{ py: 0 }}>
                  {section.topics.map((topic, index) => (
                    <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        {section.progress > 0 ? (
                          <CheckCircle sx={{ fontSize: 16, color: theme.palette.success.main }} />
                        ) : (
                          <RadioButtonUnchecked sx={{ fontSize: 16, color: theme.palette.grey[400] }} />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={topic}
                        primaryTypographyProps={{
                          variant: 'body2',
                          sx: { fontSize: '0.875rem' }
                        }}
                      />
                    </ListItem>
                  ))}
                </List>

                {/* Progreso de la Sección */}
                {section.available && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Progreso
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {section.progress}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={section.progress}
                      sx={{ 
                        height: 4, 
                        borderRadius: 2,
                        backgroundColor: theme.palette.grey[200],
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: section.color,
                          borderRadius: 2,
                        }
                      }}
                    />
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ p: 3, pt: 0 }}>
                <Button
                  variant={section.available ? "contained" : "outlined"}
                  fullWidth
                  startIcon={getButtonIcon(section)}
                  disabled={!section.available}
                  sx={{
                    py: 1.5,
                    backgroundColor: section.available ? section.color : 'transparent',
                    borderColor: section.color,
                    color: section.available ? 'white' : section.color,
                    '&:hover': section.available ? {
                      backgroundColor: section.color,
                      filter: 'brightness(0.9)',
                    } : {},
                    '&:disabled': {
                      borderColor: theme.palette.grey[300],
                      color: theme.palette.grey[500]
                    }
                  }}
                >
                  {getButtonText(section)}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Información Adicional */}
      <Paper 
        elevation={1} 
        sx={{ 
          mt: 4, 
          p: 3, 
          backgroundColor: theme.palette.grey[50],
          borderLeft: `4px solid ${theme.palette.info.main}`
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ color: theme.palette.info.main }}>
          💡 Sobre este módulo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Este módulo está diseñado para proporcionar una comprensión integral de la ventilación mecánica, 
          desde los fundamentos fisiológicos hasta la aplicación clínica práctica. Cada sección incluye 
          contenido teórico, casos clínicos y simulaciones interactivas para reforzar el aprendizaje.
        </Typography>
      </Paper>
    </Container>
  );
};

export default TeachingModule;
