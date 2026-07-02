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
  getTasks,
  removeTask,
  addTask,
} from '../../../common/services/platform/controller';
import defaultPlatformIcon from '../../../../../assets/base/default-platform-icon.png';
import { Instance, App } from '../../../common/services/platform/platform';

export type StaticApp = App & {
  iconText?: string;
  enabled?: boolean;
  running?: boolean;
  matchedName?: string;
  matchedTitle?: string;
};

const STATIC_PLATFORM_LIST: StaticApp[] = [
  {
    id: 'pinduoduo',
    name: '拼多多',
    env: 'desktop',
    iconText: '拼',
    enabled: true,
  },
  {
    id: 'win_qianniu',
    name: '千牛',
    env: 'desktop',
    iconText: '千',
    enabled: true,
  },
  {
    id: 'jinritemai',
    name: '抖店',
    env: 'desktop',
    iconText: '抖',
    enabled: true,
  },
  {
    id: 'douyin',
    name: '抖音',
    env: 'desktop',
    iconText: '音',
    enabled: true,
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    env: 'desktop',
    iconText: '红',
    enabled: true,
  },
  {
    id: 'jingmai',
    name: '京麦',
    env: 'desktop',
    iconText: '京',
    enabled: true,
  },
];

interface AppManagerContextType {
  data: { data: StaticApp[] };
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
  handleSelectApp: (appId: string) => void;
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

const useTaskList = () => {
  return useQuery(['tasks'], () => getTasks(), {
    retry: false,
  });
};

const useInstances = () => {
  const { data: taskData, refetch: refetchTasks } = useTaskList();
  const instances = taskData?.data || [];

  return { instances, refetchTasks };
};

const useFilteredInstances = (
  data: { data: StaticApp[] },
  instances: Instance[],
  selectedAppId: string | null,
) => {
  const [filteredInstances, setFilteredInstances] = useState<Instance[]>([]);

  useEffect(() => {
    if (selectedAppId) {
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

const useRefreshConfigListener = (refetchTasks: () => void) => {
  useEffect(() => {
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
  }, [refetchTasks]);
};

export const AppManagerProvider = ({ children }: AppManagerProviderProps) => {
  const [allPlatforms, setAllPlatforms] =
    useState<StaticApp[]>(STATIC_PLATFORM_LIST);
  const [platforms, setPlatforms] = useState<StaticApp[]>(STATIC_PLATFORM_LIST);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    null,
  );
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { instances, refetchTasks } = useInstances();

  useRefreshConfigListener(refetchTasks);

  const data = useMemo(() => ({ data: platforms }), [platforms]);
  const { filteredInstances, setFilteredInstances } = useFilteredInstances(
    data,
    instances,
    selectedAppId,
  );

  const requestPlatforms = useCallback(() => {
    setPlatforms(allPlatforms);
  }, [allPlatforms]);

  const handleSearch = useCallback(
    (searchTerm: string) => {
      const keyword = searchTerm.trim();
      if (!keyword) {
        setPlatforms(allPlatforms);
        return;
      }

      setPlatforms(allPlatforms.filter((app) => app.name.includes(keyword)));
    },
    [allPlatforms],
  );

  const handleSelectApp = useCallback((appId: string) => {
    setSelectedAppId(appId);
    setSelectedInstanceId(null);
  }, []);

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
      isLoading: false,
      isTasksLoading,
      hasRequestedPlatforms: true,
      requestPlatforms,
      selectedAppId,
      setSelectedAppId,
      selectedInstanceId,
      setSelectedInstanceId,
      filteredInstances,
      isSettingsOpen,
      setIsSettingsOpen,
      handleSearch,
      handleSelectApp,
      handleDelete,
      handleAddTask,
      instances,
    }),
    [
      data,
      isTasksLoading,
      requestPlatforms,
      selectedAppId,
      selectedInstanceId,
      filteredInstances,
      isSettingsOpen,
      instances,
      handleSearch,
      handleSelectApp,
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
