/**
 * =============================================================================
 * Layout Component for VentyLab
 * =============================================================================
 * Main layout wrapper that includes Navbar and provides consistent page structure
 * Includes global achievement notification system
 * =============================================================================
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Container } from '@mui/material';
import Navbar from './Navbar';
import { AchievementProvider } from '../../contexts/AchievementContext';

/**
 * Layout Component
 *
 * Wraps page content with navigation and consistent spacing
 *
 * @component
 * @example
 * // Basic usage
 * <Layout>
 *   <YourPageContent />
 * </Layout>
 *
 * @example
 * // With custom max width
 * <Layout maxWidth="lg">
 *   <YourPageContent />
 * </Layout>
 *
 * @example
 * // Full width (no container)
 * <Layout maxWidth={false}>
 *   <YourPageContent />
 * </Layout>
 *
 * @example
 * // Without padding
 * <Layout disablePadding>
 *   <YourPageContent />
 * </Layout>
 */
export default function Layout({
  children,
  maxWidth = 'xl',
  disablePadding = false,
  backgroundColor = 'background.default',
}) {
  return (
    <AchievementProvider>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          backgroundColor,
        }}
      >
        {/* Navigation */}
        <Navbar />

        {/* Main content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            py: disablePadding ? 0 : 3,
          }}
        >
          {maxWidth ? (
            <Container maxWidth={maxWidth}>{children}</Container>
          ) : (
            <>{children}</>
          )}
        </Box>

        {/* Optional footer can be added here */}
      </Box>
      {/* AchievementNotification is rendered by AchievementProvider */}
    </AchievementProvider>
  );
}

/**
 * PropTypes validation
 */
Layout.propTypes = {
  /**
   * Page content to render
   */
  children: PropTypes.node.isRequired,

  /**
   * Maximum width of content container
   * Set to false for full-width content
   * Options: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
   */
  maxWidth: PropTypes.oneOfType([
    PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
    PropTypes.bool,
  ]),

  /**
   * If true, removes vertical padding from main content area
   */
  disablePadding: PropTypes.bool,

  /**
   * Background color of the page
   */
  backgroundColor: PropTypes.string,
};
