"""
LLM-assisted structural recovery when a raw upload doesn't match
STANDARD_COLUMNS even after clean.py's alias-based fast path — e.g. a
student-level roster instead of school-level snapshot data.

Safety model: the LLM only ever proposes a *plan* (which raw column maps to
which target column, via a small whitelisted operation) — it never executes
arithmetic itself, and this module never eval()s anything the LLM writes.
Every field of the plan is validated against a strict whitelist before any
pandas operation runs on it. Any structural problem rejects the whole plan —
never a partially-trusted mapping.
"""

import json
import logging
import math
from dataclasses import dataclass

import pandas as pd

from app.llm.generate import generate_mapping_plan
from app.ml.clean import STANDARD_COLUMNS, extract_row_labels

logger = logging.getLogger(__name__)

ALLOWED_OPS = {"alias", "row_count", "mean", "sum", "unavailable"}
AGGREGATION_OPS = {"row_count", "mean", "sum"}
COLUMN_OPS = {"alias", "mean", "sum"}


@dataclass
class MappingOp:
    op: str
    column: str | None = None
    scale: float = 1.0


@dataclass
class MappingPlan:
    group_by: str | None
    mapping: dict[str, MappingOp]


def _reject(reason: str) -> None:
    logger.warning("Mapping plan rejected: %s", reason)


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text[3:]
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.rsplit("```", 1)[0]
    return text.strip()


def parse_and_validate_mapping_plan(raw_text: str | None, raw_df: pd.DataFrame) -> MappingPlan | None:
    if raw_text is None:
        _reject("no response from LLM")
        return None

    try:
        parsed = json.loads(_strip_code_fence(raw_text))
    except json.JSONDecodeError as e:
        _reject(f"invalid JSON: {e}")
        return None

    if not isinstance(parsed, dict):
        _reject("top-level value is not an object")
        return None

    mapping_raw = parsed.get("mapping")
    if not isinstance(mapping_raw, dict):
        _reject("missing or invalid 'mapping' key")
        return None

    if not set(STANDARD_COLUMNS).issubset(mapping_raw.keys()):
        _reject(f"mapping is missing required columns: {set(STANDARD_COLUMNS) - mapping_raw.keys()}")
        return None

    group_by = parsed.get("group_by")
    if group_by is not None:
        if not isinstance(group_by, str):
            _reject("group_by is not a string")
            return None
        if group_by != "__all__" and group_by not in raw_df.columns:
            _reject(f"group_by column {group_by!r} not in uploaded data")
            return None

    ops: dict[str, MappingOp] = {}
    for target in STANDARD_COLUMNS:
        entry = mapping_raw.get(target)
        if not isinstance(entry, dict):
            _reject(f"'{target}' mapping entry is not an object")
            return None

        op = entry.get("op")
        if op not in ALLOWED_OPS:
            _reject(f"'{target}' has invalid op: {op!r}")
            return None

        if group_by is None and op in AGGREGATION_OPS:
            _reject(f"'{target}' uses aggregation op '{op}' but group_by is null")
            return None

        column = None
        if op in COLUMN_OPS:
            column = entry.get("column")
            if not isinstance(column, str) or not column or column not in raw_df.columns:
                _reject(f"'{target}' op '{op}' references unknown column {column!r}")
                return None

        scale = 1.0
        if op in ("mean", "sum") and "scale" in entry:
            candidate = entry["scale"]
            if isinstance(candidate, bool) or not isinstance(candidate, (int, float)):
                _reject(f"'{target}' scale is not numeric: {candidate!r}")
                return None
            if not math.isfinite(candidate):
                _reject(f"'{target}' scale is not finite: {candidate!r}")
                return None
            scale = float(candidate)

        ops[target] = MappingOp(op=op, column=column, scale=scale)

    return MappingPlan(group_by=group_by, mapping=ops)


def execute_mapping_plan(raw_df: pd.DataFrame, plan: MappingPlan) -> tuple[pd.DataFrame, list[str], list[str]]:
    unavailable_columns = [name for name, spec in plan.mapping.items() if spec.op == "unavailable"]

    if plan.group_by is None:
        # Already one row per school (no aggregation) — each input row maps independently.
        groups = [pd.DataFrame([row]).reset_index(drop=True) for _, row in raw_df.iterrows()]
        row_labels = extract_row_labels(raw_df)
    elif plan.group_by == "__all__":
        # No entity-identifier column — the whole file represents one school.
        groups = [raw_df]
        row_labels = ["School 1"]
    else:
        # group_by is a real column — its own values ARE the school identifier.
        keyed_groups = list(raw_df.groupby(plan.group_by, sort=False, dropna=False))
        groups = [group_df for _, group_df in keyed_groups]
        row_labels = [str(key) for key, _ in keyed_groups]

    rows = []
    for group_df in groups:
        row = {}
        for target, spec in plan.mapping.items():
            if spec.op == "unavailable":
                row[target] = float("nan")
            elif spec.op == "row_count":
                row[target] = float(len(group_df))
            elif spec.op == "alias":
                non_null = group_df[spec.column].dropna()
                row[target] = non_null.iloc[0] if len(non_null) else float("nan")
            elif spec.op == "mean":
                numeric = pd.to_numeric(group_df[spec.column], errors="coerce")
                row[target] = numeric.mean() * spec.scale
            elif spec.op == "sum":
                numeric = pd.to_numeric(group_df[spec.column], errors="coerce")
                row[target] = numeric.sum() * spec.scale
        rows.append(row)

    result_df = pd.DataFrame(rows, columns=STANDARD_COLUMNS)
    return result_df, unavailable_columns, row_labels


def map_via_llm(raw_df: pd.DataFrame) -> tuple[pd.DataFrame, list[str], list[str]] | None:
    raw_text = generate_mapping_plan(raw_df)
    plan = parse_and_validate_mapping_plan(raw_text, raw_df)
    if plan is None:
        return None
    return execute_mapping_plan(raw_df, plan)
