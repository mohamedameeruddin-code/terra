/**
 * Preprocessing functions for image normalization and resizing
 */

/**
 * Load an image from File/Blob and downscale so the longest side is <= maxSide
 */
export async function loadAndNormalizeImage(fileOrBlob, maxSide = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Downscale if longest side exceeds maxSide
      if (width > maxSide || height > maxSide) {
        if (width >= height) {
          height = Math.round((height * maxSide) / width);
          width = maxSide;
        } else {
          width = Math.round((width * maxSide) / height);
          height = maxSide;
        }
      }

      // Draw onto normalized canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          resolve({
            blob,
            width,
            height,
            canvas,
          });
        },
        'image/jpeg',
        0.88
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for processing.'));
    };

    img.src = url;
  });
}

