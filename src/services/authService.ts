// ============================================
// 认证服务 - 用户注册/登录/会话管理
// ============================================
import { supabase } from '../lib/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_premium: boolean;
  storage_used_bytes: number;
  storage_quota_bytes: number;
}

/**
 * 用户注册
 */
export const signUp = async (
  email: string,
  password: string,
  metadata?: { display_name?: string }
): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
};

/**
 * 用户登录
 */
export const signIn = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
};

/**
 * 使用 OTP/魔法链接登录
 */
export const signInWithOtp = async (email: string): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { error };
};

/**
 * 第三方登录 - Google
 */
export const signInWithGoogle = async (): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { error };
};

/**
 * 用户登出
 */
export const signOut = async (): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

/**
 * 获取当前会话
 */
export const getSession = async (): Promise<Session | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

/**
 * 获取当前用户
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};

/**
 * 获取用户资料
 */
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('获取用户资料失败:', error);
    return null;
  }

  return data;
};

/**
 * 更新用户资料
 */
export const updateProfile = async (
  userId: string,
  updates: Partial<Omit<Profile, 'id'>>
): Promise<{ success: boolean; error: Error | null }> => {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return {
    success: !error,
    error: error as Error | null,
  };
};

/**
 * 上传用户头像
 */
export const uploadAvatar = async (
  userId: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    return { url: null, error: uploadError };
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

  // 更新用户资料中的头像 URL
  await updateProfile(userId, { avatar_url: data.publicUrl });

  return { url: data.publicUrl, error: null };
};

/**
 * 监听认证状态变化
 */
export const onAuthStateChange = (
  callback: (user: User | null, session: Session | null) => void
) => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null, session);
  });

  return data.subscription;
};

/**
 * 重置密码
 */
export const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  return { error };
};

/**
 * 更新密码
 */
export const updatePassword = async (
  newPassword: string
): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { error };
};
