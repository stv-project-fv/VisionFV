from fastapi import APIRouter

from app.api.routes import assemblies, health, parts, seed, vehicles

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(assemblies.router)
api_router.include_router(parts.router)
api_router.include_router(vehicles.router)
api_router.include_router(seed.router)
