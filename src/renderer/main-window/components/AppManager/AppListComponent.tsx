import React from 'react';
import { Box, VStack, Spinner, Text, Button, Flex } from '@chakra-ui/react';
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
    setIsSettingsOpen,
    instances,
    hasRequestedPlatforms,
    requestPlatforms,
    isLoading,
  } = useAppManager();

  if (!hasRequestedPlatforms) {
    return (
      <Box w="40%" bg="brand.50" display="flex" flexDirection="column">
        <Flex justifyContent="center" alignItems="center" flex="1" p={4}>
          <Button colorScheme="teal" onClick={requestPlatforms}>
            加载应用列表
          </Button>
        </Flex>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box w="40%" bg="brand.50" display="flex" flexDirection="column">
        <Flex justifyContent="center" alignItems="center" flex="1" p={4}>
          <Spinner size="xl" />
          <Text ml={4}>正在连接应用服务...</Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box w="40%" bg="brand.50" display="flex" flexDirection="column">
      <Box p={2} position="sticky" top="0" zIndex="1">
        <SearchBarComponent onSearch={handleSearch} />
      </Box>
      <VStack spacing={3} align="stretch" overflowY="auto" flex="1" p={4}>
        {data?.data && data.data.length > 0 ? (
          data.data.map((app, i) => (
            <AppCardComponent
              key={i}
              app={app}
              selectedAppId={selectedAppId}
              setSelectedAppId={setSelectedAppId}
              openSettings={() => {
                setSelectedAppId(app.id);
                setSelectedInstanceId(null);
                setIsSettingsOpen(true);
              }}
              instances={instances}
            />
          ))
        ) : (
          <Flex justifyContent="center" alignItems="center" height="100%" direction="column">
            <Text mb={3}>未获取到应用列表</Text>
            <Button size="sm" onClick={requestPlatforms}>
              重新加载
            </Button>
          </Flex>
        )}
      </VStack>
    </Box>
  );
};

export default AppListComponent;
