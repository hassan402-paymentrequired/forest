"""
FastAPI entrypoint for the Adaptive AI Planning Engine.
Wires together auth, upload/prediction, and retrain routes.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth_routes, chat_routes, prediction_routes

app = FastAPI(title="Adaptive Planning Engine", version="0.1.0")

# Allow the Next.js frontend (running on localhost) to call this API during dev.
# Tighten this list before production deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/auth", tags=["auth"])
app.include_router(prediction_routes.router, prefix="/predict", tags=["prediction"])
app.include_router(chat_routes.router, prefix="/chat", tags=["chat"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
