import { SceneConfig } from './types';

export const SCENES: SceneConfig[] = [
  {
    id: 'auto',
    name: '智能自动',
    description: '自动识别场景，通用优化',
    defaultParams: { iso: 100, shutterSpeed: '1/100s', aperture: 'f/1.8', ev: 0, focusMode: 'auto', isHdrOn: true },
    guides: {
      composition: ['保持手机水平'],
      lighting: ['光线良好'],
      operation: ['轻触屏幕对焦']
    }
  },
  {
    id: 'portrait',
    name: '人像',
    description: '背景虚化，肤色优化',
    defaultParams: { iso: 200, shutterSpeed: '1/200s', aperture: 'f/1.8', ev: +0.3, focusMode: 'face' },
    guides: {
      composition: ['请将人物眼神看向镜头', '适当拉开距离，拍出全身比例', '建议使用三分构图'],
      lighting: ['寻找柔和光线，避免直射', '靠近光源，让面部更明亮'],
      operation: ['请让人物放松表情']
    }
  },
  {
    id: 'landscape',
    name: '风景',
    description: '广角视野，HDR增强',
    defaultParams: { iso: 100, shutterSpeed: '1/1000s', aperture: 'f/8.0', ev: 0, focusMode: 'infinity', isHdrOn: true },
    guides: {
      composition: ['对齐地平线', '建议天空与地面比例1:2', '利用前景增加画面深度'],
      lighting: ['逆光拍摄，已开启HDR', '黄金时刻光影最佳'],
      operation: ['保持手机稳定']
    }
  },
  {
    id: 'night',
    name: '夜景',
    description: '长曝光，多帧降噪',
    defaultParams: { iso: 1600, shutterSpeed: '1/15s', aperture: 'f/1.6', ev: 0, focusMode: 'auto' },
    guides: {
      composition: ['寻找城市光源作为引导线'],
      lighting: ['光线较暗，已自动提升感光度'],
      operation: ['请务必保持手机稳定', '正在进行长曝光，请勿移动']
    }
  },
  {
    id: 'food',
    name: '美食',
    description: '微距细节，色彩诱人',
    defaultParams: { iso: 400, shutterSpeed: '1/100s', aperture: 'f/2.0', ev: +0.5, focusMode: 'macro' },
    guides: {
      composition: ['45度角俯拍最自然', '靠近美食，突出纹理'],
      lighting: ['避免手机阴影遮挡食物'],
      operation: ['已开启微距模式']
    }
  },
  {
    id: 'macro',
    name: '微距',
    description: '极近对焦，细节捕捉',
    defaultParams: { iso: 200, shutterSpeed: '1/120s', aperture: 'f/2.8', ev: 0, focusMode: 'macro' },
    guides: {
      composition: ['保持极近距离(3-5cm)', '突出主体细节'],
      lighting: ['注意补光'],
      operation: ['前后移动寻找最佳对焦点']
    }
  },
  {
    id: 'sport',
    name: '运动',
    description: '高速快门，凝固瞬间',
    defaultParams: { iso: 800, shutterSpeed: '1/1000s', aperture: 'f/2.8', ev: 0, focusMode: 'continuous' },
    guides: {
      composition: ['预留运动空间'],
      lighting: ['保证充足光线'],
      operation: ['建议开启连拍', '跟随物体移动拍摄']
    }
  },
  {
    id: 'document',
    name: '文档',
    description: '去阴影，文字锐化',
    defaultParams: { iso: 200, shutterSpeed: '1/200s', aperture: 'f/4.0', ev: +0.7, focusMode: 'auto' },
    guides: {
      composition: ['请俯视拍摄，保持边缘平行', '确保文档充满画面'],
      lighting: ['避免反光区域'],
      operation: ['已开启去阴影增强']
    }
  }
];