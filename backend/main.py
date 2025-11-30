from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import engine, Base
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Search & Insights API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.endpoints import router as api_router
from app.api.auth import router as auth_router

app.include_router(api_router, prefix="/api")
app.include_router(auth_router, prefix="/auth")

@app.get("/")
def read_root():
    return {"message": "Smart Search & Insights API is running"}
