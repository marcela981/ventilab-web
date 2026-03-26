/**
 * CurriculumSections Component for VentyLab
 *
 * Displays the curriculum tab as three top-level accordions:
 *   1. Aprendizaje Ventylab      – platform-specific learning (upcoming)
 *   2. Prerequisitos              – optional prerequisite modules
 *   3. Aprendizaje Mecánica respiratoria – main learning path (beginner → advanced)
 *
 * @component
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  MenuBook as MenuBookIcon,
  Devices as DevicesIcon,
} from '@mui/icons-material';
import LevelStepper from '../LevelStepper/LevelStepper';

const SECTION_IDS = ['ventylab', 'prerequisitos', 'mecanica'];

const SECTION_META = {
  ventylab:      { icon: DevicesIcon, color: '#7B1FA2' },
  prerequisitos: { icon: SchoolIcon,  color: '#757575' },
  mecanica:      { icon: MenuBookIcon, color: '#1565C0' },
};

/** Keys under curriculum.sections in teaching.json (ids here are API / filter keys). */
const SECTION_I18N_KEY = {
  ventylab: 'ventylab',
  prerequisitos: 'prerequisites',
  mecanica: 'respiratory',
};

/**
 * CurriculumSections
 *
 * Receives the same level/module props as LevelStepper and splits them into
 * the three logical curriculum sections.
 */
const CurriculumSections = ({
  levels,
  levelProgress,
  getModulesByLevel,
  calculateModuleProgress,
  isModuleAvailable,
  getModuleStatus,
  getTooltipMessage,
  handleSectionClick,
  favoriteModules,
  toggleFavorite,
}) => {
  const { t } = useTranslation('teaching');

  // Last accordion open by default (main learning path is the existing content)
  const [expanded, setExpanded] = useState('mecanica');

  const ventylabLevels = useMemo(
    () => levels.filter((l) => l.track === 'ventylab'),
    [levels]
  );

  const prerequisitosLevels = useMemo(
    () => levels.filter((l) => l.id === 'prerequisitos'),
    [levels]
  );

  const mainLevels = useMemo(
    () => levels.filter((l) => l.track === 'mecanica' && l.id !== 'prerequisitos'),
    [levels]
  );

  const handleChange = (panel) => (_, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const levelStepperProps = {
    levelProgress,
    getModulesByLevel,
    calculateModuleProgress,
    isModuleAvailable,
    getModuleStatus,
    getTooltipMessage,
    onSectionClick: handleSectionClick,
    favoriteModules,
    onToggleFavorite: toggleFavorite,
    renderMode: 'modules',
  };

  return (
    <Box>
      {SECTION_IDS.map((id) => {
        const { icon: Icon, color } = SECTION_META[id];
        const title = t(`curriculum.sections.${SECTION_I18N_KEY[id]}`);

        return (
          <Accordion
            key={id}
            expanded={expanded === id}
            onChange={handleChange(id)}
            disableGutters
            sx={{
              mb: 1.5,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(2px)',
              '&:before': { display: 'none' },
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              '&.Mui-expanded': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                px: 3,
                py: 1,
                borderRadius: 2,
                '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 },
              }}
            >
              <Icon sx={{ color, fontSize: 22 }} />
              <Typography variant="subtitle1" fontWeight={600} sx={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                {title}
              </Typography>
              {id === 'prerequisitos' && (
                <Chip label={t('curriculum.badges.optional')} size="small" variant="outlined" sx={{ ml: 1, fontSize: 11, color: 'white', borderColor: '#BDBDBD' }} />
              )}
            </AccordionSummary>

            <AccordionDetails sx={{ px: 2, pb: 2 }}>
              {id === 'ventylab' && (
                ventylabLevels.length > 0 ? (
                  <LevelStepper levels={ventylabLevels} {...levelStepperProps} />
                ) : (
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    {t('curriculum.empty.noModules', 'No hay módulos disponibles aún.')}
                  </Typography>
                )
              )}

              {id === 'prerequisitos' && (
                prerequisitosLevels.length > 0 ? (
                  <LevelStepper levels={prerequisitosLevels} {...levelStepperProps} />
                ) : (
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    {t('curriculum.empty.noPrerequisites')}
                  </Typography>
                )
              )}

              {id === 'mecanica' && (
                <LevelStepper levels={mainLevels} {...levelStepperProps} />
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

CurriculumSections.propTypes = {
  levels: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      color: PropTypes.string.isRequired,
      emoji: PropTypes.string,
    })
  ).isRequired,
  levelProgress: PropTypes.object.isRequired,
  getModulesByLevel: PropTypes.func.isRequired,
  calculateModuleProgress: PropTypes.func.isRequired,
  isModuleAvailable: PropTypes.func.isRequired,
  getModuleStatus: PropTypes.func.isRequired,
  getTooltipMessage: PropTypes.func.isRequired,
  handleSectionClick: PropTypes.func.isRequired,
  favoriteModules: PropTypes.instanceOf(Set).isRequired,
  toggleFavorite: PropTypes.func.isRequired,
};

export default CurriculumSections;
