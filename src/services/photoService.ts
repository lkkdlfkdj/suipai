// ============================================
// 照片服务 - 照片上传/下载/管理
// ============================================
import { supabase } from '../lib/supabase';
import type { CameraParameters, SceneType } from '../../types';

export interface Photo {
  id: string;
  user_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  file_size_bytes: number | null;
  mime_type: string;
  scene_mode: SceneType;
  camera_params: CameraParameters;
  width: number | null;
  height: number | null;
  taken_at: string;
  location: { lat: number; lng: number; name?: string } | null;
  created_at: string;
}

export interface UploadPhotoParams {
  file: File | Blob;
  sceneMode: SceneType;
  cameraParams: CameraParameters;
  location?: { lat: number; lng: number; name?: string };
  width?: number;
  height?: number;
}

/**
 * 生成存储路径
 */
const generateStoragePath = (userId: string, fileName: string): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = Date.now();
  
  return `${userId}/${year}/${month}/${day}/${timestamp}-${fileName}`;
};

/**
 * 上传照片到 Supabase Storage
 */
export const uploadPhoto = async (
  userId: string,
  params: UploadPhotoParams
): Promise<{ photo: Photo | null; error: Error | null }> => {
  try {
    // 1. 上传文件到 Storage
    const fileName = params.file instanceof File 
      ? params.file.name 
      : `photo-${Date.now()}.jpg`;
    const storagePath = generateStoragePath(userId, fileName);

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(storagePath, params.file, {
        contentType: params.file.type || 'image/jpeg',
        cacheControl: '3600',
      });

    if (uploadError) {
      throw uploadError;
    }

    // 2. 创建缩略图 (简单处理：使用原图作为缩略图，实际项目中可以生成真正的缩略图)
    const thumbnailPath = `${storagePath}-thumb`;
    await supabase.storage
      .from('photos')
      .copy(storagePath, thumbnailPath);

    // 3. 获取文件大小
    const fileSize = params.file instanceof File 
      ? params.file.size 
      : (params.file as Blob).size;

    // 4. 插入数据库记录
    const { data: photo, error: dbError } = await supabase
      .from('photos')
      .insert({
        user_id: userId,
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        file_size_bytes: fileSize,
        mime_type: params.file.type || 'image/jpeg',
        scene_mode: params.sceneMode,
        camera_params: params.cameraParams as any,
        width: params.width || null,
        height: params.height || null,
        location: params.location || null,
      })
      .select()
      .single();

    if (dbError) {
      // 如果数据库插入失败，删除已上传的文件
      await supabase.storage.from('photos').remove([storagePath, thumbnailPath]);
      throw dbError;
    }

    // 5. 记录活动日志
    await logActivity(userId, 'photo_taken', 'photo', photo.id, {
      scene_mode: params.sceneMode,
      file_size: fileSize,
    });

    return { photo: photo as Photo, error: null };
  } catch (error) {
    console.error('上传照片失败:', error);
    return { photo: null, error: error as Error };
  }
};

/**
 * 从 base64 上传照片
 */
export const uploadPhotoFromBase64 = async (
  userId: string,
  base64Data: string,
  params: Omit<UploadPhotoParams, 'file'>
): Promise<{ photo: Photo | null; error: Error | null }> => {
  try {
    // 将 base64 转换为 Blob
    const base64Response = await fetch(base64Data);
    const blob = await base64Response.blob();

    return uploadPhoto(userId, {
      ...params,
      file: blob,
    });
  } catch (error) {
    console.error('从 base64 上传照片失败:', error);
    return { photo: null, error: error as Error };
  }
};

/**
 * 获取照片的公开 URL
 */
export const getPhotoUrl = (storagePath: string): string => {
  const { data } = supabase.storage.from('photos').getPublicUrl(storagePath);
  return data.publicUrl;
};

/**
 * 获取照片的签名 URL（用于私有访问）
 */
export const getPhotoSignedUrl = async (
  storagePath: string,
  expiresIn: number = 3600
): Promise<{ url: string | null; error: Error | null }> => {
  const { data, error } = await supabase.storage
    .from('photos')
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    return { url: null, error };
  }

  return { url: data.signedUrl, error: null };
};

/**
 * 获取用户的照片列表
 */
export const getUserPhotos = async (
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    sceneMode?: SceneType;
    orderBy?: 'taken_at' | 'created_at';
    orderDirection?: 'asc' | 'desc';
  }
): Promise<{ photos: Photo[]; error: Error | null }> => {
  const {
    limit = 50,
    offset = 0,
    sceneMode,
    orderBy = 'taken_at',
    orderDirection = 'desc',
  } = options || {};

  let query = supabase
    .from('photos')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .range(offset, offset + limit - 1);

  if (sceneMode) {
    query = query.eq('scene_mode', sceneMode);
  }

  const { data, error } = await query;

  if (error) {
    return { photos: [], error };
  }

  return { photos: (data || []) as Photo[], error: null };
};

/**
 * 获取单张照片详情
 */
export const getPhotoById = async (
  photoId: string
): Promise<{ photo: Photo | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('id', photoId)
    .eq('is_deleted', false)
    .single();

  if (error) {
    return { photo: null, error };
  }

  return { photo: data as Photo, error: null };
};

/**
 * 软删除照片
 */
export const deletePhoto = async (
  userId: string,
  photoId: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('photos')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', photoId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // 记录活动日志
    await logActivity(userId, 'photo_deleted', 'photo', photoId);

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * 永久删除照片
 */
export const permanentlyDeletePhoto = async (
  userId: string,
  photoId: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // 1. 获取照片信息
    const { data: photo } = await supabase
      .from('photos')
      .select('storage_path, thumbnail_path')
      .eq('id', photoId)
      .eq('user_id', userId)
      .single();

    if (!photo) {
      throw new Error('照片不存在');
    }

    // 2. 从 Storage 删除文件
    const pathsToDelete = [photo.storage_path];
    if (photo.thumbnail_path) {
      pathsToDelete.push(photo.thumbnail_path);
    }

    await supabase.storage.from('photos').remove(pathsToDelete);

    // 3. 从数据库删除记录
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * 更新照片信息
 */
export const updatePhoto = async (
  userId: string,
  photoId: string,
  updates: Partial<Omit<Photo, 'id' | 'user_id' | 'storage_path' | 'created_at'>>
): Promise<{ success: boolean; error: Error | null }> => {
  const { error } = await supabase
    .from('photos')
    .update(updates)
    .eq('id', photoId)
    .eq('user_id', userId);

  return {
    success: !error,
    error: error as Error | null,
  };
};

/**
 * 获取用户的存储使用情况
 */
export const getStorageUsage = async (
  userId: string
): Promise<{ used: number; quota: number; error: Error | null }> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('storage_used_bytes, storage_quota_bytes')
    .eq('id', userId)
    .single();

  if (error) {
    return { used: 0, quota: 1073741824, error };
  }

  return {
    used: data.storage_used_bytes,
    quota: data.storage_quota_bytes,
    error: null,
  };
};

/**
 * 记录活动日志
 */
const logActivity = async (
  userId: string,
  actionType: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action_type: actionType,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error('记录活动日志失败:', error);
  }
};
