"""
Cleaning/mapping layer.

This is the piece that solves "School A and School B format data differently."
The model only ever accepts one fixed column structure — everything upstream
of predict.py must be converted into this shape first.

STANDARD_COLUMNS defines that fixed structure. Update this list to match
the actual features the trained model expects.

When a raw upload doesn't match STANDARD_COLUMNS even after aliasing (a
different data shape entirely, e.g. student-level rather than school-level),
app/ml/mapping.py handles LLM-assisted recovery; MAX_IMPUTABLE_MISSING_COLUMNS
and impute_missing_columns() below are the last step of that path.
"""

import os

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

# Column names that identify which school a row belongs to. Never fed to the
# model (not in STANDARD_COLUMNS) — kept only so predictions/recommendations
# can refer to a school by name instead of an anonymous row index.
ROW_LABEL_ALIASES = ["school_name", "school", "name", "institution", "institution_name"]


def extract_row_labels(df: pd.DataFrame) -> list[str]:
    """
    Returns one label per row of df, taken from the first matching identifier
    column (case-insensitive), or generated placeholders ("School 1", "School
    2", ...) if none is present. Must be called on the same rows/order that
    will be passed into clean_dataframe, before any row filtering happens —
    callers are responsible for keeping labels aligned to whichever rows
    clean_dataframe/impute_missing_columns end up keeping.
    """
    lowered = {c.strip().lower(): c for c in df.columns}
    for alias in ROW_LABEL_ALIASES:
        if alias in lowered:
            return df[lowered[alias]].astype(str).tolist()
    return [f"School {i + 1}" for i in range(len(df))]


def _clean_dataframe_impl(df: pd.DataFrame) -> pd.DataFrame:
    """Shared logic for clean_dataframe/clean_dataframe_with_labels. Keeps the
    original row index (no reset) so a caller can tell which input rows
    survived — e.g. to filter a parallel row-labels list in lockstep."""
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

    return df


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Takes a raw uploaded DataFrame (any column naming/order) and returns
    a DataFrame with exactly STANDARD_COLUMNS, in order, ready for the model.
    """
    return _clean_dataframe_impl(df).reset_index(drop=True)


def clean_dataframe_with_labels(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """
    Same as clean_dataframe, but also returns one row label per surviving
    row (see extract_row_labels) — for callers that need to say *which*
    school a row/prediction belongs to.
    """
    labels = extract_row_labels(df)
    cleaned = _clean_dataframe_impl(df)
    surviving_labels = [labels[i] for i in cleaned.index]
    return cleaned.reset_index(drop=True), surviving_labels


def load_upload_file(file_path: str) -> pd.DataFrame:
    """Reads an uploaded .xlsx or .csv file into a DataFrame."""
    if file_path.endswith(".csv"):
        return pd.read_csv(file_path)
    return pd.read_excel(file_path)


# At most this many of the 5 STANDARD_COLUMNS may be unavailable/imputed
# before we skip the RF model entirely (too little real signal to trust it).
MAX_IMPUTABLE_MISSING_COLUMNS = 1

TRAINING_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "training_data.csv")

_training_means: dict[str, float] | None = None


def get_training_column_means() -> dict[str, float]:
    global _training_means
    if _training_means is None:
        df = pd.read_csv(TRAINING_DATA_PATH)
        _training_means = {col: float(df[col].mean()) for col in STANDARD_COLUMNS}
    return _training_means


def impute_missing_columns(df: pd.DataFrame, missing_columns: list[str]) -> pd.DataFrame:
    """
    Fills columns the mapping layer couldn't derive with historical training
    averages, then fills any other stray gaps the same way clean_dataframe
    does. Returns exactly STANDARD_COLUMNS, in order — predict() needs
    nothing else.
    """
    means = get_training_column_means()
    df = df.copy()
    for col in missing_columns:
        df[col] = means[col]

    for col in STANDARD_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.fillna(pd.Series(means))

    return df[STANDARD_COLUMNS].reset_index(drop=True)
