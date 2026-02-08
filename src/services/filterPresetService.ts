// ============================================
// 滤镜预设服务 - 滤镜管理/应用
// ============================================
import { supabase } from '../lib/supabase';
import type { FilterConfig } from '../../types';

export interface FilterPreset {
  id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  category: 'system' | 'custom' | 'popular';
  filter_config: FilterConfig;
  preview_image_url: string | null;
  use_count: number;
  is_public: boolean;
  is_system: boolean;
  created_at: string;
}

/**
 * 获取所有系统预设滤镜
 */
export const getSystemPresets = async (): Promise<{ presets: FilterPreset[]; error: Error | null }> => {
  const { data, error } = await supabase
    .from('filter_presets')
    .select('*')
    .eq('is_system', true)
    .order('use_count', { ascending: false });

  if (error) {
    return { presets: [], error };
  }

  return { presets: (data || []) as FilterPreset[], error: null };
};

/**
 * 获取用户的自定义滤镜
 */
export const getUserPresets = async (
  userId: string
): Promise<{ presets: FilterPreset[]; error: Error | null }> => {
  const { data, error } = await supabase
    .from('filter_presets')
    .select('*')
    .eq('created_by', userId)
    .eq('is_system', false)
    .order('created_at', { ascending: false });

  if (error) {
    return { presets: [], error };
  }

  return { presets: (data || []) as FilterPreset[], error: null };
};

/**
 * 获取所有可用的滤镜（系统 + 用户自定义 + 公开滤镜）
 */
export const getAllAvailablePresets = async (
  userId: string
): Promise<{ presets: FilterPreset[]; error: Error | null }> => {
  const { data, error } = await supabase
    .from('filter_presets')
    .select('*')
    .or(`is_system.eq.true,and(is_public.eq.true,created_by.neq.${userId}),created_by.eq.${userId}`)
    .order('is_system', { ascending: false })
    .order('use_count', { ascending: false });

  if (error) {
    return { presets: [], error };
  }

  return { presets: (data || []) as FilterPreset[], error: null };
};

/**
 * 创建自定义滤镜预设
 */
export const createPreset = async (
  userId: string,
  name: string,
  filterConfig: FilterConfig,
  options?: {
    description?: string;
    isPublic?: boolean;
    previewImageUrl?: string;
  }
): Promise<{ preset: FilterPreset | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from('filter_presets')
    .insert({
      created_by: userId,
      name,
      description: options?.description || null,
      category: 'custom',
      filter_config: filterConfig as any,
      is_public: options?.isPublic || false,
      preview_image_url: options?.previewImageUrl || null,
    })
    .select()
    .single();

  if (error) {
    return { preset: null, error };
  }

  return { preset: data as FilterPreset, error: null };
};

/**
 * 更新滤镜预设
 */
export const updatePreset = async (
  userId: string,
  presetId: string,
  updates: Partial<Omit<FilterPreset, 'id' | 'created_by' | 'is_system' | 'created_at'>>
): Promise<{ success: boolean; error: Error | null }> => {
  const { error } = await supabase
    .from('filter_presets')
    .update(updates)
    .eq('id', presetId)
    .eq('created_by', userId);

  return {
    success: !error,
    error: error as Error | null,
  };
};

/**
 * 删除滤镜预设
 */
export const deletePreset = async (
  userId: string,
  presetId: string
): Promise<{ success: boolean; error: Error | null }> => {
  const { error } = await supabase
    .from('filter_presets')
    .delete()
    .eq('id', presetId)
    .eq('created_by', userId);

  return {
    success: !error,
    error: error as Error | null,
  };
};

/**
 * 增加滤镜使用计数
 */
export const incrementPresetUseCount = async (presetId: string): Promise<void> => {
  try {
    await supabase.rpc('increment_preset_use_count', { preset_id: presetId });
  } catch (error) {
    console.error('增加滤镜使用计数失败:', error);
  }
};

/**
 * 应用滤镜预设到图片
 */
export const applyPresetToImage = async (
  imageData: string,
  presetId: string
): Promise<{ filterConfig: FilterConfig | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from('filter_presets')
    .select('filter_config')
    .eq('id', presetId)
    .single();

  if (error || !data) {
    return { filterConfig: null, error: error || new Error('滤镜预设不存在') };
  }

  // 增加使用计数
  await incrementPresetUseCount(presetId);

  return { filterConfig: data.filter_config as FilterConfig, error: null };
};

/**
 * 获取热门滤镜
 */
export const getPopularPresets = async (
  limit: number = 10
): Promise<{ presets: FilterPreset[]; error: Error | null }> => {
  const { data, error } = await supabase
    .from('filter_presets')
    .select('*')
    .or('is_system.eq.true,is_public.eq.true')
    .order('use_count', { ascending: false })
    .limit(limit);

  if (error) {
    return { presets: [], error };
  }

  return { presets: (data || []) as FilterPreset[], error: null };
};

/**
 * 搜索滤镜预设
 */
export const searchPresets = async (
  query: string,
  userId: string
): Promise<{ presets: FilterPreset[]; error: Error | null }> => {
  const { data, error } = await supabase
    .from('filter_presets')
    .select('*')
    .or(`is_system.eq.true,and(is_public.eq.true,created_by.neq.${userId}),created_by.eq.${userId}`)
    .ilike('name', `%${query}%`)
    .order('is_system', { ascending: false })
    .limit(20);

  if (error) {
    return { presets: [], error };
  }

  return { presets: (data || []) as FilterPreset[], error: null };
};

/**
 * 复制系统滤镜为用户自定义
 */
export const duplicatePreset = async (
  userId: string,
  presetId: string,
  newName?: string
): Promise<{ preset: FilterPreset | null; error: Error | null }> => {
  try {
    // 1. 获取原滤镜配置
    const { data: original } = await supabase
      .from('filter_presets')
      .select('*')
      .eq('id', presetId)
      .single();

    if (!original) {
      throw new Error('滤镜预设不存在');
    }

    // 2. 创建副本
    const { data, error } = await supabase
      .from('filter_presets')
      .insert({
        created_by: userId,
        name: newName || `${original.name} (副本)`,
        description: original.description,
        category: 'custom',
        filter_config: original.filter_config,
        is_public: false,
        preview_image_url: original.preview_image_url,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { preset: data as FilterPreset, error: null };
  } catch (error) {
    return { preset: null, error: error as Error };
  }
};
