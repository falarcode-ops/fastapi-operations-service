from typing import Optional
from datetime import date
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.database import get_db

router = APIRouter(prefix="/proposals", tags=["Propuestas & Oportunidades"])

class ProposalCreate(BaseModel):
    customer_nit: str
    client_name: str
    title: str
    scope_description: Optional[str] = None
    estimated_value: Optional[float] = 0.0
    status: Optional[str] = "CONTACTO_INICIAL"
    submission_date: Optional[date] = None
    notes: Optional[str] = None

class ProposalUpdateStatus(BaseModel):
    status: str
    notes: Optional[str] = None

@router.get("")
def list_proposals(status: Optional[str] = None):
    with get_db() as db:
        with db.cursor() as cur:
            query = "SELECT * FROM proposals WHERE 1=1"
            params = []
            if status:
                query += " AND status = %s"
                params.append(status)
            query += " ORDER BY created_at DESC"
            cur.execute(query, params)
            return cur.fetchall()

@router.post("")
def create_proposal(data: ProposalCreate):
    with get_db() as db:
        with db.cursor() as cur:
            # Generar número correlativo
            cur.execute("SELECT COUNT(*) FROM proposals;")
            count = (cur.fetchone() or {'count': 0})['count'] + 1
            prop_num = f"PROP-2026-{count:03d}"

            cur.execute("""
                INSERT INTO proposals (proposal_number, customer_nit, client_name, title, scope_description, estimated_value, status, submission_date, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *;
            """, (prop_num, data.customer_nit, data.client_name, data.title, data.scope_description, data.estimated_value, data.status, data.submission_date, data.notes))
            db.commit()
            return cur.fetchone()

@router.patch("/{proposal_id}/status")
def update_proposal_status(proposal_id: int, data: ProposalUpdateStatus):
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute("""
                UPDATE proposals 
                SET status = %s, notes = COALESCE(%s, notes), updated_at = NOW()
                WHERE id = %s
                RETURNING *;
            """, (data.status, data.notes, proposal_id))
            db.commit()
            res = cur.fetchone()
            if not res:
                raise HTTPException(status_code=404, detail="Propuesta no encontrada.")
            return res
