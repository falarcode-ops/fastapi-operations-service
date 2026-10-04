import os
import json
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Depends, Security, Header, UploadFile, File
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel, Field
from app.database import get_db
from app.services.image_metadata_service import sanitize_image_metadata

router = APIRouter(prefix="/social", tags=["Publicador de Redes Sociales"])

API_KEY_HEADER = APIKeyHeader(name="X-Portfolio-Api-Key", auto_error=False)
N8N_KEY = os.getenv("N8N_API_KEY", "dev_api_key_default")

def verify_n8n_or_admin(api_key: Optional[str] = Security(API_KEY_HEADER)):
    if api_key and api_key.strip() == N8N_KEY:
        return {"role": "AUTOMATION"}
    # En desarrollo local permite acceso directo
    return {"role": "ADMIN"}

class PostCreate(BaseModel):
    title: str
    base_content: str
    target_platforms: Optional[List[str]] = ["linkedin"]
    media_urls: Optional[List[str]] = []
    status: Optional[str] = "BORRADOR"
    scheduled_at: Optional[str] = None
    author: Optional[str] = "Fabian Alarcon"

class StatusCallback(BaseModel):
    status: str
    n8n_execution_id: Optional[str] = None
    published_links: Optional[Dict[str, str]] = None

@router.get("/posts")
def list_posts(status: Optional[str] = None):
    with get_db() as db:
        with db.cursor() as cur:
            query = "SELECT * FROM social_posts WHERE 1=1"
            params = []
            if status:
                query += " AND status = %s"
                params.append(status)
            query += " ORDER BY created_at DESC"
            cur.execute(query, params)
            return cur.fetchall()

@router.post("/posts")
def create_post(data: PostCreate):
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute("""
                INSERT INTO social_posts (title, base_content, target_platforms, media_urls, status, scheduled_at, author)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *;
            """, (data.title, data.base_content, json.dumps(data.target_platforms), json.dumps(data.media_urls), data.status, data.scheduled_at, data.author))
            db.commit()
            return cur.fetchone()

@router.get("/pending", summary="Endpoint de consulta de publicaciones pendientes para N8N")
def get_pending_posts(auth: dict = Depends(verify_n8n_or_admin)):
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute("""
                SELECT * FROM social_posts
                WHERE status = 'PROGRAMADO' 
                  AND (scheduled_at IS NULL OR scheduled_at <= NOW())
                ORDER BY scheduled_at ASC;
            """)
            rows = cur.fetchall()
            return {
                "total_pending": len(rows),
                "posts": rows
            }

@router.patch("/posts/{post_id}/status", summary="Reporte de publicación exitosa/fallida desde N8N")
def callback_post_status(post_id: int, data: StatusCallback, auth: dict = Depends(verify_n8n_or_admin)):
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute("""
                UPDATE social_posts
                SET status = %s,
                    n8n_execution_id = %s,
                    published_links = %s,
                    published_at = CASE WHEN %s = 'PUBLICADO' THEN NOW() ELSE published_at END,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *;
            """, (data.status, data.n8n_execution_id, json.dumps(data.published_links or {}), data.status, post_id))
            db.commit()
            res = cur.fetchone()
            if not res:
                raise HTTPException(status_code=404, detail="Publicación no encontrada.")
            return res

@router.get("/credentials", summary="Entrega token de LinkedIn personal a N8N")
def get_credentials(auth: dict = Depends(verify_n8n_or_admin)):
    token = os.getenv("LINKEDIN_ACCESS_TOKEN", "")
    return {
        "status": "success",
        "credentials": {
            "linkedin": {
                "access_token": token,
                "author_type": "PERSONAL"
            }
        }
    }

@router.post("/upload-media", summary="Sube y sanea metadatos C2PA en imágenes de portafolio")
async def upload_media(file: UploadFile = File(...)):
    contents = await file.read()
    clean_bytes = sanitize_image_metadata(contents, file.filename)
    
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    
    with open(file_path, "wb") as f:
        f.write(clean_bytes)
        
    return {
        "status": "success",
        "filename": file.filename,
        "url": f"/static/uploads/{file.filename}",
        "metadata_sanitized": True
    }
