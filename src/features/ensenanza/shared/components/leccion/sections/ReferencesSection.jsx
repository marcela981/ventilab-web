import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Link,
} from '@mui/material';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';

/**
 * ReferencesSection - Componente para renderizar referencias bibliográficas
 */
const ReferencesSection = ({ references }) => {
  if (!references || references.length === 0) return null;
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Referencias Bibliográficas
      </Typography>
      
      <Paper elevation={1} sx={{ p: { xs: 2, md: 3 } }}>
        <List>
          {references.map((ref, index) => (
            <ListItem key={index} sx={{ pl: 0, alignItems: 'flex-start' }}>
              <ListItemText
                primary={
                  <Box>
                    <Typography variant="body2" component="span" sx={{ fontWeight: 600, mr: 1 }}>
                      {index + 1}.
                    </Typography>
                    <Typography variant="body2" component="span">
                      {ref.authors && `${ref.authors} `}
                      {ref.year && `(${ref.year}). `}
                      {ref.title && (
                        <Typography component="span" variant="body2" sx={{ fontStyle: 'italic' }}>
                          {ref.title}
                        </Typography>
                      )}
                      {ref.journal && `. ${ref.journal}`}
                      {ref.volume && `, ${ref.volume}`}
                      {ref.pages && `, ${ref.pages}`}
                      {ref.doi && (
                        <Link
                          href={`https://doi.org/${ref.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ ml: 1 }}
                        >
                          DOI: {ref.doi}
                          <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle' }} />
                        </Link>
                      )}
                      {ref.url && !ref.doi && (
                        <Link
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ ml: 1 }}
                        >
                          Ver enlace
                          <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle' }} />
                        </Link>
                      )}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default ReferencesSection;

