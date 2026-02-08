// ============================================
// 照片管理 Hook
// ============================================
import { useState, useEffect, useCallback } from 'react';
import type { SceneType, CameraParameters } from '../../types';
import {
  getUserPhotos,
  uploadPhotoFromBase64,
  deletePhoto,
  getPhotoUrl,
  type Photo,
} from '../services';

interface UsePhotosOptions {
  userId: string | null;
  limit?: number;
  sceneMode?: SceneType;
}

export const usePhotos = (options: UsePhotosOptions) => {
  const { userId, limit = 50, sceneMode } = options;
  
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // 加载照片列表
  const loadPhotos = useCallback(async (reset = false) => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const currentOffset = reset ? 0 : offset;
      
      const { photos: newPhotos, error } = await getUserPhotos(userId, {
        limit,
        offset: currentOffset,
        sceneMode,
      });

      if (error) {
        throw error;
      }

      if (reset) {
        setPhotos(newPhotos);
        setOffset(limit);
      } else {
        setPhotos(prev => [...prev, ...newPhotos]);
        setOffset(currentOffset + limit);
      }

      setHasMore(newPhotos.length === limit);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit, sceneMode, offset]);

  // 初始加载
  useEffect(() => {
    if (userId) {
      loadPhotos(true);
    }
  }, [userId, sceneMode]);

  // 上传照片
  const upload = useCallback(async (
    imageData: string,
    sceneMode: SceneType,
    cameraParams: CameraParameters,
    options?: {
      location?: { lat: number; lng: number; name?: string };
      width?: number;
      height?: number;
    }
  ) => {
    if (!userId) {
      return { photo: null, error: new Error('用户未登录') };
    }

    setIsLoading(true);

    try {
      const result = await uploadPhotoFromBase64(userId, imageData, {
        sceneMode,
        cameraParams,
        ...options,
      });

      if (result.error) {
        throw result.error;
      }

      // 添加到列表开头
      if (result.photo) {
        setPhotos(prev => [result.photo as Photo, ...prev]);
      }

      return result;
    } catch (err) {
      return { photo: null, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 删除照片
  const remove = useCallback(async (photoId: string) => {
    if (!userId) {
      return { success: false, error: new Error('用户未登录') };
    }

    setIsLoading(true);

    try {
      const result = await deletePhoto(userId, photoId);

      if (result.success) {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
      }

      return result;
    } catch (err) {
      return { success: false, error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 获取照片 URL
  const getUrl = useCallback((photo: Photo): string => {
    return getPhotoUrl(photo.storage_path);
  }, []);

  // 获取缩略图 URL
  const getThumbnailUrl = useCallback((photo: Photo): string => {
    if (photo.thumbnail_path) {
      return getPhotoUrl(photo.thumbnail_path);
    }
    return getPhotoUrl(photo.storage_path);
  }, []);

  // 加载更多
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadPhotos(false);
    }
  }, [isLoading, hasMore, loadPhotos]);

  // 刷新
  const refresh = useCallback(() => {
    setOffset(0);
    setHasMore(true);
    loadPhotos(true);
  }, [loadPhotos]);

  return {
    photos,
    isLoading,
    error,
    hasMore,
    upload,
    remove,
    getUrl,
    getThumbnailUrl,
    loadMore,
    refresh,
  };
};
