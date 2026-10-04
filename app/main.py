import os
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.routers import auth, customers, proposals, commercial_logs, social_publisher, leads, compat

app = FastAPI(
    title="CORALIS-PS - Professional Services",
    description="CRM y Gestor de Contenidos desacoplado para Consultoría y Servicios Profesionales",
    version="1.5.3"
)

# Control de caché para actualización instantánea de SPA
@app.middleware("http")
async def disable_static_caching(request, call_next):
    response = await call_next(request)
    if request.url.path.endswith('.html') or request.url.path.endswith('.js') or request.url.path == '/':
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Registrar Routers API
app.include_router(auth.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(proposals.router, prefix="/api")
app.include_router(commercial_logs.router, prefix="/api")

# Alias /commercial-logs para compatibilidad directa con frontend Coralis
router_cl = APIRouter(prefix="/commercial-logs", tags=["Bitácora de Interacciones"])
router_cl.add_api_route("", commercial_logs.list_logs, methods=["GET"])
router_cl.add_api_route("", commercial_logs.add_log, methods=["POST"])
app.include_router(router_cl, prefix="/api")

app.include_router(social_publisher.router, prefix="/api")
app.include_router(social_publisher.router, prefix="/api/v1")
app.include_router(compat.router, prefix="/api")

# Ingesta de Leads (disponible en /api/v1 y /api para N8N)
app.include_router(leads.router, prefix="/api/v1")
app.include_router(leads.router, prefix="/api")

# Rutas de estado y diagnóstico
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "CORALIS-PS"}

@app.get("/api/health")
def api_health():
    return {"status": "ok", "service": "CORALIS-PS"}

static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)

@app.get("/diagnostico")
def serve_diagnostico():
    diag_path = os.path.join(static_dir, "diagnostico.html")
    if os.path.exists(diag_path):
        return FileResponse(diag_path)
    return FileResponse(os.path.join(static_dir, "index.html"))

# 2. Montar dashboard SPA estático en raíz / (después de routers API)
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="dashboard")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8020, reload=True)
