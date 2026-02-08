// ============================================
// 编辑作品 Hook
// ============================================
import { useState, useCallback } from 'react';
import type { FilterConfig } from '../../types';
import {
  saveEditedWork,
  getUserWorks,
  deleteWork,
  getWorkUrl,
  type EditedWork,
} from '../services';

interface UseEditedWorksOptions {
  userId: string | null;
}

export const useEditedWorks = (options: UseEditedWorksOptions) => {
  const { userId } = options;
  
  const [works, setWorks] = useState<EditedWork[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 保存作品
  const save = useCallback(async (
    imageData: string,
    filterConfig: FilterConfig,
    options?: {
      originalPhotoId?: string;
      title?: string;
      description?: string;
      tags?: string[];
      isPublic?: boolean;
    }
  ) => {
    if (!userId) {
      return { work: null, error: new Error('用户未登录') };
    }

    setIsLoading(true);

    try {
      const result = await saveEditedWork(userId, {
        imageData,
        filterConfig,
        ...options,
      });

      if (result.work) {
        setWorks(prev => [result.work as EditedWork, ...prev]);
      }

      return result;
    } catch (err) {
      return { work: null, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 加载用户作品
  const loadWorks = useCallback(async (options?: {
    isPublic?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { works: newWorks, error } = await getUserWorks(userId, options);

      if (error) {
        throw error;
      }

      setWorks(newWorks);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 删除作品
  const remove = useCallback(async (workId: string) => {
    if (!userId) {
      return { success: false, error: new Error('用户未登录') };
    }

    setIsLoading(true);

    try {
      const result = await deleteWork(userId, workId);

      if (result.success) {
        setWorks(prev => prev.filter(w => w.id !== workId));
      }

      return result;
    } catch (err) {
      return { success: false, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 获取作品 URL
  const getUrl = useCallback((work: EditedWork): string => {
    return getWorkUrl(work.storage_path);
  }, []);

  // 获取缩略图 URL
  const getThumbnailUrl = useCallback((work: EditedWork): string => {
    if (work.thumbnail_path) {
      return getWorkUrl(work.thumbnail_path);
    }
    return getWorkUrl(work.storage_path);
  }, []);

  return {
    works,
    isLoading,
    error,
    save,
    loadWorks,
    remove,
    getUrl,
    getThumbnailUrl,
  };
};
