"""
Cleaning/mapping layer.

This is the piece that solves "School A and School B format data differently."
The model only ever accepts one fixed column structure — everything upstream
of predict.py must be converted into this shape first.

STANDARD_COLUMNS defines that fixed structure. Update this list to match
the actual features the trained model expects.
"""

import pandas as pd

STANDARD_COLUMNS = [
    "enrollment",
    "teacher_student_ratio",
    "attendance_rate",
    "budget_allocation",
    "infrastructure_score",
]

# Maps common alternate column names -> our standard names.
# Extend this as real client spreadsheets reveal new naming variants.
COLUMN_ALIASES = {
    "student_count": "enrollment",
    "total_students": "enrollment",
    "t/s_ratio": "teacher_student_ratio",
    "teacher_ratio": "teacher_student_ratio",
    "attendance": "attendance_rate",
    "budget": "budget_allocation",
    "infra_score": "infrastructure_score",
}


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Takes a raw uploaded DataFrame (any column naming/order) and returns
    a DataFrame with exactly STANDARD_COLUMNS, in order, ready for the model.
    """
    df = df.rename(columns={c: COLUMN_ALIASES.get(c.strip().lower(), c) for c in df.columns})

    missing = [col for col in STANDARD_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns after mapping: {missing}")

    df = df[STANDARD_COLUMNS]

    # Basic cleaning: drop empty rows, coerce numeric types, fill small gaps.
    df = df.dropna(how="all")
    for col in STANDARD_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.fillna(df.mean(numeric_only=True))

    return df.reset_index(drop=True)


def load_upload_file(file_path: str) -> pd.DataFrame:
    """Reads an uploaded .xlsx or .csv file into a DataFrame."""
    if file_path.endswith(".csv"):
        return pd.read_csv(file_path)
    return pd.read_excel(file_path)
