// ============================================
// 照片库组件 - 展示和管理用户的照片
// ============================================
import React, { useState } from 'react';
import { X, Trash2, Download, FolderPlus, Image as ImageIcon } from 'lucide-react';
import { usePhotos } from '../hooks';
import type { Photo } from '../services';

interface PhotoGalleryProps {
  userId: string | null;
  onClose: () => void;
  onSelectPhoto?: (photo: Photo) => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  userId,
  onClose,
  onSelectPhoto,
}) => {
  const { photos, isLoading, hasMore, remove, getThumbnailUrl, loadMore, refresh } = usePhotos({
    userId,
    limit: 20,
  });

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 删除照片
  const handleDelete = async (photo: Photo) => {
    if (!confirm('确定要删除这张照片吗？')) return;

    setIsDeleting(true);
    const result = await remove(photo.id);
    setIsDeleting(false);

    if (result.success) {
      setSelectedPhoto(null);
    } else {
      alert('删除失败: ' + result.error?.message);
    }
  };

  // 下载照片
  const handleDownload = (photo: Photo) => {
    const url = getThumbnailUrl(photo);
    const link = document.createElement('a');
    link.href = url;
    link.download = `photo-${photo.id}.jpg`;
    link.click();
  };

  // 选择照片
  const handleSelect = (photo: Photo) => {
    if (onSelectPhoto) {
      onSelectPhoto(photo);
      onClose();
    } else {
      setSelectedPhoto(photo);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-white text-lg font-medium">我的照片库</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* 照片网格 */}
      <div className="flex-1 overflow-y-auto p-4">
        {photos.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-white/50">
            <ImageIcon className="w-16 h-16 mb-4" />
            <p>还没有照片</p>
            <p className="text-sm mt-2">拍摄一些照片来填充你的相册吧！</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => handleSelect(photo)}
                  className="aspect-square relative rounded-lg overflow-hidden cursor-pointer group bg-gray-800"
                >
                  <img
                    src={getThumbnailUrl(photo)}
                    alt={`Photo ${photo.id}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* 场景模式标签 */}
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/50 rounded text-[10px] text-white/80">
                    {photo.scene_mode}
                  </div>
                  {/* 悬停遮罩 */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                </div>
              ))}
            </div>

            {/* 加载更多 */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 照片详情弹窗 */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/95 z-60 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full max-h-full flex flex-col">
            {/* 工具栏 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <span>{new Date(selectedPhoto.taken_at).toLocaleString()}</span>
                <span>•</span>
                <span>{selectedPhoto.scene_mode}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedPhoto)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(selectedPhoto)}
                  disabled={isDeleting}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 大图 */}
            <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden">
              <img
                src={getThumbnailUrl(selectedPhoto)}
                alt={`Photo ${selectedPhoto.id}`}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>

            {/* 照片信息 */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-white/70 text-sm">
              <div>
                <span className="text-white/50 block text-xs">ISO</span>
                <span>{(selectedPhoto.camera_params as any)?.iso || 'Auto'}</span>
              </div>
              <div>
                <span className="text-white/50 block text-xs">快门</span>
                <span>{(selectedPhoto.camera_params as any)?.shutterSpeed || 'Auto'}</span>
              </div>
              <div>
                <span className="text-white/50 block text-xs">光圈</span>
                <span>{(selectedPhoto.camera_params as any)?.aperture || 'Auto'}</span>
              </div>
              <div>
                <span className="text-white/50 block text-xs">EV</span>
                <span>{(selectedPhoto.camera_params as any)?.ev || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
