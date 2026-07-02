import React, {
  useMemo,
  useCallback,
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getPlatformList,
  getTasks,
  removeTask,
  addTask,
} from '../../../common/services/platform/controller';
import defaultPlatformIcon from '../../../../../assets/base/default-platform-icon.png';
import { Instance, App } from '../../../common/services/platform/platform';

interface AppManagerContextType {
  data: { data: App[] } | undefined;
  isLoading: boolean;
  isTasksLoading: boolean;
  hasRequestedPlatforms: boolean;
  requestPlatforms: () => void;
  setSelectedAppId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedAppId: string | null;
  setSelectedInstanceId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedInstanceId: string | null;
  filteredInstances: Instance[];
  isSettingsOpen: boolean;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleSearch: (searchTerm: string) => void;
  handleDelete: (taskId: string) => void;
  handleAddTask: () => void;
  instances: Instance[];
}

const AppManagerContext = createContext<AppManagerContextType | undefined>(
  undefined,
);

interface AppManagerProviderProps {
  children: ReactNode;
}

export const useAppManager = (): AppManagerContextType => {
  const context = useContext(AppManagerContext);
  if (!context) {
    throw new Error('useAppManager must be used within an AppManagerProvider');
  }
  return context;
};

const usePlatformList = (enabled: boolean) => {
  const { data, error, isLoading } = useQuery(
    ['platformList'],
    getPlatformList,
    {
      enabled,
      retry: false,
    },
  );

  return { data, isLoading, error };
};

const useTaskList = (enabled: boolean) => {
  return useQuery(['tasks'], () => getTasks(), {
    enabled,
  });
};

const useInstances = (enabled: boolean) => {
  const { data: taskData, refetch: refetchTasks } = useTaskList(enabled);
  const instances = taskData?.data || [];

  return { instances, refetchTasks };
};

const useFilteredInstances = (
  data: { data: App[] } | undefined,
  instances: Instance[],
  selectedAppId: string | null,
) => {
  const [filteredInstances, setFilteredInstances] = useState<Instance[]>([]);

  useEffect(() => {
    if (selectedAppId && data) {
      const matchedInstances = instances.filter(
        (instance) => instance.app_id === selectedAppId,
      );
      const updatedInstances = matchedInstances.map((instance) => ({
        ...instance,
        avatar:
          data.data.find((app) => app.id === instance.app_id)?.avatar ||
          defaultPlatformIcon,
      }));
      setFilteredInstances(updatedInstances);
    } else {
      setFilteredInstances([]);
    }
  }, [selectedAppId, instances, data]);

  return { filteredInstances, setFilteredInstances };
};

const useRefreshConfigListener = (
  refetchTasks: () => void,
  enabled: boolean,
) => {
  useEffect(() => {
    if (!enabled) return undefined;

    const refreshConfigListener = async () => {
      try {
        await refetchTasks();
      } catch (error: any) {
        console.error(error);
      }
    };

    window.electron.ipcRenderer.on('refresh-config', refreshConfigListener);
    return () => {
      window.electron.ipcRenderer.remove('refresh-config');
    };
  }, [refetchTasks, enabled]);
};

export const AppManagerProvider = ({ children }: AppManagerProviderProps) => {
  const [hasRequestedPlatforms, setHasRequestedPlatforms] = useState(false);
  const { data, isLoading } = usePlatformList(hasRequestedPlatforms);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    null,
  );
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { instances, refetchTasks } = useInstances(hasRequestedPlatforms);

  useRefreshConfigListener(refetchTasks, hasRequestedPlatforms);

  const { filteredInstances, setFilteredInstances } = useFilteredInstances(
    data,
    instances,
    selectedAppId,
  );

  const requestPlatforms = useCallback(() => {
    setHasRequestedPlatforms(true);
  }, []);

  const handleSearch = useCallback(
    (searchTerm: string) => {
      if (data) {
        const matchedInstances = instances.filter((instance) => {
          const app = data.data.find((x) => x.id === instance.app_id);
          return app?.name.includes(searchTerm);
        });
        const updatedInstances = matchedInstances.map((instance) => ({
          ...instance,
          avatar:
            data.data.find((app) => app.id === instance.app_id)?.avatar ||
            defaultPlatformIcon,
        }));
        setFilteredInstances(updatedInstances);
      }
    },
    [data, instances, setFilteredInstances],
  );

  const handleDelete = useCallback(
    async (taskId: string) => {
      try {
        await removeTask(taskId);
        refetchTasks();
      } catch (error) {
        console.error('删除失败:', (error as Error).message || '未知错误');
      }
    },
    [refetchTasks],
  );

  const handleAddTask = useCallback(async () => {
    if (selectedAppId) {
      setIsTasksLoading(true);
      try {
        const { error } = await addTask(selectedAppId);
        if (error) {
          throw new Error(error);
        }

        await refetchTasks();
      } finally {
        setIsTasksLoading(false);
      }
    }
  }, [selectedAppId, refetchTasks]);

  const contextValue = useMemo(
    () => ({
      data,
      isLoading,
      isTasksLoading,
      hasRequestedPlatforms,
      requestPlatforms,
      selectedAppId,
      setSelectedAppId,
      selectedInstanceId,
      setSelectedInstanceId,
      filteredInstances,
      isSettingsOpen,
      setIsSettingsOpen,
      handleSearch,
      handleDelete,
      handleAddTask,
      instances,
    }),
    [
      data,
      isLoading,
      isTasksLoading,
      hasRequestedPlatforms,
      requestPlatforms,
      selectedAppId,
      selectedInstanceId,
      filteredInstances,
      isSettingsOpen,
      instances,
      handleSearch,
      handleDelete,
      handleAddTask,
    ],
  );

  return (
    <AppManagerContext.Provider value={contextValue}>
      {children}
    </AppManagerContext.Provider>
  );
};
