// ============================================
// 用户设置服务 - 设置管理
// ============================================
import { supabase } from '../lib/supabase';
import type { SceneType, GridType } from '../../types';

export interface UserSettings {
  user_id: string;
  default_scene_mode: SceneType;
  default_grid_type: GridType;
  save_original_photo: boolean;
  auto_hdr: boolean;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  auto_backup: boolean;
  public_profile: boolean;
}

/**
 * 获取用户设置
 */
export const getUserSettings = async (
  userId: string
): Promise<{ settings: UserSettings | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    return { settings: null, error };
  }

  return { settings: data as UserSettings, error: null };
};

/**
 * 更新用户设置
 */
export const updateUserSettings = async (
  userId: string,
  updates: Partial<Omit<UserSettings, 'user_id'>>
): Promise<{ success: boolean; error: Error | null }> => {
  const { error } = await supabase
    .from('user_settings')
    .update(updates)
    .eq('user_id', userId);

  return {
    success: !error,
    error: error as Error | null,
  };
};

/**
 * 更新默认场景模式
 */
export const updateDefaultSceneMode = async (
  userId: string,
  sceneMode: SceneType
): Promise<{ success: boolean; error: Error | null }> => {
  return updateUserSettings(userId, { default_scene_mode: sceneMode });
};

/**
 * 更新默认网格类型
 */
export const updateDefaultGridType = async (
  userId: string,
  gridType: GridType
): Promise<{ success: boolean; error: Error | null }> => {
  return updateUserSettings(userId, { default_grid_type: gridType });
};

/**
 * 切换保存原图设置
 */
export const toggleSaveOriginalPhoto = async (
  userId: string,
  save: boolean
): Promise<{ success: boolean; error: Error | null }> => {
  return updateUserSettings(userId, { save_original_photo: save });
};

/**
 * 切换自动 HDR
 */
export const toggleAutoHdr = async (
  userId: string,
  enabled: boolean
): Promise<{ success: boolean; error: Error | null }> => {
  return updateUserSettings(userId, { auto_hdr: enabled });
};

/**
 * 切换自动备份
 */
export const toggleAutoBackup = async (
  userId: string,
  enabled: boolean
): Promise<{ success: boolean; error: Error | null }> => {
  return updateUserSettings(userId, { auto_backup: enabled });
};

/**
 * 更新主题
 */
export const updateTheme = async (
  userId: string,
  theme: 'light' | 'dark' | 'auto'
): Promise<{ success: boolean; error: Error | null }> => {
  return updateUserSettings(userId, { theme });
};

/**
 * 更新语言
 */
export const updateLanguage = async (
  userId: string,
  language: string
): Promise<{ success: boolean; error: Error | null }> => {
  return updateUserSettings(userId, { language });
};

/**
 * 切换公开资料
 */
export const togglePublicProfile = async (
  userId: string,
  isPublic: boolean
): Promise<{ success: boolean; error: Error | null }> => {
  return updateUserSettings(userId, { public_profile: isPublic });
};

/**
 * 初始化用户设置（如果不存在）
 */
export const initializeUserSettings = async (
  userId: string
): Promise<{ settings: UserSettings | null; error: Error | null }> => {
  // 检查是否已存在
  const { data: existing } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    return getUserSettings(userId);
  }

  // 创建默认设置
  const { data, error } = await supabase
    .from('user_settings')
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) {
    return { settings: null, error };
  }

  return { settings: data as UserSettings, error: null };
};
