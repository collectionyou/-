import React, { useState, useEffect } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { ChakraProvider, Box, Flex } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/Home';
import SystemCheck from './components/SystemCheck';
import { BroadcastProvider } from './hooks/useBroadcastContext';
import '../common/App.css';
import theme from '../common/styles/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      retry: false,
      cacheTime: 10,
    },
  },
});

function App() {
  const [isLoaded, setIsLoaded] = useState(true);

  useEffect(() => {
    window.electron.ipcRenderer.on('check-health', (health) => {
      setIsLoaded(Boolean(health));
    });

    return () => {
      window.electron.ipcRenderer.remove('check-health');
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <BroadcastProvider>
          <ErrorBoundary>
            <Router>
              <Flex direction="column" minH="100vh" opacity={isLoaded ? 1 : 0.98}>
                <Navbar />
                <Box flex="1" mt={{ base: '4rem', md: '5rem' }}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                  </Routes>
                </Box>
                <Footer />
              </Flex>
              <SystemCheck />
            </Router>
          </ErrorBoundary>
        </BroadcastProvider>
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default App;
