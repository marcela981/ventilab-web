/**
 * =============================================================================
 * StudentsList Component
 * =============================================================================
 * Reusable component for displaying a list of students with their progress stats.
 * Responsive: shows a table on desktop and cards on mobile.
 *
 * Features:
 * - Sortable columns
 * - Pagination
 * - Loading skeleton states
 * - Empty state handling
 * - Mobile-responsive card view
 *
 * @example
 * <StudentsList
 *   students={students}
 *   isLoading={false}
 *   onViewDetails={(student) => navigate(`/students/${student.id}`)}
 *   page={0}
 *   rowsPerPage={10}
 *   totalCount={100}
 *   onPageChange={(e, page) => setPage(page)}
 *   onRowsPerPageChange={(e) => setRowsPerPage(e.target.value)}
 *   orderBy="name"
 *   order="asc"
 *   onRequestSort={(property) => handleSort(property)}
 * />
 * =============================================================================
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Typography,
  Skeleton,
  Card,
  CardContent,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';
import StudentRow from './StudentRow';
import StudentCard from './StudentCard';

/**
 * Table column definitions
 */
const TABLE_COLUMNS = [
  { id: 'avatar', label: 'Usuario', sortable: false, align: 'left' },
  { id: 'name', label: 'Nombre', sortable: true, align: 'left' },
  { id: 'email', label: 'Email', sortable: true, align: 'left' },
  { id: 'progress', label: 'Progreso', sortable: true, align: 'left' },
  { id: 'completedLessons', label: 'Lecciones', sortable: true, align: 'center' },
  { id: 'lastAccess', label: 'Última Actividad', sortable: true, align: 'left' },
  { id: 'actions', label: 'Acciones', sortable: false, align: 'right' },
];

/**
 * StudentsList Component
 */
const StudentsList = ({
  students,
  isLoading,
  onViewDetails,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  orderBy,
  order,
  onRequestSort,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  /**
   * Handles column header click for sorting
   */
  const handleRequestSort = (property) => {
    if (onRequestSort) {
      onRequestSort(property);
    }
  };

  /**
   * Renders loading skeleton state
   */
  const renderLoadingState = () => {
    if (isMobile) {
      return (
        <Box>
          {[...Array(rowsPerPage)].map((_, index) => (
            <Card key={index} elevation={2} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={24} />
                    <Skeleton variant="text" width="80%" height={20} />
                  </Box>
                </Box>
                <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 4, mb: 2 }} />
                <Stack spacing={1}>
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="100%" height={20} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      );
    }

    return (
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              {TABLE_COLUMNS.map((column) => (
                <TableCell key={column.id} align={column.align}>
                  <Skeleton variant="text" width="80%" />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(rowsPerPage)].map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton variant="circular" width={40} height={40} />
                </TableCell>
                {[...Array(TABLE_COLUMNS.length - 1)].map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton variant="text" width="80%" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  /**
   * Renders empty state
   */
  const renderEmptyState = () => (
    <Box
      sx={{
        textAlign: 'center',
        py: 8,
        px: 2,
      }}
    >
      <SchoolIcon
        sx={{
          fontSize: 80,
          color: 'text.secondary',
          mb: 2,
        }}
      />
      <Typography variant="h6" gutterBottom>
        No hay estudiantes
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Cuando tengas estudiantes asignados, aparecerán aquí.
      </Typography>
    </Box>
  );

  /**
   * Renders mobile view (cards)
   */
  const renderMobileView = () => (
    <Box>
      {students.map((student) => (
        <StudentCard
          key={student.id}
          student={student}
          onViewDetails={onViewDetails}
        />
      ))}
    </Box>
  );

  /**
   * Renders desktop view (table)
   */
  const renderDesktopView = () => (
    <TableContainer component={Paper} elevation={0}>
      <Table>
        <TableHead>
          <TableRow>
            {TABLE_COLUMNS.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                sx={{ fontWeight: 'bold' }}
              >
                {column.sortable ? (
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={() => handleRequestSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              onViewDetails={onViewDetails}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      {/* Table or Cards */}
      {isLoading ? (
        renderLoadingState()
      ) : students.length === 0 ? (
        renderEmptyState()
      ) : isMobile ? (
        renderMobileView()
      ) : (
        renderDesktopView()
      )}

      {/* Pagination */}
      {!isLoading && students.length > 0 && (
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Estudiantes por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            mt: 2,
          }}
        />
      )}
    </Box>
  );
};

StudentsList.propTypes = {
  /**
   * Array of students to display
   */
  students: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
      email: PropTypes.string.isRequired,
      image: PropTypes.string,
      stats: PropTypes.shape({
        completedLessons: PropTypes.number,
        totalLessons: PropTypes.number,
        totalTimeSpent: PropTypes.number,
        lastAccess: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        progressPercentage: PropTypes.number,
      }),
    })
  ).isRequired,

  /**
   * Whether data is loading
   */
  isLoading: PropTypes.bool,

  /**
   * Callback when "View Details" is clicked
   */
  onViewDetails: PropTypes.func,

  /**
   * Current page (0-indexed)
   */
  page: PropTypes.number.isRequired,

  /**
   * Rows per page
   */
  rowsPerPage: PropTypes.number.isRequired,

  /**
   * Total count of students (for pagination)
   */
  totalCount: PropTypes.number.isRequired,

  /**
   * Callback when page changes
   */
  onPageChange: PropTypes.func.isRequired,

  /**
   * Callback when rows per page changes
   */
  onRowsPerPageChange: PropTypes.func.isRequired,

  /**
   * Property to sort by
   */
  orderBy: PropTypes.string,

  /**
   * Sort direction ('asc' or 'desc')
   */
  order: PropTypes.oneOf(['asc', 'desc']),

  /**
   * Callback when sort is requested
   */
  onRequestSort: PropTypes.func,
};

StudentsList.defaultProps = {
  isLoading: false,
  onViewDetails: null,
  orderBy: 'name',
  order: 'asc',
  onRequestSort: null,
};

export default StudentsList;
