import os
import cv2
import numpy as np
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.metrics import classification_report, confusion_matrix

from app.services.ml_waste_classifier import (
    extract_public_dustbin_features,
    CLASS_NAMES,
    MODEL_PATH,
    SCALER_PATH,
    MODEL_DIR
)

DATASET_DIR = Path(__file__).resolve().parent / "dataset"
DATASET_DIR.mkdir(parents=True, exist_ok=True)


def generate_synthetic_and_public_samples():
    """
    Creates a robust dataset of public dustbin images across all 5 classes:
    - Empty (clean empty bins, metal/plastic interiors)
    - Low (small amount of waste at bottom)
    - Medium (half full public bins)
    - High (filled near the top)
    - Critical (heaped high, overflowing, bags and cups protruding, litter around)
    """
    for cls in CLASS_NAMES:
        cls_dir = DATASET_DIR / cls.lower()
        cls_dir.mkdir(parents=True, exist_ok=True)

    # Let's generate 40 synthetic augmented samples per class (total 200 samples)
    # with diverse lighting, background variations, and realistic garbage distributions
    np.random.seed(42)

    for cls_idx, cls_name in enumerate(CLASS_NAMES):
        cls_dir = DATASET_DIR / cls_name.lower()
        for i in range(40):
            filename = cls_dir / f"bin_{cls_name.lower()}_{i:03d}.jpg"
            if filename.exists():
                continue

            h, w = 400, 300
            img = np.zeros((h, w, 3), dtype=np.uint8)

            # Street/wall background
            wall_color = [int(np.random.randint(140, 220)) for _ in range(3)]
            floor_color = [int(np.random.randint(90, 160)) for _ in range(3)]
            img[:int(h * 0.7), :] = wall_color
            img[int(h * 0.7):, :] = floor_color

            # Bin body coordinates
            bx, by = int(w * 0.2), int(h * 0.18)
            bw, bh = int(w * 0.6), int(h * 0.68)

            # Bin exterior
            bin_color = [int(np.random.randint(40, 90)) for _ in range(3)]
            cv2.rectangle(img, (bx, by), (bx + bw, by + bh), bin_color, -1)

            # Waste fill range by class
            if cls_name == "Empty":
                fill_ratio = np.random.uniform(0.0, 0.15)
            elif cls_name == "Low":
                fill_ratio = np.random.uniform(0.20, 0.38)
            elif cls_name == "Medium":
                fill_ratio = np.random.uniform(0.42, 0.58)
            elif cls_name == "High":
                fill_ratio = np.random.uniform(0.62, 0.78)
            else:  # Critical / Overflow
                fill_ratio = np.random.uniform(0.85, 1.15)  # Can heap ABOVE the rim!

            if fill_ratio > 0.05:
                waste_top_y = int((by + bh) - (bh * fill_ratio))
                waste_bot_y = by + bh

                # Draw dense multi-colored garbage texture
                for y in range(waste_bot_y, max(10, waste_top_y), -8):
                    for _ in range(14):
                        px = bx + np.random.randint(-10 if fill_ratio > 0.8 else 5, bw + (10 if fill_ratio > 0.8 else -5))
                        py = y + np.random.randint(-6, 6)
                        if py < max(10, waste_top_y):
                            continue
                        color = [int(np.random.randint(40, 250)) for _ in range(3)]
                        cv2.circle(img, (px, py), np.random.randint(5, 15), color, -1)
                        if np.random.rand() > 0.5:
                            cv2.line(img, (px - 8, py - 4), (px + 8, py + 4), (240, 240, 240), 2)

                # For Critical / Overflow: add protruding heap and litter scattered around base!
                if fill_ratio > 0.8:
                    # Heap above rim
                    heap_apex_y = max(10, by - int(bh * (fill_ratio - 0.85)))
                    for _ in range(60):
                        hx = bx + np.random.randint(-8, bw + 8)
                        hy = np.random.randint(heap_apex_y, by + 20)
                        cv2.circle(img, (hx, hy), np.random.randint(6, 18), [int(np.random.randint(40, 250)) for _ in range(3)], -1)

                    # Litter on the ground around the base (public dustbin spill)
                    for _ in range(40):
                        lx = bx + np.random.randint(-50, bw + 50)
                        ly = by + bh + np.random.randint(-5, 45)
                        if 0 <= lx < w and 0 <= ly < h:
                            cv2.circle(img, (lx, ly), np.random.randint(4, 12), [int(np.random.randint(40, 250)) for _ in range(3)], -1)

            cv2.imwrite(str(filename), img)

    # Also include the user's uploaded real image in the Critical class if present!
    user_upload = Path(__file__).resolve().parent / "uploads" / "fc68b76ea5_images.jpg"
    if user_upload.exists():
        critical_dir = DATASET_DIR / "critical"
        dest = critical_dir / "user_public_dustbin_overflow.jpg"
        import shutil
        shutil.copyfile(user_upload, dest)


def train_and_evaluate():
    print("[1/4] Generating & loading public dustbin dataset...")
    generate_synthetic_and_public_samples()

    X = []
    y = []

    for cls_idx, cls_name in enumerate(CLASS_NAMES):
        cls_dir = DATASET_DIR / cls_name.lower()
        for f in os.listdir(cls_dir):
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                filepath = cls_dir / f
                img = cv2.imread(str(filepath))
                if img is not None:
                    feat = extract_public_dustbin_features(img)
                    X.append(feat)
                    y.append(cls_idx)

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int32)
    print(f"Total dataset samples: {len(X)} with feature dimension: {X.shape[1]}")

    # Train / Test split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    print("[2/4] Training Candidate ML Models...")
    # Model 1: Random Forest Classifier
    rf = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
    rf.fit(X_train_scaled, y_train)
    rf_score = rf.score(X_test_scaled, y_test)

    # Model 2: HistGradientBoosting Classifier
    hgb = HistGradientBoostingClassifier(max_iter=100, max_depth=6, random_state=42)
    hgb.fit(X_train_scaled, y_train)
    hgb_score = hgb.score(X_test_scaled, y_test)

    print(f"  Random Forest Test Accuracy: {rf_score * 100:.2f}%")
    print(f"  HistGradientBoosting Test Accuracy: {hgb_score * 100:.2f}%")

    best_model = rf if rf_score >= hgb_score else hgb
    best_name = "RandomForest" if rf_score >= hgb_score else "HistGradientBoosting"
    print(f"[3/4] Selected Best Production Model: {best_name}")

    # Detailed Evaluation
    y_pred = best_model.predict(X_test_scaled)
    print("\n--- Classification Report ---")
    print(classification_report(y_test, y_pred, target_names=CLASS_NAMES))

    print("--- Confusion Matrix ---")
    print(confusion_matrix(y_test, y_pred))

    # Feature Importance for Random Forest
    if hasattr(best_model, "feature_importances_"):
        print("\n--- Feature Importances ---")
        feature_labels = [
            "edge_density", "top_zone_edges", "mid_zone_edges", "bot_zone_edges",
            "top_heap_density", "hue_std", "sat_mean", "sat_std", "val_std",
            "lab_std_l", "lab_std_a", "lab_std_b", "estimated_height_ratio", "is_top_overflow"
        ]
        for name, imp in sorted(zip(feature_labels, best_model.feature_importances_), key=lambda x: x[1], reverse=True):
            print(f"  {name:25s}: {imp * 100:.2f}%")

    # Retrain on full dataset for production deployment
    print("\n[4/4] Fitting final model and exporting weights...")
    final_scaler = StandardScaler()
    X_full_scaled = final_scaler.fit_transform(X)
    best_model.fit(X_full_scaled, y)

    joblib.dump(best_model, MODEL_PATH)
    joblib.dump(final_scaler, SCALER_PATH)
    print(f"Model saved to {MODEL_PATH}")
    print(f"Scaler saved to {SCALER_PATH}")
    print("ML Model training complete successfully!")


if __name__ == "__main__":
    train_and_evaluate()

