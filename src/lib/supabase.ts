// ============================================
// Supabase 客户端配置
// ============================================
import { createClient } from '@supabase/supabase-js';

// 从环境变量获取配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 导出常用类型
export type SupabaseClient = typeof supabase;
