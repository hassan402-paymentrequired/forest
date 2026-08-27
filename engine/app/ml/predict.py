"""
Loads the trained Random Forest model (.pkl) and runs predictions
on cleaned data.

Model file lives at app/models/model.pkl. Drop your trained prototype's
.pkl file there (or run retrain.py) before calling predict().
"""

import os
import joblib
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "model.pkl")

_model = None  # loaded lazily, cached in memory after first use


def get_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"No trained model found at {MODEL_PATH}. "
                "Place your prototype's model.pkl here, or run retrain.py."
            )
        _model = joblib.load(MODEL_PATH)
    return _model


def predict(cleaned_df: pd.DataFrame) -> list:
    """Runs the model on cleaned, standardized input and returns raw predictions."""
    model = get_model()
    return model.predict(cleaned_df).tolist()


def reload_model():
    """Call this after retraining so the running server picks up the new model
    without needing a restart."""
    global _model
    _model = joblib.load(MODEL_PATH)
    return _model
