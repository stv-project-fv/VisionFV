from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.api import api_router

# 1. Instanciar FastAPI con la ruta /docs explícita
app = FastAPI(
    title="Parts Catalog & Fleet eBOM API",
    version="1.0.0",
    docs_url="/docs",      # Habilita Swagger UI en /docs
    redoc_url="/redoc",    # Habilita ReDoc en /redoc
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


@app.get("/")
async def root():
    return {"status": "ok", "message": "API running. Go to /docs for interactive documentation."}