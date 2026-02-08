// ============================================
// 滤镜预设 Hook
// ============================================
import { useState, useEffect, useCallback } from 'react';
import type { FilterConfig } from '../../types';
import {
  getSystemPresets,
  getUserPresets,
  getAllAvailablePresets,
  createPreset,
  deletePreset,
  type FilterPreset,
} from '../services';

interface UseFilterPresetsOptions {
  userId: string | null;
}

export const useFilterPresets = (options: UseFilterPresetsOptions) => {
  const { userId } = options;
  
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [systemPresets, setSystemPresets] = useState<FilterPreset[]>([]);
  const [userPresets, setUserPresets] = useState<FilterPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 加载滤镜预设
  const loadPresets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 加载系统预设
      const { presets: sysPresets, error: sysError } = await getSystemPresets();
      if (sysError) throw sysError;
      setSystemPresets(sysPresets);

      // 加载用户自定义预设
      if (userId) {
        const { presets: usrPresets, error: usrError } = await getUserPresets(userId);
        if (usrError) throw usrError;
        setUserPresets(usrPresets);
        
        // 合并所有可用预设
        const { presets: allPresets, error: allError } = await getAllAvailablePresets(userId);
        if (allError) throw allError;
        setPresets(allPresets);
      } else {
        setPresets(sysPresets);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 初始加载
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // 创建自定义滤镜
  const create = useCallback(async (
    name: string,
    filterConfig: FilterConfig,
    options?: {
      description?: string;
      isPublic?: boolean;
    }
  ) => {
    if (!userId) {
      return { preset: null, error: new Error('用户未登录') };
    }

    setIsLoading(true);

    try {
      const result = await createPreset(userId, name, filterConfig, options);

      if (result.preset) {
        setUserPresets(prev => [result.preset as FilterPreset, ...prev]);
        setPresets(prev => [result.preset as FilterPreset, ...prev]);
      }

      return result;
    } catch (err) {
      return { preset: null, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 删除滤镜预设
  const remove = useCallback(async (presetId: string) => {
    if (!userId) {
      return { success: false, error: new Error('用户未登录') };
    }

    setIsLoading(true);

    try {
      const result = await deletePreset(userId, presetId);

      if (result.success) {
        setUserPresets(prev => prev.filter(p => p.id !== presetId));
        setPresets(prev => prev.filter(p => p.id !== presetId));
      }

      return result;
    } catch (err) {
      return { success: false, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 根据 ID 获取滤镜配置
  const getPresetById = useCallback((presetId: string): FilterPreset | undefined => {
    return presets.find(p => p.id === presetId);
  }, [presets]);

  // 刷新
  const refresh = useCallback(() => {
    loadPresets();
  }, [loadPresets]);

  return {
    presets,
    systemPresets,
    userPresets,
    isLoading,
    error,
    create,
    remove,
    getPresetById,
    refresh,
  };
};
