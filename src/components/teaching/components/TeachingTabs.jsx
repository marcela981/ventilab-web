"use client";

import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

/**
 * TeachingTabs - Modern styled tabs navigation for the teaching module
 *
 * @param {Object} props
 * @param {number} props.activeTab - Currently active tab index (0: Dashboard, 1: Curriculum, 2: Mi Progreso)
 * @param {Function} props.onTabChange - Callback when tab is changed (event, newValue)
 * @param {boolean} props.isMobile - Whether the view is in mobile mode
 */
const TeachingTabs = ({ activeTab, onTabChange, isMobile }) => {
  const tabStyles = {
    '&.Mui-selected': {
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, transparent, #2196F3, transparent)',
      },
    },
  };

  return (
    <Box
      sx={{
        mb: 4,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(33, 150, 243, 0.3), transparent)',
        },
      }}
    >
      <Tabs
        value={activeTab}
        onChange={onTabChange}
        variant={isMobile ? 'fullWidth' : 'standard'}
        sx={{
          position: 'relative',
          '& .MuiTab-root': {
            minHeight: 72,
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 600,
            textTransform: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            padding: '12px 24px',
            marginRight: { xs: 0, sm: 2 },
            borderRadius: '12px 12px 0 0',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            '&:hover': {
              color: 'rgba(255, 255, 255, 0.9)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              transform: 'translateY(-2px)',
            },
            '&.Mui-selected': {
              color: '#ffffff',
              backgroundColor: 'rgba(33, 150, 243, 0.15)',
            },
            '& .MuiTab-iconWrapper': {
              marginRight: { xs: 0.5, sm: 1.5 },
              transition: 'transform 0.3s ease',
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
            },
            '&:hover .MuiTab-iconWrapper': {
              transform: 'scale(1.1)',
            },
            '&.Mui-selected .MuiTab-iconWrapper': {
              transform: 'scale(1.15)',
              color: '#2196F3',
            },
          },
          '& .MuiTabs-indicator': {
            height: 4,
            borderRadius: '4px 4px 0 0',
            background: 'linear-gradient(90deg, #2196F3, #42A5F5, #2196F3)',
            boxShadow: '0 2px 8px rgba(33, 150, 243, 0.4)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
          '& .MuiTabs-flexContainer': {
            gap: { xs: 0, sm: 1 },
          },
        }}
      >
        <Tab
          label={isMobile ? '' : 'Dashboard'}
          icon={<DashboardIcon />}
          iconPosition="start"
          value={0}
          sx={tabStyles}
        />
        <Tab
          label={isMobile ? '' : 'Curriculum'}
          icon={<SchoolIcon />}
          iconPosition="start"
          value={1}
          sx={tabStyles}
        />
        <Tab
          label={isMobile ? '' : 'Mi Progreso'}
          icon={<TrendingUpIcon />}
          iconPosition="start"
          value={2}
          sx={tabStyles}
        />
      </Tabs>
    </Box>
  );
};

export default TeachingTabs;
