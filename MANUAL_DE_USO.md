# 📘 Manual de Uso — VISION3DPARTS (VisionFV)
### Suite de Catálogo de Repuestos 3D Interactivo, eBOM y Parque Automotor

---

## 📌 1. Descripción General del Software

**VISION3DPARTS** es una plataforma integral para la gestión técnica de flotas de maquinaria pesada, vehículos viales y transporte comercial. Permite explorar modelos mecánicos 3D con despiece interactivo (*exploded view*), consultar la lista de materiales estructurada (**eBOM**), visualizar especificaciones de torque/ajuste y sincronizar repuestos directamente con sus páginas correspondientes en los manuales de servicio.

### 🛠️ Tecnologías Principales
- **Frontend**: React 19, TypeScript, Three.js, Zustand (gestión de estado desacoplada), Tailwind CSS v4, Lucide Icons, Vitest.
- **Backend**: FastAPI (Python 3.11+ / 3.14), SQLAlchemy 2.0 Asíncrono, SQLite / aiosqlite, Pydantic v2, Pytest, HTTPX.

---

## 🚀 2. Instalación y Puesta en Marcha

### Prerrequisitos
- **Python 3.11+**
- **Node.js 18+** y **npm**
- Git

### 🔧 Paso 1: Configurar y Ejecutar el Backend

1. Abrir una terminal en el directorio `backend`:
   ```bash
   cd backend
   ```
2. Crear y activar el entorno virtual de Python:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
3. Instalar las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Poblar la base de datos inicial con la flota de maquinaria y ensambles:
   ```bash
   python scripts/seed_fleet.py
   ```
5. Iniciar el servidor API de FastAPI:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *El backend estará accesible en `http://127.0.0.1:8000` y la documentación interactiva en `http://127.0.0.1:8000/api/v1/docs`.*

---

### 💻 Paso 2: Configurar y Ejecutar el Frontend

1. Abrir una nueva terminal en el directorio `frontend`:
   ```bash
   cd frontend
   ```
2. Instalar las dependencias de Node:
   ```bash
   npm install
   ```
3. Iniciar el servidor de desarrollo de Vite (configurado en el puerto **3001**):
   ```bash
   npm run dev
   ```
4. Abrir en el navegador:
   ```
   http://localhost:3001
   ```

---

## 📖 3. Guía de Uso de la Interfaz

La aplicación cuenta con dos entornos de trabajo interconectados:

### 🚛 A. Vista de Flota de Maquinaria (*Fleet View*)
1. **Filtros por Categoría**: En el panel superior/lateral, filtre las unidades por tipo de maquinaria (e.g., *Motoniveladoras*, *Camiones Volcadores*, *Aplanadoras*, *Retroexcavadoras*, *Autoelevadores*, *Palas Cargadoras*).
2. **Selección de Vehículo**: Haga clic sobre cualquier tarjeta de vehículo (ejemplo: *Sinomach 722H*, *Iveco Tector 170E28*, *Bull HD96*).
3. **Ficha Técnica y Subsistemas**: Se desplegarán los datos técnicos del equipo (marca, modelo, código interno, año) y todos los subsistemas mecánicos instalados (e.g., Motor Cummins 6BT, Transmisión ZF WG200, Diferencial Dana Spicer, Bombas Hidráulicas Rexroth).
4. **Abrir Espacio de Trabajo 3D**: Al hacer clic en un subsistema, se inicia la transición al visor 3D del ensamble.

---

### ⚙️ B. Espacio de Trabajo 3D y Catálogo eBOM (*Workspace View*)

El visor 3D integra controles de cámara avanzados y sincronización bidireccional con la tabla de piezas eBOM:

#### 🎮 Controles de Cámara 3D
- **Rotación Orbital**: Clic izquierdo sostenido y arrastrar el cursor.
- **Paneo / Traslación**: Clic derecho sostenido (o `Ctrl + Clic izquierdo`) y arrastrar.
- **Zoom**: Rueda del ratón hacia adelante/atrás.
- **Auto-Enfoque**: Al hacer clic en cualquier pieza, la cámara realiza una transición suave hacia el centro del componente calculando la distancia óptima para evitar cortes de plano (*clipping*).

#### 💥 Despiece Mecánico Interactivo (*Exploded View*)
- Utilice el **slider de despiece** (0% a 100%) para separar progresivamente las piezas a lo largo de sus vectores de explosión calculados en 3D.
- Permite inspeccionar componentes internos sin perder la orientación espacial del ensamble.

#### 📋 Tabla eBOM y Sincronización
- **Posición y OEM**: Cada fila muestra el número de posición en el diagrama, código OEM original, nombre del componente y par de apriete (*torque* en Nm).
- **Hover y Selección**: Al posar el cursor o hacer clic sobre una fila, la pieza correspondiente se resalta inmediatamente en la escena 3D (y viceversa).
- **Detalle de la Pieza**: El panel lateral exhibe los datos mecánicos, número de página de servicio y notas de ensamblaje.

#### 📄 Visor de Manuales PDF / Planos
- En las pestañas superiores puede alternar entre la vista 3D completa, vista dividida (*Split View*) o el visor de manuales.
- Al seleccionar una pieza, el sistema salta automáticamente a la página correspondiente del manual técnico de servicio.

---

## 🧪 4. Ejecución del Suite de Pruebas

Para garantizar la integridad del sistema, ejecute los tests automatizados:

### Backend Tests (Pytest)
```bash
cd backend
.venv\Scripts\python -m pytest -v backend/tests/
```
*Ejecuta pruebas de endpoints de flota, detalles de ensamble con eBOM, verificación de metadata de despiece y códigos 404.*

### Frontend Tests (Vitest & Typecheck)
```bash
cd frontend
npm run typecheck
npm test
```
*Ejecuta la validación de tipos de TypeScript y las pruebas unitarias del store Zustand y de las fórmulas de cámara Three.js.*

---

## 📡 5. Referencia de Endpoints API Principales

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Estado de salud del servicio |
| `GET` | `/api/v1/vehicles` | Listado de vehículos (filtro `?category=...`) |
| `GET` | `/api/v1/vehicles/{id}` | Detalle del vehículo y subsistemas instalados |
| `GET` | `/api/v1/assemblies` | Listado de ensambles maestros registrados |
| `GET` | `/api/v1/assemblies/{id}` | Detalle del ensamble y lista de piezas eBOM completa |
| `POST` | `/api/v1/assemblies` | Registro de un nuevo subsistema mecánico |
| `POST` | `/api/v1/assemblies/batch/parts` | Importación y actualización masiva de piezas |
| `GET` | `/api/v1/parts/{id}` | Detalle de pieza individual |
| `POST` | `/api/v1/seed/fleet` | Población idempotente de flota y catálogo demo |

---

## 🏛️ 6. Estructura del Repositorio

```
VISION3DPARTS/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # Endpoints REST (vehicles, assemblies, parts, seed)
│   │   ├── core/                # Configuración y conexión a base de datos asíncrona
│   │   └── models/              # Modelos SQLAlchemy y esquemas Pydantic v2
│   ├── scripts/                 # Scripts de seed y utilidades
│   └── tests/                   # Test suite con Pytest y HTTPX AsyncClient
├── frontend/
│   ├── src/
│   │   ├── components/          # Componentes de UI reutilizables
│   │   ├── modules/
│   │   │   ├── ebom/            # Tabla eBOM y ficha técnica de piezas
│   │   │   ├── fleet/           # Catálogo y fichas de vehículos de la flota
│   │   │   ├── manuals/         # Visor y sincronizador de manuales
│   │   │   └── viewer3d/        # Motor Three.js (SceneManager, CameraRig, cameraMath)
│   │   ├── services/            # Cliente HTTP de API
│   │   ├── store/               # Store global Zustand
│   │   └── types/               # Tipos TypeScript compartidos
│   └── vite.config.ts           # Configuración de Vite (puerto 3000)
├── MANUAL_DE_USO.md             # Guía detallada de uso del software
└── README.md                    # Documento principal del repositorio
```
