import React from 'react';
import {
  Box,
  Flex,
  Image,
  Badge,
  HStack,
  IconButton,
  Tooltip,
  Text,
} from '@chakra-ui/react';
import { SettingsIcon } from '@chakra-ui/icons';
import defaultPlatformIcon from '../../../../../assets/base/default-platform-icon.png';
import windowsIcon from '../../../../../assets/base/windows.png';

type AppCardComponentProps = {
  app: {
    id: string;
    name: string;
    avatar?: string;
    env?: string;
    iconText?: string;
    running?: boolean;
    matchedName?: string;
    matchedTitle?: string;
  };
  selectedAppId: string | null;
  handleSelectApp: (appId: string) => void;
  openSettings: (e: boolean) => void;
  instances: {
    task_id: string;
    app_id: string;
    env_id: string;
  }[];
};

const AppCardComponent = ({
  app,
  selectedAppId,
  handleSelectApp,
  openSettings,
  instances,
}: AppCardComponentProps) => {
  const appInstancesCount = instances.filter(
    (instance) => instance.app_id === app.id,
  ).length;
  const isConnected = appInstancesCount > 0;

  return (
    <Flex
      bg="gray.100"
      borderRadius="md"
      p={3}
      align="center"
      position="relative"
      outline={
        selectedAppId === app.id
          ? '3px solid var(--chakra-colors-teal-300)'
          : 'none'
      }
      cursor="pointer"
      onClick={() => {
        handleSelectApp(app.id);
      }}
    >
      {appInstancesCount > 0 && (
        <Box
          position="absolute"
          top="-5px"
          right="-5px"
          bg="red.500"
          color="white"
          borderRadius="full"
          width="20px"
          height="20px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="12px"
        >
          {appInstancesCount}
        </Box>
      )}
      <Box position="relative" marginRight="12px">
        {app.iconText ? (
          <Flex
            boxSize="30px"
            borderRadius="8px"
            bg="white"
            align="center"
            justify="center"
            borderWidth="1px"
            borderColor="gray.200"
          >
            <Text fontWeight="bold" color="blue.600">
              {app.iconText}
            </Text>
          </Flex>
        ) : (
          <Image
            src={app.avatar || defaultPlatformIcon}
            fallbackSrc={defaultPlatformIcon}
            boxSize="25px"
          />
        )}
        {app.env === 'desktop' && (
          <Tooltip label="客户端应用，需要先手动打开该应用">
            <Image
              src={windowsIcon}
              boxSize="15px"
              position="absolute"
              top="-5px"
              right="-5px"
              alt="windows"
            />
          </Tooltip>
        )}
      </Box>
      <HStack align="center" flex="1">
        <Tooltip
          label={
            isConnected
              ? '已连接到策略服务'
              : '尚未连接到策略服务'
          }
        >
          <Box
            boxSize="8px"
            borderRadius="full"
            bg={isConnected ? 'green.400' : 'red.400'}
            flexShrink={0}
          />
        </Tooltip>
        <Badge colorScheme="gray">{app.name}</Badge>
      </HStack>
      <Box position="absolute" bottom="5px" right="-5px">
        <Tooltip label={`设置 ${app.name} 平台`}>
          <IconButton
            variant="borderless"
            aria-label={`设置 ${app.name} 平台`}
            fontSize="15px"
            w={4}
            h={4}
            icon={<SettingsIcon />}
            onClick={(e) => {
              e.stopPropagation();
              openSettings(true);
            }}
          />
        </Tooltip>
      </Box>
    </Flex>
  );
};

export default AppCardComponent;
