from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes.api import api_router
from app.core.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear las tablas de BD al arrancar (idempotente con create_all)
    async with engine.begin() as conn:
        import app.models.sql_models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)

    # Ensure uploads directory exists
    uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    yield


# 1. Instanciar FastAPI con la ruta /docs explícita y lifespan
app = FastAPI(
    title="Parts Catalog & Fleet eBOM API",
    version="1.0.0",
    docs_url="/docs",      # Habilita Swagger UI en /docs
    redoc_url="/redoc",    # Habilita ReDoc en /redoc
    lifespan=lifespan,
)

origins = [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# 2. Configurar CORS para permitir peticiones desde el Frontend (Vite / React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Habilita GET, POST, OPTIONS, PUT, DELETE, etc.
    allow_headers=["*"],
)

# 3. Incluir todas las rutas de la API bajo el prefijo /api/v1
app.include_router(api_router, prefix="/api/v1")

# 4. Montar directorio de uploads como archivos estaticos
uploads_path = Path(__file__).resolve().parent.parent / "uploads"
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")


@app.get("/")
async def root():
    return {"status": "ok", "message": "API running. Go to /docs for interactive documentation."}