import React, { useEffect } from 'react';
import { Flex } from '@chakra-ui/react';
import AppListComponent from './AppListComponent';
import InstanceListComponent from './InstanceListComponent';
import { AppManagerProvider, useAppManager } from './AppManagerContext';

const AppManagerContent = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    selectedAppId,
    selectedInstanceId,
  } = useAppManager();

  const handleOpenSettings = () => {
    window.electron.ipcRenderer.sendMessage('open-settings-window', {
      appId: selectedAppId,
      instanceId: selectedInstanceId,
    });
  };

  useEffect(() => {
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      handleOpenSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAppId, selectedInstanceId, isSettingsOpen, setIsSettingsOpen]);

  return (
    <Flex h="42vh">
      <AppListComponent />
      <InstanceListComponent />
    </Flex>
  );
};

const AppManagerComponent = () => {
  return (
    <AppManagerProvider>
      <AppManagerContent />
    </AppManagerProvider>
  );
};

export default React.memo(AppManagerComponent);
