from typing import Optional
from datetime import date
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_db

router = APIRouter(prefix="/logs", tags=["Bitácora de Interacciones"])

class LogCreate(BaseModel):
    customer_nit: str
    interaction_type: str
    summary: Optional[str] = None
    observations: Optional[str] = None
    next_followup_date: Optional[date] = None

@router.get("")
def list_logs(customer_nit: Optional[str] = None, limit: int = 500, offset: int = 0):
    with get_db() as db:
        with db.cursor() as cur:
            query = "SELECT * FROM commercial_logs WHERE 1=1"
            params = []
            if customer_nit:
                query += " AND customer_nit = %s"
                params.append(customer_nit)
            query += " ORDER BY occurred_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            cur.execute(query, params)
            return cur.fetchall()

@router.post("")
def add_log(data: LogCreate):
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute("""
                INSERT INTO commercial_logs (customer_nit, interaction_type, summary, observations, next_followup_date)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *;
            """, (data.customer_nit, data.interaction_type, data.summary, data.observations, data.next_followup_date))
            db.commit()
            return cur.fetchone()
