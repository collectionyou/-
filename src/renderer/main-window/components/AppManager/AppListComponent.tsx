import React from 'react';
import { Box, VStack, Text, Flex } from '@chakra-ui/react';
import AppCardComponent from './AppCardComponent';
import SearchBarComponent from './SearchBarComponent';
import { useAppManager } from './AppManagerContext';

const AppListComponent = () => {
  const {
    data,
    selectedAppId,
    setSelectedAppId,
    setSelectedInstanceId,
    handleSearch,
    handleSelectApp,
    setIsSettingsOpen,
    instances,
  } = useAppManager();

  return (
    <Box w="40%" bg="brand.50" display="flex" flexDirection="column">
      <Box p={2} position="sticky" top="0" zIndex="1">
        <SearchBarComponent onSearch={handleSearch} />
      </Box>
      <VStack spacing={3} align="stretch" overflowY="auto" flex="1" p={4}>
        {data.data.length > 0 ? (
          data.data.map((app, i) => (
            <AppCardComponent
              key={i}
              app={app}
              selectedAppId={selectedAppId}
              handleSelectApp={handleSelectApp}
              openSettings={() => {
                setSelectedAppId(app.id);
                setSelectedInstanceId(null);
                setIsSettingsOpen(true);
              }}
              instances={instances}
            />
          ))
        ) : (
          <Flex
            justifyContent="center"
            alignItems="center"
            height="100%"
            direction="column"
          >
            <Text color="gray.500">没有匹配的平台</Text>
          </Flex>
        )}
      </VStack>
    </Box>
  );
};

export default AppListComponent;
