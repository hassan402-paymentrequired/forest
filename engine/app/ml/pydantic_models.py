from pydantic import BaseModel
from typing import List


class PredictionResponse(BaseModel):
    predictions: List[float]
    recommendation: str | None = None
