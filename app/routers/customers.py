from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.database import get_db

router = APIRouter(prefix="/customers", tags=["Clientes & Contactos"])

class CustomerCreate(BaseModel):
    nit: str
    company_name: str
    sector: Optional[str] = None
    status: Optional[str] = "PROSPECTO"
    customer_type: Optional[str] = "EMPRESA"
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    observations: Optional[str] = None

class ContactCreate(BaseModel):
    customer_nit: str
    name: str
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_priority: Optional[bool] = False
    notes: Optional[str] = None

@router.get("")
def list_customers(status: Optional[str] = None, search: Optional[str] = None, limit: int = 500, offset: int = 0):
    with get_db() as db:
        with db.cursor() as cur:
            query = "SELECT * FROM customers WHERE 1=1"
            params = []
            if status:
                query += " AND status = %s"
                params.append(status)
            if search:
                query += " AND (company_name ILIKE %s OR nit ILIKE %s)"
                params.extend([f"%{search}%", f"%{search}%"])
            query += " ORDER BY company_name LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            cur.execute(query, params)
            return cur.fetchall()

@router.post("")
def create_customer(data: CustomerCreate):
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute("SELECT nit FROM customers WHERE nit = %s", (data.nit,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="El cliente ya existe.")
            cur.execute("""
                INSERT INTO customers (nit, company_name, sector, status, customer_type, email, phone, address, city, observations)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *;
            """, (data.nit, data.company_name, data.sector, data.status, data.customer_type, data.email, data.phone, data.address, data.city, data.observations))
            db.commit()
            return cur.fetchone()

@router.get("/{nit}")
def get_customer_detail(nit: str):
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute("SELECT * FROM customers WHERE nit = %s", (nit,))
            cust = cur.fetchone()
            if not cust:
                raise HTTPException(status_code=404, detail="Cliente no encontrado.")
            cur.execute("SELECT * FROM contacts WHERE customer_nit = %s ORDER BY id", (nit,))
            contacts = cur.fetchall()
            cur.execute("SELECT * FROM proposals WHERE customer_nit = %s ORDER BY created_at DESC", (nit,))
            proposals = cur.fetchall()
            cur.execute("SELECT * FROM commercial_logs WHERE customer_nit = %s ORDER BY occurred_at DESC", (nit,))
            logs = cur.fetchall()
            res = dict(cust)
            res.update({
                "customer": cust,
                "contacts": contacts,
                "proposals": proposals,
                "logs": logs
            })
            return res

@router.post("/contacts")
def add_contact(data: ContactCreate):
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute("""
                INSERT INTO contacts (customer_nit, name, role, email, phone, is_priority, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *;
            """, (data.customer_nit, data.name, data.role, data.email, data.phone, data.is_priority, data.notes))
            db.commit()
            return cur.fetchone()
