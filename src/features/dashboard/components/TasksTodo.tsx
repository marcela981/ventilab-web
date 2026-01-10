import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Skeleton
} from '@mui/material';
import {
  Checklist,
  CheckCircle,
  RadioButtonUnchecked
} from '@mui/icons-material';
import { TaskItem } from '../types';

interface TasksTodoProps {
  items: TaskItem[];
  onToggle: (id: string) => void;
  loading?: boolean;
}

/**
 * TasksTodo - Checklist sencilla (checkbox + label)
 */
const TasksTodo: React.FC<TasksTodoProps> = ({
  items,
  onToggle,
  loading = false
}) => {
  if (loading) {
    return (
      <Card
        sx={{
          backgroundColor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2
        }}
      >
        <CardContent>
          <Skeleton variant="text" width="40%" height={30} sx={{ mb: 2 }} />
          {[1, 2, 3, 4].map((i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width="70%" height={20} />
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card
        sx={{
          backgroundColor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            sx={{
              color: '#ffffff',
              fontWeight: 600,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Checklist sx={{ fontSize: 20 }} />
            Tareas
          </Typography>
          <Typography variant="body2" sx={{ color: '#e8f4fd', textAlign: 'center', py: 3 }}>
            No hay tareas
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        height: '100%'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="h6"
          sx={{
            color: '#ffffff',
            fontWeight: 600,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Checklist sx={{ fontSize: 20 }} />
          Tareas
        </Typography>

        <List sx={{ p: 0 }}>
          {items.map((item) => (
            <ListItem
              key={item.id}
              sx={{
                mb: 1,
                p: 1.5,
                borderRadius: 1,
                backgroundColor: item.completed
                  ? 'rgba(76, 175, 80, 0.05)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: item.completed
                  ? '1px solid rgba(76, 175, 80, 0.2)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.25s ease-in-out',
                opacity: item.completed ? 0.7 : 1,
                '&:hover': {
                  backgroundColor: item.completed
                    ? 'rgba(76, 175, 80, 0.1)'
                    : 'rgba(255, 255, 255, 0.05)'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Checkbox
                  checked={item.completed}
                  onChange={() => {
                    const analyticsId = `todo-toggle-${item.id}`;
                    if (typeof window !== 'undefined' && (window as any).analytics) {
                      (window as any).analytics.track('todo-toggle', { id: analyticsId });
                    } else {
                      console.info('[Analytics] todo-toggle', { id: analyticsId });
                    }
                    onToggle(item.id);
                  }}
                  icon={<RadioButtonUnchecked sx={{ color: '#e8f4fd' }} />}
                  checkedIcon={<CheckCircle sx={{ color: '#4CAF50' }} />}
                  aria-label={item.label}
                  data-analytics-id={`todo-toggle-${item.id}`}
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    sx={{
                      color: item.completed ? '#9e9e9e' : '#ffffff',
                      fontWeight: item.completed ? 400 : 500,
                      fontSize: '0.875rem',
                      textDecoration: item.completed ? 'line-through' : 'none'
                    }}
                  >
                    {item.label}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default TasksTodo;
