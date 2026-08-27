# Engine (Backend + Model)

## Setup
1. Create a virtualenv and install deps:
   pip install -r requirements.txt

2. Copy .env.example to .env and update DATABASE_URL / JWT_SECRET_KEY.

3. Make sure Postgres is running locally, then create tables:
   python -c "from app.db.schema import create_tables; create_tables()"

4. Drop your trained model file into app/models/model.pkl
   (or run: python -m app.ml.retrain — once training_data.csv exists)

5. Run the server:
   uvicorn app.main:app --reload --port 8000

API will be live at http://localhost:8000
Docs (auto-generated): http://localhost:8000/docs
