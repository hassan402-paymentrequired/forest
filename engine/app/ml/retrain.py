"""
Retrain pipeline — this is how the model "keeps learning" from school data.

IMPORTANT CAVEAT (flag to client if it comes up): Random Forest can't learn
incrementally in real-time. "Keeps learning" in practice means: as schools
submit new data (with known outcomes, e.g. last year's actual dropout rate),
we periodically retrain the model from scratch on ALL accumulated data
(old + new), then swap in the new model file. Predictions get smarter over
time, not instantly after every single upload.

Run this manually for now:  python -m app.ml.retrain
Later this can be triggered on a schedule (e.g. cron) or after N new
labeled submissions accumulate.
"""

import os
import shutil
from datetime import datetime

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score

from app.ml.clean import STANDARD_COLUMNS

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
BACKUP_DIR = os.path.join(MODEL_DIR, "backups")

TARGET_COLUMN = "dropout_rate"  # matches generate_synthetic.py; update if real client data uses a different label


def load_training_data(data_path: str) -> pd.DataFrame:
    """
    Loads accumulated, labeled training data (STANDARD_COLUMNS + TARGET_COLUMN).
    For now this reads a single accumulated CSV — swap this for a DB query
    once real submissions with known outcomes are being collected.
    """
    return pd.read_csv(data_path)


def retrain(data_path: str):
    df = load_training_data(data_path)

    missing = [c for c in STANDARD_COLUMNS + [TARGET_COLUMN] if c not in df.columns]
    if missing:
        raise ValueError(f"Training data missing required columns: {missing}")

    X = df[STANDARD_COLUMNS]
    y = df[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=200, random_state=42)
    model.fit(X_train, y_train)

    score = r2_score(y_test, model.predict(X_test))
    print(f"Retrained model R^2 on holdout: {score:.4f}")

    # Back up the current model before overwriting, so we can roll back if the new one underperforms.
    os.makedirs(BACKUP_DIR, exist_ok=True)
    if os.path.exists(MODEL_PATH):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy(MODEL_PATH, os.path.join(BACKUP_DIR, f"model_{timestamp}.pkl"))

    joblib.dump(model, MODEL_PATH)
    print(f"New model saved to {MODEL_PATH}")

    return model, score


if __name__ == "__main__":
    # Point this at your accumulated labeled dataset.
    retrain(data_path=os.path.join(MODEL_DIR, "..", "..", "training_data.csv"))
