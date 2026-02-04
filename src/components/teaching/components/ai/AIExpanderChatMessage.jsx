"use client";

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';

/**
 * AIExpanderChatMessage - Renders a chat message bubble
 *
 * Supports two roles:
 * - user: Blue bubble aligned right
 * - assistant: Dark gray bubble aligned left
 *
 * @param {Object} props
 * @param {'user' | 'assistant'} props.role - Message role
 * @param {string} props.content - Message content
 * @param {React.ReactNode} props.children - Optional children to render instead of content
 */
const AIExpanderChatMessage = ({ role, content, children }) => {
  const isUser = role === 'user';

  return (
    <Box
      sx={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '75%',
        backgroundColor: isUser ? '#0BBAF4' : '#2a3441',
        color: isUser ? '#ffffff' : '#e0e0e0',
        p: isUser ? 2 : 2.5,
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        boxShadow: isUser
          ? '0 2px 8px rgba(11, 186, 244, 0.2)'
          : '0 2px 8px rgba(0, 0, 0, 0.3)',
        mb: 1,
      }}
    >
      {children || (
        <Typography
          variant={isUser ? 'body1' : 'body2'}
          sx={{ color: isUser ? '#ffffff' : '#e0e0e0', wordBreak: 'break-word' }}
        >
          {content}
        </Typography>
      )}
    </Box>
  );
};

AIExpanderChatMessage.propTypes = {
  role: PropTypes.oneOf(['user', 'assistant']).isRequired,
  content: PropTypes.string,
  children: PropTypes.node,
};

AIExpanderChatMessage.defaultProps = {
  content: '',
  children: null,
};

export default AIExpanderChatMessage;
