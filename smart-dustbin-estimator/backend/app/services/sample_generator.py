import os
import cv2
import numpy as np
from app.config import SAMPLE_DIR


def generate_sample_images_if_missing():
    """
    Generates synthetic realistic test images representing bins at different fill stages:
    - Empty (10%)
    - Low (30%)
    - Medium (52%)
    - High (75%)
    - Critical (92%)
    """
    SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

    test_cases = [
        {"filename": "bin_empty.jpg", "fill_level": 0.08, "name": "Empty Dustbin"},
        {"filename": "bin_low_fill.jpg", "fill_level": 0.30, "name": "Low Fill Dustbin"},
        {"filename": "bin_medium_fill.jpg", "fill_level": 0.52, "name": "Medium Fill Dustbin"},
        {"filename": "bin_high_fill.jpg", "fill_level": 0.75, "name": "High Fill Dustbin"},
        {"filename": "bin_critical_overflow.jpg", "fill_level": 0.92, "name": "Critical Fill Dustbin"}
    ]

    for item in test_cases:
        target_path = SAMPLE_DIR / item["filename"]
        if target_path.exists():
            continue

        w, h = 600, 750
        # Background: room/office floor and wall
        img = np.zeros((h, w, 3), dtype=np.uint8)
        # Wall background (neutral warm beige)
        img[0:int(h * 0.75), :] = [215, 222, 220]
        # Floor (subtle tiled floor)
        img[int(h * 0.75):, :] = [180, 190, 185]
        # Floor perspective line
        cv2.line(img, (0, int(h * 0.75)), (w, int(h * 0.75)), (150, 160, 155), 2)

        # Draw Dustbin (tall modern stainless steel / matte dark plastic bin)
        bx = int(w * 0.22)
        by = int(h * 0.16)
        bw = int(w * 0.56)
        bh = int(h * 0.72)

        # Outer bin shadow on floor
        cv2.ellipse(img, (int(w * 0.5), by + bh + 10), (int(bw * 0.55), 25), 0, 0, 360, (130, 140, 135), -1)

        # Outer bin body: trapezoid cylinder
        bin_pts = np.array([
            [bx, by],
            [bx + bw, by],
            [bx + int(bw * 0.92), by + bh],
            [bx + int(bw * 0.08), by + bh]
        ], np.int32)

        # Gradient shading on bin exterior (metallic grey / dark charcoal)
        cv2.fillPoly(img, [bin_pts], (75, 82, 80))
        # Highlight on left side
        cv2.line(img, (bx + int(bw * 0.2), by + 5), (bx + int(bw * 0.24), by + bh - 5), (105, 115, 112), 4)

        # Top Rim / Aperture
        rim_center = (int(bx + bw / 2), by)
        cv2.ellipse(img, rim_center, (int(bw / 2), 35), 0, 0, 360, (55, 60, 58), -1)
        cv2.ellipse(img, rim_center, (int(bw / 2), 35), 0, 0, 360, (120, 130, 125), 3)

        # Inner Bin Wall (view into the opening)
        cv2.ellipse(img, rim_center, (int(bw / 2) - 8, 28), 0, 0, 360, (30, 35, 33), -1)

        # Interior region visible
        fill_ratio = item["fill_level"]
        if fill_ratio > 0.05:
            # Waste rises from bottom upwards
            waste_top_y = int((by + bh) - (bh * fill_ratio * 0.95))
            waste_bottom_y = by + bh - 5

            # Draw multi-colored textured waste pile
            np.random.seed(int(fill_ratio * 1000))
            for y_step in range(waste_bottom_y, waste_top_y, -12):
                col_w = int(bw * 0.75)
                start_x = int(bx + (bw - col_w) / 2)
                for _ in range(12):
                    px = start_x + np.random.randint(0, col_w)
                    py = y_step + np.random.randint(-8, 8)
                    if py < waste_top_y:
                        continue
                    # Random waste colors (crushed cans, cartons, plastics, greens, blues)
                    r_color = (
                        int(np.random.randint(50, 240)),
                        int(np.random.randint(50, 240)),
                        int(np.random.randint(50, 240))
                    )
                    shape_type = np.random.choice(["rect", "circle", "line"])
                    if shape_type == "rect":
                        rw_ = np.random.randint(14, 34)
                        rh_ = np.random.randint(10, 26)
                        cv2.rectangle(img, (px, py), (px + rw_, py + rh_), r_color, -1)
                    elif shape_type == "circle":
                        rad_ = np.random.randint(8, 22)
                        cv2.circle(img, (px, py), rad_, r_color, -1)
                    else:
                        cv2.line(img, (px - 15, py - 10), (px + 15, py + 10), r_color, 4)

            # Add crumpled paper / packaging outlines
            for _ in range(int(fill_ratio * 30)):
                px = int(bx + bw * 0.2 + np.random.randint(0, int(bw * 0.6)))
                py = int(waste_top_y + np.random.randint(0, max(15, waste_bottom_y - waste_top_y)))
                cv2.circle(img, (px, py), np.random.randint(6, 18), (220, 225, 230), -1)
                cv2.circle(img, (px, py), np.random.randint(6, 18), (140, 145, 150), 1)

        # Save to disk
        cv2.imwrite(str(target_path), img)

