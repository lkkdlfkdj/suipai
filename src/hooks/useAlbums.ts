// ============================================
// 相册管理 Hook
// ============================================
import { useState, useEffect, useCallback } from 'react';
import {
  getUserAlbums,
  createAlbum,
  deleteAlbum,
  addPhotoToAlbum,
  removePhotoFromAlbum,
  type Album,
  type AlbumWithPhotos,
} from '../services';

interface UseAlbumsOptions {
  userId: string | null;
}

export const useAlbums = (options: UseAlbumsOptions) => {
  const { userId } = options;
  
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 加载相册列表
  const loadAlbums = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { albums: newAlbums, error } = await getUserAlbums(userId);

      if (error) {
        throw error;
      }

      setAlbums(newAlbums);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 初始加载
  useEffect(() => {
    if (userId) {
      loadAlbums();
    }
  }, [userId, loadAlbums]);

  // 创建相册
  const create = useCallback(async (name: string, description?: string) => {
    if (!userId) {
      return { album: null, error: new Error('用户未登录') };
    }

    setIsLoading(true);

    try {
      const result = await createAlbum(userId, name, description);

      if (result.album) {
        setAlbums(prev => [...prev, result.album as Album]);
      }

      return result;
    } catch (err) {
      return { album: null, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 删除相册
  const remove = useCallback(async (albumId: string) => {
    if (!userId) {
      return { success: false, error: new Error('用户未登录') };
    }

    setIsLoading(true);

    try {
      const result = await deleteAlbum(userId, albumId);

      if (result.success) {
        setAlbums(prev => prev.filter(a => a.id !== albumId));
      }

      return result;
    } catch (err) {
      return { success: false, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 添加照片到相册
  const addPhoto = useCallback(async (albumId: string, photoId: string) => {
    if (!userId) {
      return { success: false, error: new Error('用户未登录') };
    }

    return addPhotoToAlbum(userId, albumId, photoId);
  }, [userId]);

  // 从相册移除照片
  const removePhoto = useCallback(async (albumId: string, photoId: string) => {
    if (!userId) {
      return { success: false, error: new Error('用户未登录') };
    }

    return removePhotoFromAlbum(userId, albumId, photoId);
  }, [userId]);

  // 刷新
  const refresh = useCallback(() => {
    loadAlbums();
  }, [loadAlbums]);

  return {
    albums,
    isLoading,
    error,
    create,
    remove,
    addPhoto,
    removePhoto,
    refresh,
  };
};
