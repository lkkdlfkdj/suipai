// ============================================
// 编辑作品服务 - 作品保存/管理/分享
// ============================================
import { supabase } from '../lib/supabase';
import type { FilterConfig } from '../../types';

export interface EditedWork {
  id: string;
  user_id: string;
  original_photo_id: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  file_size_bytes: number | null;
  filter_config: FilterConfig;
  adjustments: Record<string, any>;
  title: string | null;
  description: string | null;
  tags: string[] | null;
  view_count: number;
  like_count: number;
  is_public: boolean;
  created_at: string;
}

export interface SaveWorkParams {
  originalPhotoId?: string;
  imageData: string; // base64
  filterConfig: FilterConfig;
  adjustments?: Record<string, any>;
  title?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

/**
 * 保存编辑后的作品
 */
export const saveEditedWork = async (
  userId: string,
  params: SaveWorkParams
): Promise<{ work: EditedWork | null; error: Error | null }> => {
  try {
    // 1. 将 base64 转换为 Blob
    const base64Response = await fetch(params.imageData);
    const blob = await base64Response.blob();

    // 2. 生成存储路径
    const timestamp = Date.now();
    const storagePath = `${userId}/works/${timestamp}-edited.jpg`;
    const thumbnailPath = `${storagePath}-thumb`;

    // 3. 上传到 Storage
    const { error: uploadError } = await supabase.storage
      .from('edited-works')
      .upload(storagePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (uploadError) {
      throw uploadError;
    }

    // 4. 复制一份作为缩略图
    await supabase.storage
      .from('edited-works')
      .copy(storagePath, thumbnailPath);

    // 5. 插入数据库记录
    const { data: work, error: dbError } = await supabase
      .from('edited_works')
      .insert({
        user_id: userId,
        original_photo_id: params.originalPhotoId || null,
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        file_size_bytes: blob.size,
        filter_config: params.filterConfig as any,
        adjustments: params.adjustments || {},
        title: params.title || null,
        description: params.description || null,
        tags: params.tags || null,
        is_public: params.isPublic || false,
      })
      .select()
      .single();

    if (dbError) {
      // 清理已上传的文件
      await supabase.storage.from('edited-works').remove([storagePath, thumbnailPath]);
      throw dbError;
    }

    // 6. 记录活动日志
    await logActivity(userId, 'photo_edited', 'edited_work', work.id, {
      filter_config: params.filterConfig,
      title: params.title,
    });

    return { work: work as EditedWork, error: null };
  } catch (error) {
    console.error('保存作品失败:', error);
    return { work: null, error: error as Error };
  }
};

/**
 * 获取作品的公开 URL
 */
export const getWorkUrl = (storagePath: string): string => {
  const { data } = supabase.storage.from('edited-works').getPublicUrl(storagePath);
  return data.publicUrl;
};

/**
 * 获取用户的作品列表
 */
export const getUserWorks = async (
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    isPublic?: boolean;
    orderBy?: 'created_at' | 'view_count' | 'like_count';
  }
): Promise<{ works: EditedWork[]; error: Error | null }> => {
  const {
    limit = 50,
    offset = 0,
    isPublic,
    orderBy = 'created_at',
  } = options || {};

  let query = supabase
    .from('edited_works')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order(orderBy, { ascending: false })
    .range(offset, offset + limit - 1);

  if (isPublic !== undefined) {
    query = query.eq('is_public', isPublic);
  }

  const { data, error } = await query;

  if (error) {
    return { works: [], error };
  }

  return { works: (data || []) as EditedWork[], error: null };
};

/**
 * 获取公开作品列表（用于发现页面）
 */
export const getPublicWorks = async (
  options?: {
    limit?: number;
    offset?: number;
    orderBy?: 'created_at' | 'view_count' | 'like_count';
  }
): Promise<{ works: EditedWork[]; error: Error | null }> => {
  const {
    limit = 50,
    offset = 0,
    orderBy = 'created_at',
  } = options || {};

  const { data, error } = await supabase
    .from('edited_works')
    .select('*')
    .eq('is_public', true)
    .eq('is_deleted', false)
    .order(orderBy, { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { works: [], error };
  }

  return { works: (data || []) as EditedWork[], error: null };
};

/**
 * 获取单个作品详情
 */
export const getWorkById = async (
  workId: string
): Promise<{ work: EditedWork | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from('edited_works')
    .select('*')
    .eq('id', workId)
    .eq('is_deleted', false)
    .single();

  if (error) {
    return { work: null, error };
  }

  return { work: data as EditedWork, error: null };
};

/**
 * 更新作品信息
 */
export const updateWork = async (
  userId: string,
  workId: string,
  updates: Partial<Omit<EditedWork, 'id' | 'user_id' | 'storage_path' | 'created_at'>>
): Promise<{ success: boolean; error: Error | null }> => {
  const { error } = await supabase
    .from('edited_works')
    .update(updates)
    .eq('id', workId)
    .eq('user_id', userId);

  return {
    success: !error,
    error: error as Error | null,
  };
};

/**
 * 删除作品
 */
export const deleteWork = async (
  userId: string,
  workId: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // 1. 获取作品信息
    const { data: work } = await supabase
      .from('edited_works')
      .select('storage_path, thumbnail_path')
      .eq('id', workId)
      .eq('user_id', userId)
      .single();

    if (!work) {
      throw new Error('作品不存在');
    }

    // 2. 从 Storage 删除文件
    const pathsToDelete = [work.storage_path];
    if (work.thumbnail_path) {
      pathsToDelete.push(work.thumbnail_path);
    }

    await supabase.storage.from('edited-works').remove(pathsToDelete);

    // 3. 软删除数据库记录
    const { error } = await supabase
      .from('edited_works')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', workId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // 4. 记录活动日志
    await logActivity(userId, 'work_deleted', 'edited_work', workId);

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * 增加作品浏览量
 */
export const incrementViewCount = async (workId: string): Promise<void> => {
  try {
    await supabase.rpc('increment_work_view_count', { work_id: workId });
  } catch (error) {
    console.error('增加浏览量失败:', error);
  }
};

/**
 * 点赞作品
 */
export const likeWork = async (
  userId: string,
  workId: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // 使用 RPC 增加点赞数
    await supabase.rpc('increment_work_like_count', { work_id: workId });

    // 记录活动日志
    await logActivity(userId, 'work_liked', 'edited_work', workId);

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * 分享作品 - 生成分享链接
 */
export const generateShareLink = (workId: string): string => {
  return `${window.location.origin}/share/work/${workId}`;
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
