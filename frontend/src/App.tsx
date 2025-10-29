import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

const App: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box textAlign="center">
          <Typography variant="h4" component="h1" gutterBottom>
            Media Downloader v2.0
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Refactored with TypeScript, improved architecture, and modern tooling
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default App;