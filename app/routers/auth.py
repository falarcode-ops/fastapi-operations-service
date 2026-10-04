from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Autenticación"])

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(payload: LoginRequest):
    # En Portfolio CRM (entorno personal de consultoría), se provee acceso autenticado para Fabián Alarcón
    return {
        "status": "success",
        "token": "portfolio_session_sec_2026",
        "user": {
            "username": "fabian.alarcon",
            "full_name": "Fabián Andrés Alarcón Chávez",
            "email": payload.email or "fabian.alarcon@consulting.co",
            "role": "ADMIN"
        }
    }

@router.get("/me")
def get_current_user():
    return {
        "username": "fabian.alarcon",
        "full_name": "Fabián Andrés Alarcón Chávez",
        "role": "ADMIN"
    }
