# Engine (Backend + Model)

## Setup (Docker — recommended)

`scikit-learn` fails to import on at least one dev machine's native macOS Python
(hangs indefinitely regardless of Python version — a host/native-library issue,
not a code issue). Docker sidesteps it entirely, so it's the recommended way to
run this locally.

1. Build and start (API + Postgres):
   docker compose up -d --build

2. First time only — create the tables:
   docker compose exec api python -c "from app.db.schema import create_tables; create_tables()"

3. First time only — generate synthetic training data and train the model
   (skip once you have real client data / a real model.pkl):
   docker compose exec api python -m app.ml.generate_synthetic
   docker compose exec api python -m app.ml.retrain

API will be live at http://localhost:8000 (Postgres on host port 5433, mapped
to avoid colliding with any local Postgres on 5432).
Docs (auto-generated): http://localhost:8000/docs

Logs: `docker compose logs -f api`
Stop: `docker compose down` (add `-v` to also wipe the Postgres volume)

## Setup (native venv — only if scikit-learn actually imports on your machine)

1. Create a virtualenv and install deps:
   pip install -r requirements.txt

2. Copy .env.example to .env and update DATABASE_URL / JWT_SECRET_KEY.

3. Make sure Postgres is running locally, then create tables:
   python -c "from app.db.schema import create_tables; create_tables()"

4. Drop your trained model file into app/models/model.pkl
   (or run: python -m app.ml.retrain — once training_data.csv exists)

5. Run the server:
   uvicorn app.main:app --reload --port 8000
