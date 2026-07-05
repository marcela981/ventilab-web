/*
 * Funcionalidad: MathMarkdown
 * Descripción: Variante de MarkdownRenderer con soporte de fórmulas matemáticas
 *   (remark-math + rehype-katex + estilos de KaTeX). MarkdownRenderer la carga
 *   vía next/dynamic únicamente cuando el bloque contiene delimitadores
 *   $...$ / $$...$$, manteniendo KaTeX fuera del first-load de la lección.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { MarkdownContainer, markdownComponents } from './MarkdownRenderer';

// Estilos CSS de KaTeX (se emiten junto con este chunk, no en el first-load)
import 'katex/dist/katex.min.css';

const MathMarkdown = ({ content, className, sx, ...props }) => (
  <MarkdownContainer className={className} sx={sx} {...props}>
    <ReactMarkdown
      remarkPlugins={[
        remarkGfm,      // Soporte para GitHub Flavored Markdown (tablas, listas de tareas, etc.)
        remarkMath,     // Soporte para notación matemática
      ]}
      rehypePlugins={[
        rehypeKatex,    // Renderizado de fórmulas matemáticas con KaTeX
      ]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  </MarkdownContainer>
);

export default MathMarkdown;
