// ============================================
// 相册服务 - 相册创建/管理
// ============================================
import { supabase } from '../lib/supabase';

export interface Album {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_photo_id: string | null;
  photo_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AlbumWithPhotos extends Album {
  photos: Array<{
    id: string;
    storage_path: string;
    thumbnail_path: string | null;
    taken_at: string;
  }>;
}

/**
 * 创建相册
 */
export const createAlbum = async (
  userId: string,
  name: string,
  description?: string
): Promise<{ album: Album | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from('albums')
    .insert({
      user_id: userId,
      name,
      description: description || null,
    })
    .select()
    .single();

  if (error) {
    return { album: null, error };
  }

  return { album: data as Album, error: null };
};

/**
 * 获取用户的所有相册
 */
export const getUserAlbums = async (
  userId: string
): Promise<{ albums: Album[]; error: Error | null }> => {
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return { albums: [], error };
  }

  return { albums: (data || []) as Album[], error: null };
};

/**
 * 获取单个相册详情（包含照片）
 */
export const getAlbumById = async (
  albumId: string
): Promise<{ album: AlbumWithPhotos | null; error: Error | null }> => {
  // 1. 获取相册信息
  const { data: album, error: albumError } = await supabase
    .from('albums')
    .select('*')
    .eq('id', albumId)
    .single();

  if (albumError) {
    return { album: null, error: albumError };
  }

  // 2. 获取相册中的照片
  const { data: albumPhotos, error: photosError } = await supabase
    .from('album_photos')
    .select(`
      photo_id,
      photos:photo_id (
        id,
        storage_path,
        thumbnail_path,
        taken_at
      )
    `)
    .eq('album_id', albumId)
    .order('added_at', { ascending: false });

  if (photosError) {
    return { album: null, error: photosError };
  }

  const photos = (albumPhotos || [])
    .map((ap: any) => ap.photos)
    .filter(Boolean);

  return {
    album: {
      ...album,
      photos,
    } as AlbumWithPhotos,
    error: null,
  };
};

/**
 * 更新相册信息
 */
export const updateAlbum = async (
  userId: string,
  albumId: string,
  updates: Partial<Omit<Album, 'id' | 'user_id' | 'created_at'>>
): Promise<{ success: boolean; error: Error | null }> => {
  const { error } = await supabase
    .from('albums')
    .update(updates)
    .eq('id', albumId)
    .eq('user_id', userId);

  return {
    success: !error,
    error: error as Error | null,
  };
};

/**
 * 删除相册
 */
export const deleteAlbum = async (
  userId: string,
  albumId: string
): Promise<{ success: boolean; error: Error | null }> => {
  const { error } = await supabase
    .from('albums')
    .delete()
    .eq('id', albumId)
    .eq('user_id', userId);

  return {
    success: !error,
    error: error as Error | null,
  };
};

/**
 * 添加照片到相册
 */
export const addPhotoToAlbum = async (
  userId: string,
  albumId: string,
  photoId: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // 1. 验证相册所有权
    const { data: album } = await supabase
      .from('albums')
      .select('id')
      .eq('id', albumId)
      .eq('user_id', userId)
      .single();

    if (!album) {
      throw new Error('相册不存在或无权限');
    }

    // 2. 添加到关联表
    const { error } = await supabase
      .from('album_photos')
      .insert({
        album_id: albumId,
        photo_id: photoId,
      });

    if (error) {
      throw error;
    }

    // 3. 更新相册照片计数
    await updateAlbumPhotoCount(albumId);

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * 从相册移除照片
 */
export const removePhotoFromAlbum = async (
  userId: string,
  albumId: string,
  photoId: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('album_photos')
      .delete()
      .eq('album_id', albumId)
      .eq('photo_id', photoId);

    if (error) {
      throw error;
    }

    // 更新相册照片计数
    await updateAlbumPhotoCount(albumId);

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * 批量添加照片到相册
 */
export const addPhotosToAlbum = async (
  userId: string,
  albumId: string,
  photoIds: string[]
): Promise<{ success: boolean; addedCount: number; error: Error | null }> => {
  try {
    // 验证相册所有权
    const { data: album } = await supabase
      .from('albums')
      .select('id')
      .eq('id', albumId)
      .eq('user_id', userId)
      .single();

    if (!album) {
      throw new Error('相册不存在或无权限');
    }

    // 批量插入
    const inserts = photoIds.map(photoId => ({
      album_id: albumId,
      photo_id: photoId,
    }));

    const { error } = await supabase
      .from('album_photos')
      .insert(inserts);

    if (error) {
      throw error;
    }

    // 更新相册照片计数
    await updateAlbumPhotoCount(albumId);

    return { success: true, addedCount: photoIds.length, error: null };
  } catch (error) {
    return { success: false, addedCount: 0, error: error as Error };
  }
};

/**
 * 设置相册封面
 */
export const setAlbumCover = async (
  userId: string,
  albumId: string,
  photoId: string
): Promise<{ success: boolean; error: Error | null }> => {
  return updateAlbum(userId, albumId, { cover_photo_id: photoId });
};

/**
 * 更新相册照片计数
 */
const updateAlbumPhotoCount = async (albumId: string): Promise<void> => {
  try {
    const { count } = await supabase
      .from('album_photos')
      .select('*', { count: 'exact', head: true })
      .eq('album_id', albumId);

    await supabase
      .from('albums')
      .update({ photo_count: count || 0 })
      .eq('id', albumId);
  } catch (error) {
    console.error('更新相册照片计数失败:', error);
  }
};

/**
 * 重新排序相册
 */
export const reorderAlbums = async (
  userId: string,
  albumOrders: { albumId: string; sortOrder: number }[]
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const updates = albumOrders.map(({ albumId, sortOrder }) =>
      supabase
        .from('albums')
        .update({ sort_order: sortOrder })
        .eq('id', albumId)
        .eq('user_id', userId)
    );

    await Promise.all(updates);

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};
