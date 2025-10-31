import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School as TeachingIcon,
  Assessment as EvaluationIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';

const drawerWidth = 240;

const menuItems = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard'
  },
  {
    text: 'Módulo de Enseñanza',
    icon: <TeachingIcon />,
    path: '/teaching'
  },
  {
    text: 'Evaluación',
    icon: <EvaluationIcon />,
    path: '/evaluation'
  },
  {
    text: 'Configuración',
    icon: <SettingsIcon />,
    path: '/settings'
  }
];

const Sidebar = ({ open, onToggle }) => {
  const router = useRouter();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : 64,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : 64,
          boxSizing: 'border-box',
          transition: 'width 0.25s ease',
          overflowX: 'hidden',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#e8f4fd',
          boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
        },
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          px: [1],
          minHeight: '64px !important',
        }}
      >
        {open && (
          <Typography variant="h6" noWrap component="div" sx={{ color: '#e8f4fd' }}>
            VentyLab
          </Typography>
        )}
        <IconButton
          onClick={onToggle}
          sx={{
            color: '#e8f4fd',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
          }}
        >
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>
      
      <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
      
      <List sx={{ mt: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
            <Link href={item.path} passHref legacyBehavior>
              <ListItemButton
                component="a"
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                  backgroundColor: router.pathname === item.path ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                  borderRadius: '0 25px 25px 0',
                  mr: 1,
                  my: 0.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open && (
                  <ListItemText 
                    primary={item.text} 
                    sx={{ 
                      opacity: 1,
                      '& .MuiListItemText-primary': {
                        color: 'white',
                        fontWeight: router.pathname === item.path ? 600 : 400,
                      }
                    }} 
                  />
                )}
              </ListItemButton>
            </Link>
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ flexGrow: 1 }} />
      
      {open && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            VentyLab v0.1.0
          </Typography>
        </Box>
      )}
    </Drawer>
  );
};

export default Sidebar;
