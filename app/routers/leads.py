import os
import re
import json
import hashlib
import urllib.request
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel, Field
from app.database import get_db

router = APIRouter(prefix="/leads", tags=["Ingesta de Leads B2B"])

VALID_TOKENS = set(filter(None, [
    os.getenv("N8N_API_KEY"),
    os.getenv("CRM_API_KEY", "dev_api_key_default"),
    "dev_secret_token"
]))

TIER_MAPPING = {
    "EXCEL_CHAOS_PURCHASING": {
        "tier": "Tier 1: Quick-Win Audit",
        "title": "Tier 1: Diagnóstico Operativo & Automatización de Entrada ($600 USD)",
        "value": 600.0,
        "scope": "Mapeo VSM de compras/inventario + 1 flujo crítico n8n para eliminar retrabajo en hojas de cálculo.",
    },
    "LACK_OF_ERP_TELEMETRY": {
        "tier": "Tier 2: Core Transformation",
        "title": "Tier 2: Transformación Operativa Integral & Telemetría Power BI ($2,200 USD)",
        "value": 2200.0,
        "scope": "Suite de automatizaciones n8n/Python + Dashboard Power BI Service conectado a ERP/fuentes de datos + garantía de 30 días.",
    },
    "MANUAL_ADMIN_REWORK": {
        "tier": "Tier 3: Fractional Retainer",
        "title": "Tier 3: Retainer Mensual de Acompañamiento y Telemetría ($750 USD/mes)",
        "value": 750.0,
        "scope": "Dirección fraccional de operaciones y automatización continua (12-15 horas/mes + monitoreo n8n).",
    },
}

class ProfessionalServiceLead(BaseModel):
    company_name: str
    nit: Optional[str] = None
    domain: Optional[str] = None
    sector: Optional[str] = "Comercial / Cadena de Suministro B2B"
    detected_pain: Optional[str] = "EXCEL_CHAOS_PURCHASING"
    contact_name: Optional[str] = None
    contact_role: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    consultative_pitch: Optional[str] = None
    city: Optional[str] = None
    source: Optional[str] = "pers_radar_b2b01"

def authenticate_request(authorization: Optional[str], x_api_key: Optional[str]):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
    elif x_api_key:
        token = x_api_key.strip()
        
    if token and token not in VALID_TOKENS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación de N8N inválido o no autorizado."
        )

def normalize_company_name(name: str) -> str:
    cleaned = re.sub(r'(?i)\b(s\.?a\.?s\.?|s\.?a\.?|ltda\.?|e\.?u\.?|inc\.?|corp\.?|llc)\b', '', name)
    return cleaned.strip()

@router.post("/professional-services", status_code=status.HTTP_201_CREATED)
def ingest_professional_service_lead(
    payload: ProfessionalServiceLead,
    authorization: Optional[str] = Header(None),
    x_portfolio_api_key: Optional[str] = Header(None)
):
    authenticate_request(authorization, x_portfolio_api_key)

    company_clean = normalize_company_name(payload.company_name)
    nit_val = payload.nit.strip() if payload.nit else None
    
    if not nit_val:
        # Generar identificador reproducible si no se cuenta con NIT formal inicial
        hash_suffix = hashlib.md5(payload.company_name.lower().encode('utf-8')).hexdigest()[:8].upper()
        nit_val = f"LEAD-{hash_suffix}"

    with get_db() as db:
        with db.cursor() as cur:
            # 1. Deduplicación y Blindaje de Clientes Activos
            cur.execute("""
                SELECT nit, company_name, status 
                FROM customers 
                WHERE nit = %s OR company_name ILIKE %s
                LIMIT 1;
            """, (nit_val, f"%{company_clean}%"))
            existing = cur.fetchone()

            if existing:
                if str(existing.get('status', '')).upper() == 'CLIENTE':
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="BLOCKED_ACTIVE_CLIENT: La empresa ya es un cliente activo registrado."
                    )
                target_nit = existing['nit']
            else:
                # 2. Inserción de Nueva Empresa en portfolio.customers
                obs_data = f"Dominio: {payload.domain or 'N/A'} | LinkedIn: {payload.linkedin_url or 'N/A'} | Origen: {payload.source}"
                cur.execute("""
                    INSERT INTO customers (nit, company_name, sector, status, customer_type, email, phone, city, observations)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING nit;
                """, (nit_val, payload.company_name, payload.sector, "PROSPECTO", "EMPRESA", payload.contact_email, payload.contact_phone, payload.city, obs_data))
                target_nit = cur.fetchone()['nit']

            # 3. Inserción de Contacto en portfolio.contacts
            if payload.contact_name:
                cur.execute("""
                    SELECT id FROM contacts 
                    WHERE customer_nit = %s AND (name ILIKE %s OR email = %s)
                    LIMIT 1;
                """, (target_nit, payload.contact_name, payload.contact_email))
                if not cur.fetchone():
                    cur.execute("""
                        INSERT INTO contacts (customer_nit, name, role, email, phone, is_priority, notes)
                        VALUES (%s, %s, %s, %s, %s, %s, %s);
                    """, (target_nit, payload.contact_name, payload.contact_role, payload.contact_email, payload.contact_phone, True, f"LinkedIn: {payload.linkedin_url or 'N/A'}"))

            # 4. Mapeo a Propuesta Comercial (Tier 1/2/3) en portfolio.proposals
            tier_info = TIER_MAPPING.get(payload.detected_pain, TIER_MAPPING["EXCEL_CHAOS_PURCHASING"])
            cur.execute("SELECT COUNT(*) FROM proposals;")
            p_count = (cur.fetchone() or {'count': 0})['count'] + 1
            prop_num = f"PROP-2026-{p_count:03d}"

            cur.execute("""
                INSERT INTO proposals (proposal_number, customer_nit, client_name, title, scope_description, estimated_value, status, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING proposal_number;
            """, (prop_num, target_nit, payload.company_name, tier_info["title"], tier_info["scope"], tier_info["value"], "CONTACTO_INICIAL", payload.consultative_pitch))

            # 5. Registro en Bitácora en portfolio.commercial_logs
            summary_log = f"Oportunidad calificada por N8N Radar ({payload.detected_pain}) -> {tier_info['tier']}"
            cur.execute("""
                INSERT INTO commercial_logs (customer_nit, interaction_type, summary, observations)
                VALUES (%s, %s, %s, %s);
            """, (target_nit, "PROSPECCION_AUTOMATICA", summary_log, payload.consultative_pitch))

            db.commit()

            return {
                "status": "success",
                "message": "Lead de servicios profesionales registrado exitosamente en CORALIS-PS.",
                "customer_nit": target_nit,
                "company_name": payload.company_name,
                "assigned_tier": tier_info["tier"],
                "proposal_number": prop_num,
                "estimated_value_usd": tier_info["value"]
            }

class DiagnosticBookingRequest(BaseModel):
    company_name: str
    contact_name: str
    contact_role: str
    email: str
    phone: str
    detected_pain: str = "EXCEL_CHAOS_PURCHASING"
    preferred_date: str
    preferred_time_slot: str
    source_reference: Optional[str] = "INBOUND_WEB_DIAGNOSTICO"

def send_telegram_booking_alert(company: str, contact: str, role: str, email: str, phone: str, pain: str, slot: str, prop_num: str):
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "7016343188")
    if not token:
        return False
    try:
        msg = (
            f"🚨 <b>¡NUEVA CITA VIRTUAL DE DIAGNÓSTICO AGENDADA! (Fallback Directo)</b>\n"
            f"🏢 <b>Empresa:</b> {company}\n"
            f"👤 <b>Contacto:</b> {contact} ({role})\n"
            f"📧 <b>Email:</b> {email}\n"
            f"📱 <b>WhatsApp:</b> {phone}\n"
            f"⚡ <b>Fricción Seleccionada:</b> {pain}\n"
            f"📅 <b>Fecha/Hora Solicitada:</b> {slot}\n"
            f"📋 <b>Propuesta Vinculada:</b> {prop_num}"
        )
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = json.dumps({
            "chat_id": chat_id,
            "text": msg,
            "parse_mode": "HTML"
        }).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"Alerta Telegram fallback: {e}")
        return False

def dispatch_booking_webhook(company: str, contact: str, role: str, email: str, phone: str, pain: str, slot: str, prop_num: str, ref: str):
    """
    Estrategia Híbrida Resiliente:
    1. Canal Primario: Envío al Webhook de N8N (pers_booking_sync01) en Tailscale o VPS local.
    2. Canal Secundario / Fallback: En caso de error o timeout de N8N, disparo directo a Telegram API.
    """
    webhook_candidates = [
        os.getenv("N8N_BOOKING_WEBHOOK_URL", "http://100.79.61.18:5678/webhook/portfolio-booking"),
        "http://127.0.0.1:5678/webhook/portfolio-booking"
    ]
    webhook_key = os.getenv("N8N_BOOKING_WEBHOOK_KEY", "alacor_n8n_crm_sec_2026")
    body = {
        "company_name": company,
        "contact_name": contact,
        "contact_role": role,
        "email": email,
        "phone": phone,
        "detected_pain": pain,
        "preferred_slot": slot,
        "proposal_number": prop_num,
        "ref": ref
    }
    encoded_body = json.dumps(body).encode("utf-8")

    dispatched = False
    for url in webhook_candidates:
        try:
            req = urllib.request.Request(
                url,
                data=encoded_body,
                headers={
                    "Content-Type": "application/json",
                    "X-Portfolio-Booking-Key": webhook_key
                }
            )
            with urllib.request.urlopen(req, timeout=4) as resp:
                if resp.status in (200, 201):
                    dispatched = True
                    print(f"[OK] Webhook de agendamiento entregado exitosamente a N8N ({url})")
                    break
        except Exception as e:
            print(f"[WARN] Error alcanzando webhook N8N en {url}: {e}")
            continue

    if not dispatched:
        print("[WARN] Canal primario N8N no disponible. Disparando Canal Secundario de Respaldo a Telegram...")
        send_telegram_booking_alert(company, contact, role, email, phone, pain, slot, prop_num)

    return dispatched

@router.post("/diagnostic-booking", status_code=status.HTTP_201_CREATED)
def book_operational_diagnostic(payload: DiagnosticBookingRequest):
    company_clean = normalize_company_name(payload.company_name)
    hash_suffix = hashlib.md5(payload.company_name.lower().encode('utf-8')).hexdigest()[:8].upper()
    nit_val = f"LEAD-{hash_suffix}"

    with get_db() as db:
        with db.cursor() as cur:
            # 1. Buscar o registrar en portfolio.customers
            cur.execute("""
                SELECT nit, company_name FROM customers 
                WHERE nit = %s OR company_name ILIKE %s
                LIMIT 1;
            """, (nit_val, f"%{company_clean}%"))
            existing = cur.fetchone()

            if existing:
                target_nit = existing['nit']
                cur.execute("""
                    UPDATE customers 
                    SET status = 'PROSPECTO_AGENDADO', phone = COALESCE(%s, phone), email = COALESCE(%s, email)
                    WHERE nit = %s;
                """, (payload.phone, payload.email, target_nit))
            else:
                cur.execute("""
                    INSERT INTO customers (nit, company_name, sector, status, customer_type, email, phone, observations)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING nit;
                """, (nit_val, payload.company_name, "Comercial / B2B", "PROSPECTO_AGENDADO", "EMPRESA", payload.email, payload.phone, f"Origen: {payload.source_reference}"))
                target_nit = cur.fetchone()['nit']

            # 2. Registrar o actualizar contacto en portfolio.contacts
            cur.execute("""
                SELECT id FROM contacts 
                WHERE customer_nit = %s AND (name ILIKE %s OR email = %s)
                LIMIT 1;
            """, (target_nit, payload.contact_name, payload.email))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO contacts (customer_nit, name, role, email, phone, is_priority, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s);
                """, (target_nit, payload.contact_name, payload.contact_role, payload.email, payload.phone, True, "Contacto de Agendamiento Inbound"))

            # 3. Vincular o crear propuesta en portfolio.proposals
            cur.execute("""
                SELECT id, proposal_number FROM proposals 
                WHERE customer_nit = %s 
                ORDER BY created_at DESC LIMIT 1;
            """, (target_nit,))
            prop = cur.fetchone()

            tier_info = TIER_MAPPING.get(payload.detected_pain, TIER_MAPPING["EXCEL_CHAOS_PURCHASING"])
            slot_str = f"{payload.preferred_date} ({payload.preferred_time_slot})"

            if prop:
                prop_num = prop['proposal_number']
                cur.execute("""
                    UPDATE proposals 
                    SET status = 'DIAGNOSTIC_SCHEDULED', notes = COALESCE(notes || E'\\n', '') || %s, updated_at = NOW()
                    WHERE id = %s;
                """, (f"Cita Virtual Agendada: {slot_str}", prop['id']))
            else:
                cur.execute("SELECT COUNT(*) FROM proposals;")
                p_count = (cur.fetchone() or {'count': 0})['count'] + 1
                prop_num = f"PROP-2026-{p_count:03d}"
                cur.execute("""
                    INSERT INTO proposals (proposal_number, customer_nit, client_name, title, scope_description, estimated_value, status, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                """, (prop_num, target_nit, payload.company_name, tier_info["title"], tier_info["scope"], tier_info["value"], "DIAGNOSTIC_SCHEDULED", f"Cita Agendada: {slot_str}"))

            # 4. Registrar en portfolio.commercial_logs
            summary_log = f"Cita de Diagnóstico Agendada para el {slot_str}"
            obs_log = f"Contacto: {payload.contact_name} ({payload.contact_role}) | Tel: {payload.phone} | Fricción: {payload.detected_pain}"
            cur.execute("""
                INSERT INTO commercial_logs (customer_nit, interaction_type, summary, observations)
                VALUES (%s, %s, %s, %s);
            """, (target_nit, "AGENDAMIENTO_VIRTUAL", summary_log, obs_log))

            db.commit()

            # 5. Despacho Híbrido Resiliente (N8N pers_booking_sync01 + Telegram Fallback)
            dispatch_booking_webhook(
                company=payload.company_name,
                contact=payload.contact_name,
                role=payload.contact_role,
                email=payload.email,
                phone=payload.phone,
                pain=payload.detected_pain,
                slot=slot_str,
                prop_num=prop_num,
                ref=payload.source_reference or "INBOUND_WEB_DIAGNOSTICO"
            )

            return {
                "status": "success",
                "message": "Cita virtual de diagnóstico agendada correctamente.",
                "customer_nit": target_nit,
                "proposal_number": prop_num,
                "scheduled_slot": slot_str
            }
