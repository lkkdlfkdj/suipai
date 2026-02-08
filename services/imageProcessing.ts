import { FilterConfig } from '../types';

/**
 * Applies the selected filter configuration to a source image and returns a base64 string.
 * This simulates the "AI" processing by using Canvas API for heavy color manipulation.
 */
export const processImage = async (
  imageSrc: string,
  filter: FilterConfig
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      // 1. Draw base image
      ctx.drawImage(img, 0, 0);

      // 2. Apply CSS-like filters using globalCompositeOperation or filter prop if supported
      // Note: context.filter is supported in modern browsers
      const filterString = [
        `contrast(${filter.contrast || 100}%)`,
        `brightness(${filter.brightness || 100}%)`,
        `saturate(${filter.saturate || 100}%)`,
        `sepia(${filter.sepia || 0}%)`,
        `hue-rotate(${filter.hueRotate || 0}deg)`,
        `grayscale(${filter.grayscale || 0}%)`,
        `blur(${filter.blur || 0}px)`
      ].join(' ');

      ctx.filter = filterString;
      // Clear and redraw with filter
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      ctx.filter = 'none'; // Reset

      // 3. Apply color overlays (for tints)
      if (filter.overlayColor) {
        ctx.globalCompositeOperation = 'overlay'; // or 'soft-light'
        ctx.fillStyle = filter.overlayColor;
        ctx.globalAlpha = filter.overlayOpacity || 0.2;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
      }

      // 4. Special logic for "Pixel" or "Sketch" could go here (omitted for brevity)
      
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = (e) => reject(e);
    img.src = imageSrc;
  });
};

/**
 * Crop the image center-square or return original aspect
 */
export const cropImage = async (imageSrc: string, aspectRatio: number): Promise<string> => {
    // Simple placeholder for crop logic if needed later
    return imageSrc; 
}