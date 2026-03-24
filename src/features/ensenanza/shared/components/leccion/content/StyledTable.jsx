import React from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  styled,
} from '@mui/material';

/**
 * StyledTableContainer - Contenedor personalizado para la tabla
 */
const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
  boxShadow: theme.shadows[2],
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  '& .MuiTable-root': {
    minWidth: 650,
  },
}));

/**
 * StyledHeaderCell - Celda de encabezado personalizada
 */
const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontWeight: 700,
  fontSize: '0.875rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  padding: theme.spacing(2),
  borderBottom: `2px solid ${theme.palette.primary.dark}`,
  '&:not(:last-child)': {
    borderRight: `1px solid ${theme.palette.primary.light}`,
  },
}));

/**
 * StyledBodyCell - Celda de cuerpo personalizada
 */
const StyledBodyCell = styled(TableCell)(({ theme }) => ({
  fontSize: '0.875rem',
  padding: theme.spacing(1.5, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': {
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

/**
 * StyledBodyRow - Fila del cuerpo con efecto hover
 */
const StyledBodyRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
    transition: 'background-color 0.2s ease',
  },
  '&:last-child td': {
    borderBottom: 'none',
  },
}));

/**
 * StyledTable - Componente de tabla personalizado con estilos de Material UI
 * para renderizar tablas Markdown con un aspecto profesional y legible.
 * 
 * @component
 * @example
 * ```jsx
 * <StyledTable>
 *   <thead>
 *     <tr>
 *       <th>Parámetro</th>
 *       <th>Valor Normal</th>
 *       <th>Unidad</th>
 *     </tr>
 *   </thead>
 *   <tbody>
 *     <tr>
 *       <td>PEEP</td>
 *       <td>5-10</td>
 *       <td>cmH₂O</td>
 *     </tr>
 *   </tbody>
 * </StyledTable>
 * ```
 * 
 * @param {Object} props - Propiedades del componente
 * @param {React.ReactNode} children - Contenido de la tabla (thead, tbody, etc.)
 * @param {string} [className] - Clase CSS adicional
 */
const StyledTable = ({ children, className, ...props }) => {
  /**
   * Procesa los children para aplicar estilos personalizados a las celdas
   */
  const processTableChildren = (children) => {
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;

      const tagName = child.type;

      // Procesar thead
      if (tagName === 'thead') {
        return (
          <TableHead>
            {React.Children.map(child.props.children, (row) => {
              if (!React.isValidElement(row) || row.type !== 'tr') return row;
              
              return (
                <TableRow>
                  {React.Children.map(row.props.children, (cell) => {
                    if (!React.isValidElement(cell)) return cell;
                    
                    return (
                      <StyledHeaderCell
                        align={cell.props.align || 'left'}
                      >
                        {cell.props.children}
                      </StyledHeaderCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableHead>
        );
      }

      // Procesar tbody
      if (tagName === 'tbody') {
        return (
          <TableBody>
            {React.Children.map(child.props.children, (row) => {
              if (!React.isValidElement(row) || row.type !== 'tr') return row;
              
              return (
                <StyledBodyRow>
                  {React.Children.map(row.props.children, (cell) => {
                    if (!React.isValidElement(cell)) return cell;
                    
                    return (
                      <StyledBodyCell
                        align={cell.props.align || 'left'}
                      >
                        {cell.props.children}
                      </StyledBodyCell>
                    );
                  })}
                </StyledBodyRow>
              );
            })}
          </TableBody>
        );
      }

      return child;
    });
  };

  return (
    <StyledTableContainer component={Paper} className={className}>
      <Table {...props}>
        {processTableChildren(children)}
      </Table>
    </StyledTableContainer>
  );
};

StyledTable.propTypes = {
  /** Contenido de la tabla (elementos thead, tbody, etc.) */
  children: PropTypes.node.isRequired,
  /** Clase CSS adicional */
  className: PropTypes.string,
};

StyledTable.defaultProps = {
  className: '',
};

export default StyledTable;

