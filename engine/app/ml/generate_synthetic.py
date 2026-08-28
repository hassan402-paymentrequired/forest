"""
Generates synthetic school data to train/retrain the Random Forest model
until real client data is available (see project-overview.md section 9/10).

Produces engine/training_data.csv: STANDARD_COLUMNS (from clean.py) plus a
`dropout_rate` target column, ready for app.ml.retrain.

Run: python -m app.ml.generate_synthetic
"""

import os

import numpy as np
import pandas as pd

from app.ml.clean import STANDARD_COLUMNS

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "training_data.csv")

N_ROWS = 2000
SEED = 42


def generate(n_rows: int = N_ROWS, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    enrollment = rng.integers(150, 3000, n_rows).astype(float)
    teacher_student_ratio = rng.uniform(10, 60, n_rows)
    attendance_rate = rng.uniform(0.55, 1.0, n_rows)
    budget_allocation = rng.uniform(8_000, 120_000, n_rows)
    infrastructure_score = rng.uniform(20, 100, n_rows)

    # Synthetic ground truth: dropout_rate (%) as a function of the inputs,
    # with realistic direction of effect (worse ratio/attendance/budget/infra -> higher dropout).
    dropout_rate = (
        5
        + 0.25 * (teacher_student_ratio - 20)
        - 15 * (attendance_rate - 0.7)
        - 0.00008 * (budget_allocation - 50_000)
        - 0.08 * (infrastructure_score - 60)
        + 0.0007 * (enrollment - 1000)
        + rng.normal(0, 2, n_rows)
    )
    dropout_rate = np.clip(dropout_rate, 0, 45)

    df = pd.DataFrame(
        {
            "enrollment": enrollment,
            "teacher_student_ratio": teacher_student_ratio,
            "attendance_rate": attendance_rate,
            "budget_allocation": budget_allocation,
            "infrastructure_score": infrastructure_score,
            "dropout_rate": dropout_rate,
        }
    )

    assert list(df.columns[:-1]) == STANDARD_COLUMNS, (
        "generate() columns drifted from clean.STANDARD_COLUMNS — keep these in sync"
    )

    return df


if __name__ == "__main__":
    df = generate()
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"Wrote {len(df)} synthetic rows to {OUTPUT_PATH}")
