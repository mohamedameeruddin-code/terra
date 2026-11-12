import cv2
import numpy as np
from typing import Tuple, Dict, Any


def segment_waste_in_roi(roi_bgr: np.ndarray) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
    """
    Robust classical computer vision segmentation for waste within dustbin ROI.
    
    Returns:
        waste_mask: Binary uint8 mask (same H, W as roi_bgr) where 255 = detected waste.
        col_waste_tops: 1D array of highest detected waste Y-coordinate for each column.
        diagnostics: Dictionary with intermediate metrics (contrast, texture_density, etc.)
    """
    rh, rw = roi_bgr.shape[:2]
    if rh < 10 or rw < 10:
        return np.zeros((rh, rw), dtype=np.uint8), np.full(rw, rh), {}

    # 1. Convert to multiple color spaces
    gray = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2GRAY)
    lab = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2LAB)
    hsv = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2HSV)

    # 2. Estimate background (bin interior wall) characteristics
    # The upper 15% and side margins of the bin interior usually reveal the bin wall color
    wall_sample_top = lab[:max(5, int(rh * 0.15)), :]
    wall_mean_lab = np.mean(wall_sample_top, axis=(0, 1))

    # Color difference in LAB space relative to upper bin interior
    diff_l = lab[:, :, 0].astype(np.float32) - wall_mean_lab[0]
    diff_a = lab[:, :, 1].astype(np.float32) - wall_mean_lab[1]
    diff_b = lab[:, :, 2].astype(np.float32) - wall_mean_lab[2]
    color_dist = np.sqrt(diff_l**2 + diff_a**2 + diff_b**2)
    norm_color_dist = cv2.normalize(color_dist, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    # 3. High-frequency texture / edge energy
    # Waste (plastics, paper, food, wrappers) has high spatial gradient and edges compared to smooth walls
    blurred_gray = cv2.GaussianBlur(gray, (5, 5), 0)
    sobel_x = cv2.Sobel(blurred_gray, cv2.CV_32F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(blurred_gray, cv2.CV_32F, 0, 1, ksize=3)
    grad_mag = np.sqrt(sobel_x**2 + sobel_y**2)
    norm_grad = cv2.normalize(grad_mag, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    # Threshold gradient for texture
    _, texture_mask = cv2.threshold(norm_grad, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # 4. Intensity variance & Otsu on Saturation / Value
    _, val_otsu = cv2.threshold(hsv[:, :, 2], 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    _, sat_otsu = cv2.threshold(hsv[:, :, 1], 35, 255, cv2.THRESH_BINARY)
    _, dist_mask = cv2.threshold(norm_color_dist, 40, 255, cv2.THRESH_BINARY)

    # 5. Multi-cue fusion
    # A pixel is likely waste if it has either:
    # (Texture + Color Contrast) OR (Texture + High Saturation) OR (Strong Color Divergence)
    combined = cv2.bitwise_or(
        cv2.bitwise_and(texture_mask, dist_mask),
        cv2.bitwise_and(dist_mask, sat_otsu)
    )
    combined = cv2.bitwise_or(combined, cv2.bitwise_and(texture_mask, val_otsu))

    # 6. Morphological refinement: close gaps, remove salt-and-pepper noise
    kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    kernel_open = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel_close, iterations=2)
    opened = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel_open, iterations=1)

    # 7. Physical gravity heuristic: waste accumulates from bottom upwards
    # Extract connected components and remove isolated small noise components floating at the top
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(opened, connectivity=8)
    clean_mask = np.zeros_like(opened)

    min_component_area = max(25, int(rh * rw * 0.005))
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        cy = centroids[i][1]
        # Keep significant components or components near the bottom half
        if area >= min_component_area:
            clean_mask[labels == i] = 255

    # 8. Column-wise waste top boundary calculation
    col_waste_tops = np.full(rw, rh, dtype=np.int32)
    for x in range(rw):
        column = clean_mask[:, x]
        waste_indices = np.where(column > 0)[0]
        if len(waste_indices) > 0:
            # First row from top with detected waste
            col_waste_tops[x] = waste_indices[0]

    # Apply 1D median filter across columns to eliminate spurious single-column spikes
    filter_kernel_size = max(5, rw // 15)
    if filter_kernel_size % 2 == 0:
        filter_kernel_size += 1
    
    pad_w = filter_kernel_size // 2
    padded = np.pad(col_waste_tops, pad_w, mode='edge')
    smooth_tops = np.empty_like(col_waste_tops)
    for i in range(rw):
        smooth_tops[i] = int(np.median(padded[i:i + filter_kernel_size]))

    # Fill in the final mask up to smooth_tops for solid visual representation
    final_mask = np.zeros_like(clean_mask)
    for x in range(rw):
        y_top = smooth_tops[x]
        if y_top < rh:
            final_mask[y_top:rh, x] = 255

    # Diagnostic stats
    total_pixels = rh * rw
    waste_pixels = int(np.count_nonzero(final_mask))
    pixel_ratio = waste_pixels / float(total_pixels) if total_pixels > 0 else 0.0
    contrast_score = float(np.mean(norm_color_dist))

    diagnostics = {
        "waste_pixel_ratio": pixel_ratio,
        "texture_mean": float(np.mean(norm_grad)),
        "color_contrast_mean": contrast_score,
        "smooth_tops_median": float(np.median(smooth_tops)),
        "rh": rh,
        "rw": rw
    }

    return final_mask, smooth_tops, diagnostics

