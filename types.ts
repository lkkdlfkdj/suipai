export type CameraMode = 'auto' | 'pro';

// Expanded scene list based on requirements
export type SceneType = 'auto' | 'portrait' | 'landscape' | 'night' | 'food' | 'macro' | 'sport' | 'document';

export interface CameraParameters {
  iso: number;
  shutterSpeed: string;
  aperture: string;
  ev: number;
  focusMode: 'auto' | 'face' | 'infinity' | 'macro' | 'continuous';
  isHdrOn?: boolean;
}

export interface SceneConfig {
  id: SceneType;
  name: string;
  description: string;
  defaultParams: CameraParameters;
  guides: {
    composition: string[];
    lighting: string[];
    operation: string[];
  };
}

export type GridType = 'none' | 'thirds' | 'golden' | 'center';

export interface GuidanceHint {
  id: string;
  text: string;
  type: 'composition' | 'lighting' | 'operation' | 'scene' | 'system';
  priority: number; // 1: High, 2: Medium, 3: Low
}

export interface FilterConfig {
  contrast?: number;
  brightness?: number;
  saturate?: number;
  sepia?: number;
  hueRotate?: number;
  grayscale?: number;
  blur?: number;
  overlayColor?: string;
  overlayOpacity?: number;
}