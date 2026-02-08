// ============================================
// 认证状态 Hook
// ============================================
import { useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  getCurrentUser,
  getSession,
  onAuthStateChange,
  signIn,
  signUp,
  signOut,
  getProfile,
  type Profile,
} from '../services';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // 初始化认证状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        const [session, user] = await Promise.all([
          getSession(),
          getCurrentUser(),
        ]);

        let profile = null;
        if (user) {
          profile = await getProfile(user.id);
        }

        setState({
          user,
          session,
          profile,
          isLoading: false,
          isAuthenticated: !!user,
        });
      } catch (error) {
        console.error('初始化认证状态失败:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    // 监听认证状态变化
    const subscription = onAuthStateChange((user, session) => {
      setState(prev => ({
        ...prev,
        user,
        session,
        isAuthenticated: !!user,
      }));

      // 用户登录时获取资料
      if (user) {
        getProfile(user.id).then(profile => {
          setState(prev => ({ ...prev, profile }));
        });
      } else {
        setState(prev => ({ ...prev, profile: null }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 登录
  const login = useCallback(async (email: string, password: string) => {
    const { user, session, error } = await signIn(email, password);
    
    if (error) {
      return { success: false, error };
    }

    let profile = null;
    if (user) {
      profile = await getProfile(user.id);
    }

    setState({
      user,
      session,
      profile,
      isLoading: false,
      isAuthenticated: !!user,
    });

    return { success: true, error: null };
  }, []);

  // 注册
  const register = useCallback(async (
    email: string,
    password: string,
    metadata?: { display_name?: string }
  ) => {
    const { user, session, error } = await signUp(email, password, metadata);
    
    if (error) {
      return { success: false, error };
    }

    setState(prev => ({
      ...prev,
      user,
      session,
      isAuthenticated: !!user,
    }));

    return { success: true, error: null };
  }, []);

  // 登出
  const logout = useCallback(async () => {
    const { error } = await signOut();
    
    if (!error) {
      setState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }

    return { success: !error, error };
  }, []);

  // 刷新用户资料
  const refreshProfile = useCallback(async () => {
    if (state.user) {
      const profile = await getProfile(state.user.id);
      setState(prev => ({ ...prev, profile }));
      return profile;
    }
    return null;
  }, [state.user]);

  return {
    ...state,
    login,
    register,
    logout,
    refreshProfile,
  };
};
