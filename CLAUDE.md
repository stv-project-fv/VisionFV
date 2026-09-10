```markdown
# ==============================================================================
# PROJECT: 3D Interactive Parts Catalog & eBOM Suite
# STACK: React (TypeScript) + Three.js + Zustand + FastAPI (Python 3.11+)
# ==============================================================================

## 1. GENERAL PRINCIPLES & WORKFLOW
- **Strict Typing:** No `any` in TypeScript. No untyped parameters or missing return types in Python.
- **Single Responsibility:** Decouple WebGL/Three.js imperative rendering entirely from React's declarative lifecycle.
- **Validation Before Completion:** Always verify changes by running type checks and linters before reporting a task as complete.
  - Frontend: `npm run typecheck` (`tsc --noEmit`) && `npm run lint`
  - Backend: `ruff check .` && `mypy .` && `pytest`

---

## 2. FRONTEND ARCHITECTURE & THREE.JS RULES

### A. Three.js & Imperative Engine (`/src/modules/viewer3d`)
- **Isolation:** Encapsulate all Three.js scene logic inside pure TypeScript classes (`SceneManager`, `CameraRig`, `ExplodeManager`). Never instantiate Three.js objects directly inside the body of a React functional component.
- **Lifecycle & Memory Leaks (CRITICAL):**
  - Always implement a dedicated `destroy()` or `dispose()` method in engine classes.
  - Recursively traverse meshes on unload: dispose geometries, materials, and textures (`map`, `normalMap`, `roughnessMap`, etc.).
  - Always cancel active `requestAnimationFrame` IDs and disconnect ResizeObservers / event listeners on unmount.
- **Raycasting:**
  - When converting mouse coordinates to NDC (Normalized Device Coordinates), always compute against `renderer.domElement.getBoundingClientRect()` rather than `window.innerWidth/innerHeight` to support responsive multi-panel layouts.
- **Render Loop Optimization:**
  - Do not trigger Zustand state updates on every frame inside the render loop. State updates must be event-driven (e.g., on selection change, explosion drag completion, or animation start/stop).

### B. React & Zustand State Management
- **Store Architecture:** Keep stores normalized. Store IDs (`selectedPartId`, `activeAssemblyId`) rather than full 3D object references in Zustand.
- **Bridge Pattern:** Expose a minimal API from the 3D Engine to React components via custom hooks (e.g., `useViewerBridge`).
- **Selective Subscriptions:** Use atomic selectors in UI components (`const selectedId = useAssemblyStore(s => s.selectedPartId)`) to avoid unnecessary re-renders of the eBOM table during high-frequency camera movements.

---

## 3. BACKEND & FASTAPI RULES

### A. Python & FastAPI Standards
- Use Python 3.11+ syntax exclusively (`int | None` instead of `Optional[int]`, `list[str]` instead of `List[str]`).
- **Pydantic v2:** Use `model_config = ConfigDict(from_attributes=True)` and strict schema separation:
  - `PartCreate` (Input), `PartUpdate` (Patch), `PartResponse` (Public Output).
- **Async Database Sessions:** All database routes must use SQLAlchemy 2.0 async sessions (`AsyncSession`) via `async with` context managers or FastAPI `Depends()`.
- **Error Handling:** Raise standard `HTTPException` with explicit status codes and structured detail payloads (`{"detail": "Part OEM code not found", "code": "PART_NOT_FOUND"}`).

### B. 3D Metadata & Coordinate Conventions
- Keep all vector representations in standard arrays of 3 floats: `[x, y, z]`.
- Enforce SI units across the API: distances in meters (or millimeters, standardized per assembly), torque in `Nm`.

---

## 4. CODE STYLE & IMPLEMENTATION CONSTRAINTS

### TypeScript
```typescript
// ALWAYS: Use strict interfaces and type guards
export interface PartEntity {
  readonly id: string;
  readonly oemCode: string;
  readonly name: string;
  readonly explodeVector: [number, number, number];
  readonly torqueSpec?: string;
  readonly manualPage?: number;
}

// NEVER: Do not bypass WebGL cleanup
useEffect(() => {
  const engine = new ViewerEngine(canvasRef.current);
  return () => {
    engine.dispose(); // Mandatory
  };
}, []);

```

### Python / FastAPI

```python
# ALWAYS: Explicit async routes and Pydantic v2 models
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/assemblies", tags=["assemblies"])

@router.get("/{assembly_id}/parts", response_model=list[PartResponse])
async def get_assembly_parts(
    assembly_id: str, 
    db: AsyncSession = Depends(get_db_session)
) -> list[PartResponse]:
    parts = await parts_service.fetch_by_assembly(db, assembly_id)
    if not parts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Assembly {assembly_id} has no parts registered"
        )
    return parts

```

---

## 5. AGENT BEHAVIORAL PROTOCOL

1. **No Stubs:** Write full, runnable implementations. Do not leave placeholder comments like `// TODO: Implement later`.
2. **Atomic Steps:** When building a complex module, generate the interfaces and backend schemas first, followed by the domain logic, and finally the UI components.
3. **Refactoring Safety:** When modifying an existing file, read the entire file context first to avoid breaking existing imports or unmanaged side-effects.

```

<FollowUp label="¿Querés que prepare el script de Python para procesar los CAD/glTF e inyectar los vectores de despiece?" query="Escribí el script de Python para optimizar archivos glTF/GLB e inyectar la metadata de userData (vectores de despiece, códigos OEM y torques)."/>

```