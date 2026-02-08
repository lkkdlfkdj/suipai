-- ============================================
-- LumiCam 专业光影相机 - Supabase 数据库表结构
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 用户表 (使用 Supabase Auth，此处存储扩展信息)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    storage_used_bytes BIGINT DEFAULT 0,
    storage_quota_bytes BIGINT DEFAULT 1073741824, -- 1GB 免费额度
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户创建时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. 照片表 - 存储用户拍摄的原始照片
-- ============================================
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- 存储信息
    storage_path TEXT NOT NULL, -- Supabase Storage 路径
    thumbnail_path TEXT, -- 缩略图路径
    file_size_bytes INTEGER,
    mime_type TEXT DEFAULT 'image/jpeg',
    
    -- 拍摄参数
    scene_mode TEXT DEFAULT 'auto',
    camera_params JSONB DEFAULT '{}',
    
    -- 元数据
    width INTEGER,
    height INTEGER,
    taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location JSONB, -- { lat: number, lng: number, name: string }
    
    -- 状态
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 照片表索引
CREATE INDEX idx_photos_user_id ON public.photos(user_id);
CREATE INDEX idx_photos_taken_at ON public.photos(taken_at DESC);
CREATE INDEX idx_photos_scene_mode ON public.photos(scene_mode);

-- ============================================
-- 3. 编辑作品表 - 用户编辑后的作品
-- ============================================
CREATE TABLE IF NOT EXISTS public.edited_works (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    original_photo_id UUID REFERENCES public.photos(id) ON DELETE SET NULL,
    
    -- 存储信息
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    file_size_bytes INTEGER,
    
    -- 编辑参数
    filter_config JSONB DEFAULT '{}',
    adjustments JSONB DEFAULT '{}',
    
    -- 作品信息
    title TEXT,
    description TEXT,
    tags TEXT[],
    
    -- 统计
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- 状态
    is_public BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 作品表索引
CREATE INDEX idx_edited_works_user_id ON public.edited_works(user_id);
CREATE INDEX idx_edited_works_created_at ON public.edited_works(created_at DESC);
CREATE INDEX idx_edited_works_is_public ON public.edited_works(is_public) WHERE is_public = TRUE;

-- ============================================
-- 4. 相册/文件夹表
-- ============================================
CREATE TABLE IF NOT EXISTS public.albums (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    name TEXT NOT NULL,
    description TEXT,
    cover_photo_id UUID REFERENCES public.photos(id) ON DELETE SET NULL,
    
    -- 统计
    photo_count INTEGER DEFAULT 0,
    
    -- 排序
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 相册照片关联表
CREATE TABLE IF NOT EXISTS public.album_photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(album_id, photo_id)
);

-- ============================================
-- 5. 预设滤镜表
-- ============================================
CREATE TABLE IF NOT EXISTS public.filter_presets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- 创建者 (NULL 表示系统预设)
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'custom', -- system, custom, popular
    
    -- 滤镜配置
    filter_config JSONB NOT NULL,
    preview_image_url TEXT,
    
    -- 统计
    use_count INTEGER DEFAULT 0,
    
    -- 状态
    is_public BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入系统预设滤镜
INSERT INTO public.filter_presets (name, description, category, filter_config, is_system, is_public) VALUES
('原图', '无滤镜效果', 'system', '{}', true, true),
('明亮', '提升亮度和饱和度', 'system', '{"brightness": 110, "saturate": 110}', true, true),
('复古', '暖色调复古风格', 'system', '{"sepia": 30, "contrast": 90, "brightness": 105}', true, true),
('黑白', '经典黑白效果', 'system', '{"grayscale": 100, "contrast": 120}', true, true),
('冷调', '冷色调清新风格', 'system', '{"hueRotate": 180, "saturate": 80, "brightness": 105}', true, true),
('胶片', '模拟胶片质感', 'system', '{"contrast": 110, "saturate": 90, "sepia": 10}', true, true),
('鲜艳', '高饱和度鲜艳风格', 'system', '{"saturate": 150, "contrast": 110}', true, true),
('柔和', '低对比度柔和风格', 'system', '{"contrast": 85, "brightness": 108, "saturate": 95}', true, true);

-- ============================================
-- 6. 用户设置表
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    
    -- 相机设置
    default_scene_mode TEXT DEFAULT 'auto',
    default_grid_type TEXT DEFAULT 'none',
    save_original_photo BOOLEAN DEFAULT TRUE,
    auto_hdr BOOLEAN DEFAULT TRUE,
    
    -- 应用设置
    language TEXT DEFAULT 'zh-CN',
    theme TEXT DEFAULT 'dark',
    
    -- 隐私设置
    auto_backup BOOLEAN DEFAULT FALSE,
    public_profile BOOLEAN DEFAULT FALSE,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户创建时自动创建设置
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- ============================================
-- 7. 活动日志表
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    action_type TEXT NOT NULL, -- photo_taken, photo_edited, photo_deleted, filter_applied, etc.
    entity_type TEXT, -- photo, edited_work, album, etc.
    entity_id UUID,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- ============================================
-- RLS (Row Level Security) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edited_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filter_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles 策略
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Photos 策略
CREATE POLICY "Users can view own photos" ON public.photos
    FOR SELECT USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "Users can insert own photos" ON public.photos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own photos" ON public.photos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos" ON public.photos
    FOR DELETE USING (auth.uid() = user_id);

-- Edited Works 策略
CREATE POLICY "Users can view own works" ON public.edited_works
    FOR SELECT USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "Public works are viewable" ON public.edited_works
    FOR SELECT USING (is_public = TRUE AND is_deleted = FALSE);

CREATE POLICY "Users can insert own works" ON public.edited_works
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own works" ON public.edited_works
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own works" ON public.edited_works
    FOR DELETE USING (auth.uid() = user_id);

-- Albums 策略
CREATE POLICY "Users can manage own albums" ON public.albums
    USING (auth.uid() = user_id);

-- Album Photos 策略
CREATE POLICY "Users can manage own album photos" ON public.album_photos
    USING (auth.uid() = (SELECT user_id FROM public.albums WHERE id = album_id));

-- Filter Presets 策略
CREATE POLICY "System presets are viewable" ON public.filter_presets
    FOR SELECT USING (is_system = TRUE);

CREATE POLICY "Public presets are viewable" ON public.filter_presets
    FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can view own presets" ON public.filter_presets
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can manage own presets" ON public.filter_presets
    USING (created_by = auth.uid());

-- User Settings 策略
CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Activity Logs 策略
CREATE POLICY "Users can view own activity" ON public.activity_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON public.activity_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 存储桶设置
-- ============================================

-- 创建存储桶 (在 Supabase Dashboard 中执行或使用 Storage API)
-- 原始照片存储桶
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', false)
ON CONFLICT (id) DO NOTHING;

-- 编辑作品存储桶
INSERT INTO storage.buckets (id, name, public) 
VALUES ('edited-works', 'edited-works', true)
ON CONFLICT (id) DO NOTHING;

-- 用户头像存储桶
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 辅助函数
-- ============================================

-- 更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要自动更新 updated_at 的表添加触发器
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at
    BEFORE UPDATE ON public.photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_edited_works_updated_at
    BEFORE UPDATE ON public.edited_works
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_albums_updated_at
    BEFORE UPDATE ON public.albums
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
