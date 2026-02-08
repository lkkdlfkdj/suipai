// ============================================
// Supabase 数据库类型定义
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          is_premium: boolean;
          storage_used_bytes: number;
          storage_quota_bytes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          is_premium?: boolean;
          storage_used_bytes?: number;
          storage_quota_bytes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          is_premium?: boolean;
          storage_used_bytes?: number;
          storage_quota_bytes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      photos: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          thumbnail_path: string | null;
          file_size_bytes: number | null;
          mime_type: string;
          scene_mode: string;
          camera_params: Json;
          width: number | null;
          height: number | null;
          taken_at: string;
          location: Json | null;
          is_deleted: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          storage_path: string;
          thumbnail_path?: string | null;
          file_size_bytes?: number | null;
          mime_type?: string;
          scene_mode?: string;
          camera_params?: Json;
          width?: number | null;
          height?: number | null;
          taken_at?: string;
          location?: Json | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          storage_path?: string;
          thumbnail_path?: string | null;
          file_size_bytes?: number | null;
          mime_type?: string;
          scene_mode?: string;
          camera_params?: Json;
          width?: number | null;
          height?: number | null;
          taken_at?: string;
          location?: Json | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      edited_works: {
        Row: {
          id: string;
          user_id: string;
          original_photo_id: string | null;
          storage_path: string;
          thumbnail_path: string | null;
          file_size_bytes: number | null;
          filter_config: Json;
          adjustments: Json;
          title: string | null;
          description: string | null;
          tags: string[] | null;
          view_count: number;
          like_count: number;
          is_public: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          original_photo_id?: string | null;
          storage_path: string;
          thumbnail_path?: string | null;
          file_size_bytes?: number | null;
          filter_config?: Json;
          adjustments?: Json;
          title?: string | null;
          description?: string | null;
          tags?: string[] | null;
          view_count?: number;
          like_count?: number;
          is_public?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          original_photo_id?: string | null;
          storage_path?: string;
          thumbnail_path?: string | null;
          file_size_bytes?: number | null;
          filter_config?: Json;
          adjustments?: Json;
          title?: string | null;
          description?: string | null;
          tags?: string[] | null;
          view_count?: number;
          like_count?: number;
          is_public?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      albums: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          cover_photo_id: string | null;
          photo_count: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          cover_photo_id?: string | null;
          photo_count?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          cover_photo_id?: string | null;
          photo_count?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      album_photos: {
        Row: {
          id: string;
          album_id: string;
          photo_id: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          album_id: string;
          photo_id: string;
          added_at?: string;
        };
        Update: {
          id?: string;
          album_id?: string;
          photo_id?: string;
          added_at?: string;
        };
      };
      filter_presets: {
        Row: {
          id: string;
          created_by: string | null;
          name: string;
          description: string | null;
          category: string;
          filter_config: Json;
          preview_image_url: string | null;
          use_count: number;
          is_public: boolean;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          created_by?: string | null;
          name: string;
          description?: string | null;
          category?: string;
          filter_config: Json;
          preview_image_url?: string | null;
          use_count?: number;
          is_public?: boolean;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string | null;
          name?: string;
          description?: string | null;
          category?: string;
          filter_config?: Json;
          preview_image_url?: string | null;
          use_count?: number;
          is_public?: boolean;
          is_system?: boolean;
          created_at?: string;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          default_scene_mode: string;
          default_grid_type: string;
          save_original_photo: boolean;
          auto_hdr: boolean;
          language: string;
          theme: string;
          auto_backup: boolean;
          public_profile: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          default_scene_mode?: string;
          default_grid_type?: string;
          save_original_photo?: boolean;
          auto_hdr?: boolean;
          language?: string;
          theme?: string;
          auto_backup?: boolean;
          public_profile?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          default_scene_mode?: string;
          default_grid_type?: string;
          save_original_photo?: boolean;
          auto_hdr?: boolean;
          language?: string;
          theme?: string;
          auto_backup?: boolean;
          public_profile?: boolean;
          updated_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          action_type: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
