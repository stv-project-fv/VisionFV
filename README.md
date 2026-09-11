# VISION3DPARTS (VisionFV)
### 3D Interactive Parts Catalog, eBOM & Heavy Machinery Fleet Management Suite

Plataforma técnica interactiva para visualización 3D de piezas y repuestos mecánicos con despiece interactivo (*exploded view*), gestión de lista de materiales de ingeniería (**eBOM**) y administración del parque automotor de maquinaria pesada y vial.

---

## 🚀 Inicio Rápido

Para ver la guía completa de instalación, puesta en marcha y manual de usuario detallado con capturas e instrucciones de navegación, consulta el [**Manual de Uso Completo (MANUAL_DE_USO.md)**](./MANUAL_DE_USO.md).

### 1. Backend (FastAPI + SQLAlchemy Async + SQLite)
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
python scripts/seed_fleet.py
uvicorn app.main:app --reload --port 8000
```
- API Docs (Swagger): `http://127.0.0.1:8000/api/v1/docs`

### 2. Frontend (React 19 + TypeScript + Three.js + Zustand + Tailwind v4)
```bash
cd frontend
npm install
npm run dev
```
- Aplicación Web: `http://localhost:3001`

---

## 🧪 Pruebas Automatizadas

- **Backend**: `pytest -v backend/tests/` (12 tests pasando con éxito)
- **Frontend**: `npm run typecheck && npm test` (20 tests pasando con éxito)

---

## 📚 Documentación Adicional
- [Manual de Uso del Software](./MANUAL_DE_USO.md)
- [Reglas de Arquitectura y Principios](./CLAUDE.md)