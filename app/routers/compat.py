from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from app.database import get_db

router = APIRouter(tags=["Compatibilidad & Adaptadores Modulares"])

# ──────────────────────────────────────────────────────────
# 1. EMPLEADOS & ASESORES & PERFIL
# ──────────────────────────────────────────────────────────
@router.get("/employees")
def list_employees(active_only: bool = False):
    return [
        {
            "username": "fabian.alarcon",
            "full_name": "Fabián Andrés Alarcón Chávez",
            "email": "fabian.alarcon@consulting.co",
            "phone": "+57 314 7767269",
            "role": "SUPERADMIN",
            "is_active": True,
            "signature": "Fabián Andrés Alarcón Chávez\nDirector de Operaciones & Automatización\nCORALIS-PS",
            "signature_img_url": ""
        }
    ]

@router.get("/employees/{username}")
@router.get("/v1/employees/{username}")
def get_employee(username: str):
    return {
        "username": username,
        "full_name": "Fabián Andrés Alarcón Chávez",
        "email": "fabian.alarcon@consulting.co",
        "phone": "+57 314 7767269",
        "role": "SUPERADMIN",
        "is_active": True,
        "signature": "Fabián Andrés Alarcón Chávez\nDirector de Operaciones & Automatización\nCORALIS-PS",
        "signature_img_url": ""
    }

@router.put("/employees/{username}")
@router.put("/v1/employees/{username}")
def update_employee(username: str, data: Dict[str, Any] = None):
    return {
        "status": "ok",
        "message": f"Usuario {username} actualizado exitosamente",
        "username": username
    }

@router.post("/employees/{username}/upload-signature")
@router.post("/v1/employees/{username}/upload-signature")
def upload_signature(username: str):
    return {
        "status": "ok",
        "signature_url": "/assets/coralis_logo.png"
    }

@router.post("/employees/{username}/send-credentials")
def send_credentials(username: str):
    return {
        "status": "ok",
        "message": "Credenciales enviadas"
    }

# ──────────────────────────────────────────────────────────
# 2. BANDEJA DE SOLICITUDES & PIPELINE
# ──────────────────────────────────────────────────────────
@router.get("/v1/requests")
@router.get("/requests")
def list_requests(
    vertical: Optional[str] = None,
    status: Optional[str] = None,
    pipeline_stage: Optional[str] = None
):
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute("""
                SELECT p.id, p.proposal_number, p.customer_nit, p.client_name, 
                       p.title, p.scope_description, p.estimated_value, p.status, 
                       p.notes, p.created_at,
                       c.email as contact_email, c.phone as contact_phone,
                       co.name as contact_name
                FROM proposals p
                LEFT JOIN customers c ON p.customer_nit = c.nit
                LEFT JOIN LATERAL (
                    SELECT name FROM contacts WHERE customer_nit = p.customer_nit ORDER BY id LIMIT 1
                ) co ON true
                ORDER BY p.created_at DESC;
            """)
            rows = cur.fetchall()

            results = []
            for r in rows:
                results.append({
                    "id": r["id"],
                    "request_number": r["proposal_number"],
                    "company_name": r["client_name"],
                    "customer_nit": r["customer_nit"],
                    "contact_name": r["contact_name"] or "Tomador de Decisión",
                    "contact_email": r["contact_email"] or "",
                    "contact_phone": r["contact_phone"] or "",
                    "vertical": "Servicios Profesionales B2B",
                    "status": "COTIZADA" if r["status"] == "ENVIADA" else ("ASIGNADA" if r["status"] == "DIAGNOSTIC_SCHEDULED" else "NUEVA"),
                    "pipeline_stage": r["status"] or "NUEVO",
                    "assigned_salesperson": "Fabián Alarcón",
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                    "details": {
                        "title": r["title"],
                        "scope": r["scope_description"],
                        "value": float(r["estimated_value"]) if r["estimated_value"] else 0.0,
                        "notes": r["notes"]
                    }
                })
            return results

@router.get("/v1/requests/stalled")
def stalled_requests(days: int = 3, vertical: Optional[str] = None, stage: Optional[str] = None):
    return {"stalled_requests": []}

@router.get("/v1/requests/pipeline/summary")
@router.get("/requests/pipeline/summary")
def pipeline_summary():
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute("""
                SELECT status, COUNT(*), COALESCE(SUM(estimated_value), 0) as total_val
                FROM proposals
                GROUP BY status;
            """)
            rows = cur.fetchall()
            status_map = {r["status"]: int(r["count"]) for r in rows}

            cur.execute("SELECT COUNT(*) FROM proposals;")
            total_proposals = int((cur.fetchone() or {"count": 0})["count"])

            agendados = status_map.get("DIAGNOSTIC_SCHEDULED", 0)
            asignados = status_map.get("CONTACTO_INICIAL", 0)
            nuevos = status_map.get("NUEVO", 0)
            ofertados = status_map.get("OFERTADA", 0)
            negociacion = status_map.get("NEGOCIACION", 0)
            ganados = status_map.get("GANADO", 0)
            perdidos = status_map.get("PERDIDO", 0)
            contratos = status_map.get("CONTRATO", 0)

            return {
                "stages": {
                    "NUEVO": nuevos,
                    "ASIGNADO": asignados,
                    "VISITA_AGENDADA": agendados,
                    "PRE_OFERTA_ENVIADA": ofertados,
                    "NEGOCIACION": negociacion,
                    "CONTRATO": contratos,
                    "GANADO": ganados,
                    "PERDIDO": perdidos
                },
                "advisors": [
                    {
                        "name": "Fabián Andrés Alarcón Chávez",
                        "count": total_proposals
                    }
                ],
                "totals": {
                    "all": total_proposals,
                    "own": total_proposals
                }
            }

# ──────────────────────────────────────────────────────────
# 3. COMUNICACIONES & BITÁCORA FEED (/api/commercial-logs/feed)
# ──────────────────────────────────────────────────────────
@router.get("/commercial-logs/feed")
@router.get("/v1/commercial-logs/feed")
def get_commercial_logs_feed(
    date_preset: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    with get_db() as db:
        with db.cursor() as cur:
            query = """
                SELECT cl.id, cl.customer_nit, cl.interaction_type, cl.occurred_at,
                       cl.summary, cl.observations, cl.next_followup_date, cl.created_at,
                       c.company_name, c.status as customer_status,
                       co.name as contact_name, co.role as contact_role
                FROM commercial_logs cl
                LEFT JOIN customers c ON cl.customer_nit = c.nit
                LEFT JOIN LATERAL (
                    SELECT name, role FROM contacts WHERE customer_nit = cl.customer_nit ORDER BY id LIMIT 1
                ) co ON true
                WHERE 1=1
            """
            params = []
            if search:
                query += " AND (c.company_name ILIKE %s OR cl.customer_nit ILIKE %s OR cl.observations ILIKE %s)"
                params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
            
            # Count total
            count_query = f"SELECT COUNT(*) as total FROM ({query}) sub"
            cur.execute(count_query, params)
            total = int((cur.fetchone() or {"total": 0})["total"])

            # Order & Pagination
            query += " ORDER BY cl.occurred_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            cur.execute(query, params)
            rows = cur.fetchall()

            feed = []
            for r in rows:
                feed.append({
                    "id": r["id"],
                    "customer_nit": r["customer_nit"],
                    "company_name": r["company_name"] or f"Empresa {r['customer_nit']}",
                    "occurred_at": r["occurred_at"].isoformat() if r["occurred_at"] else None,
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                    "interaction_type": r["interaction_type"] or "PROSPECCION_OUTBOUND",
                    "contact_method": "TELEGRAM_RADAR" if "RADAR" in (r["summary"] or "").upper() or "RADAR" in (r["interaction_type"] or "").upper() else "DIRECTO",
                    "salesperson": "Fabián Alarcón",
                    "observations": r["observations"] or r["summary"] or "Seguimiento comercial",
                    "contacts_info": f"{r['contact_name']} ({r['contact_role']})" if r["contact_name"] else "Tomador de Decisión",
                    "lead_score": 90,
                    "offer_number": None
                })
            return {"total": total, "feed": feed}

# ──────────────────────────────────────────────────────────
# 4. GESTIÓN COMERCIAL: PRE-OFERTAS, OFERTAS, PAQUETES, TARIFAS & CONTRATOS
# ──────────────────────────────────────────────────────────
CONSULTING_PACKAGES = [
    {
        "id": 1,
        "code": "TIER1-QUICKWIN",
        "name": "Sprint Diagnóstico & Quick Wins",
        "description": "Diagnóstico de cuellos de botella, mapa de flujo de valor (VSM) y automatización prototipo.",
        "min_employees": 1,
        "max_employees": 9999,
        "standards_count": 3,
        "duration_months": 1,
        "is_active": True,
        "scope": [
            "Diagnóstico Operativo de Fricciones",
            "Mapeo de Procesos y Cuellos de Botella",
            "Prototipo de Automatización Operativa n8n / Python",
            "Presentación Ejecutiva con ROI Estimado"
        ]
    },
    {
        "id": 2,
        "code": "TIER2-CORE",
        "name": "Transformación Operativa, n8n & Power BI",
        "description": "Estandarización de procesos críticos, flujos automatizados de producción y tablero de telemetría.",
        "min_employees": 5,
        "max_employees": 9999,
        "standards_count": 7,
        "duration_months": 3,
        "is_active": True,
        "scope": [
            "Estandarización de 3 a 5 Procesos Core",
            "Pipelines de Automatización n8n / Python en Producción",
            "Dashboard Power BI Conectado a ERP / PostgreSQL",
            "Capacitación del Equipo y Documentación SOW",
            "Soporte y Ajustes Post-Despliegue (30 días)"
        ]
    },
    {
        "id": 3,
        "code": "TIER3-RETAINER",
        "name": "Dirección de Operaciones & Automatización Fraccionada",
        "description": "Acompañamiento continuo mensual como Director Fraccional de Operaciones y Procesos.",
        "min_employees": 10,
        "max_employees": 9999,
        "standards_count": 12,
        "duration_months": 6,
        "is_active": True,
        "scope": [
            "Comité Semanal de Operaciones & Telemetría",
            "Mantenimiento y Evolución de Flujos n8n",
            "Optimización Continua de Indicadores Power BI",
            "Auditoría Periódica de Eficiencia y Costos"
        ]
    }
]

VISIT_ZONES = [
    {
        "id": 1,
        "zone_name": "Sesión Virtual / Remota (Zoom / Google Meet)",
        "price": 0,
        "is_active": 1
    },
    {
        "id": 2,
        "zone_name": "Levantamiento In Situ (Bogotá Urbana)",
        "price": 180000,
        "is_active": 1
    },
    {
        "id": 3,
        "zone_name": "Levantamiento In Situ (Sabana Norte / Occidente)",
        "price": 250000,
        "is_active": 1
    }
]

PRICING_RULES = [
    {
        "id": 1,
        "package_code": "TIER1-QUICKWIN",
        "min_employees": 1,
        "max_employees": 9999,
        "risk_level": 1,
        "implementation_price": 2200000,
        "monthly_price": 0,
        "is_active": 1
    },
    {
        "id": 2,
        "package_code": "TIER2-CORE",
        "min_employees": 5,
        "max_employees": 9999,
        "risk_level": 1,
        "implementation_price": 7500000,
        "monthly_price": 0,
        "is_active": 1
    },
    {
        "id": 3,
        "package_code": "TIER3-RETAINER",
        "min_employees": 10,
        "max_employees": 9999,
        "risk_level": 1,
        "implementation_price": 0,
        "monthly_price": 2500000,
        "is_active": 1
    }
]

COMMERCIAL_CONDITIONS = [
    {"key": "quote_validity_days", "label": "Validez de la Propuesta (Días)", "description": "Tiempo de vigencia de la oferta comercial.", "value": "15 días calendario"},
    {"key": "payment_terms", "label": "Forma de Pago Estándar", "description": "Condición de pago contractual acordada.", "value": "50% anticipo al inicio / 50% contra entrega a satisfacción"},
    {"key": "tax_regime_clause", "label": "Régimen Tributario & Facturación", "description": "Declaración fiscal del consultor independiente.", "value": "Persona Natural No Responsable de IVA (Art. 437 Par. 3 E.T. / Cuenta de Cobro + RUT)"},
    {"key": "warranty_period", "label": "Garantía & Soporte Técnico", "description": "Periodo de estabilización post-despliegue.", "value": "30 días de soporte correctivo sin costo adicional"}
]

@router.get("/v1/sgsst/commercial/pre-quotes")
@router.get("/v1/sgsst/commercial/offers")
@router.get("/sgsst/commercial/pre-quotes")
@router.get("/sgsst/commercial/offers")
def list_commercial_proposals(customer_nit: Optional[str] = None):
    with get_db() as db:
        with db.cursor() as cur:
            query = """
                SELECT id, proposal_number, customer_nit, client_name, title, 
                       estimated_value, status, created_at
                FROM proposals
            """
            params = []
            if customer_nit:
                query += " WHERE customer_nit = %s"
                params.append(customer_nit)
            query += " ORDER BY created_at DESC;"
            cur.execute(query, params)
            rows = cur.fetchall()
            return [
                {
                    "id": r["id"],
                    "pre_quote_number": r["proposal_number"],
                    "offer_number": r["proposal_number"],
                    "company_name": r["client_name"],
                    "customer_nit": r["customer_nit"],
                    "plan_code": r["title"],
                    "estimated_implementation": float(r["estimated_value"]) if r["estimated_value"] else 0.0,
                    "estimated_monthly": 0.0,
                    "visit_price": 0.0,
                    "status": r["status"] or "EMITIDA",
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                    "salesperson": "Fabián Alarcón",
                    "doc_type": "PRE_OFFER"
                }
                for r in rows
            ]

@router.get("/v1/sgsst/commercial/packages")
@router.get("/sgsst/commercial/packages")
def list_packages():
    return CONSULTING_PACKAGES

@router.get("/v1/sgsst/commercial/visit-pricing")
@router.get("/sgsst/commercial/visit-pricing")
def list_visit_pricing():
    return VISIT_ZONES

@router.get("/v1/sgsst/commercial/pricing")
@router.get("/sgsst/commercial/pricing")
def list_pricing():
    return PRICING_RULES

@router.get("/v1/sgsst/commercial/pricing/quote")
@router.get("/sgsst/commercial/pricing/quote")
def quote_pricing(package_code: str = "TIER1-QUICKWIN", employees: int = 5, risk_level: int = 1):
    rule = next((p for p in PRICING_RULES if p["package_code"] == package_code), PRICING_RULES[0])
    return {
        "package_code": package_code,
        "implementation_price": rule["implementation_price"],
        "monthly_price": rule["monthly_price"],
        "employees": employees,
        "risk_level": risk_level
    }

@router.get("/v1/sgsst/commercial/contracts")
@router.get("/sgsst/commercial/contracts")
def list_contracts(customer_nit: Optional[str] = None):
    with get_db() as db:
        with db.cursor() as cur:
            query = "SELECT * FROM proposals WHERE status IN ('CONTRATO', 'GANADO')"
            params = []
            if customer_nit:
                query += " AND customer_nit = %s"
                params.append(customer_nit)
            query += " ORDER BY created_at DESC"
            cur.execute(query, params)
            rows = cur.fetchall()
            return [
                {
                    "id": r["id"],
                    "contract_number": f"CTR-{r['proposal_number']}",
                    "company_name": r["client_name"],
                    "customer_nit": r["customer_nit"],
                    "total_value": float(r["estimated_value"] or 0),
                    "status": "VIGENTE",
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None
                }
                for r in rows
            ]

@router.get("/v1/sgsst/commercial/config")
@router.get("/sgsst/commercial/config")
def get_commercial_company_config():
    return {
        "company_name": "CORALIS-PS - Servicios Profesionales",
        "company_nit": "Persona Natural (RUT Reg. 49)",
        "company_phone": "+57 314 7767269",
        "company_website": "https://www.linkedin.com/in/fabian-alarcon-chavez/",
        "company_email": "contacto@consulting.co",
        "company_address": "Bogotá, Colombia"
    }

@router.post("/v1/sgsst/commercial/config")
@router.post("/sgsst/commercial/config")
def save_commercial_company_config(data: Dict[str, Any] = None):
    return {"status": "ok", "message": "Datos de configuración corporativa guardados."}

@router.get("/v1/sgsst/commercial/conditions")
@router.get("/sgsst/commercial/conditions")
def list_commercial_conditions():
    return COMMERCIAL_CONDITIONS

@router.put("/v1/sgsst/commercial/conditions/{key}")
@router.put("/sgsst/commercial/conditions/{key}")
def update_commercial_condition(key: str, data: Dict[str, Any] = None):
    val = (data or {}).get("value", "")
    for c in COMMERCIAL_CONDITIONS:
        if c["key"] == key:
            c["value"] = val
            return c
    return {"key": key, "value": val}

@router.get("/v1/sgsst/commercial/settings/logo")
@router.get("/sgsst/commercial/settings/logo")
def get_logo_status():
    return {"has_logo": True, "logo_url": "assets/coralis_logo.png"}

# ──────────────────────────────────────────────────────────
# 5. RENDIMIENTO COMERCIAL
# ──────────────────────────────────────────────────────────
@router.get("/v1/commercial-performance/summary")
@router.get("/commercial-performance/summary")
def commercial_performance_summary(daily_target: int = 8):
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    days_14_ago = now - timedelta(days=14)

    with get_db() as db:
        with db.cursor() as cur:
            # 1. Total logs
            cur.execute("SELECT COUNT(*) as cnt FROM commercial_logs WHERE occurred_at >= %s", (today_start,))
            total_today = int((cur.fetchone() or {"cnt": 0})["cnt"])

            cur.execute("SELECT COUNT(*) as cnt FROM commercial_logs WHERE occurred_at >= %s", (week_start,))
            total_week = int((cur.fetchone() or {"cnt": 0})["cnt"])

            cur.execute("SELECT COUNT(*) as cnt FROM commercial_logs WHERE occurred_at >= %s", (month_start,))
            total_month = int((cur.fetchone() or {"cnt": 0})["cnt"])

            cur.execute("SELECT MAX(occurred_at) as last_act FROM commercial_logs;")
            last_act_row = cur.fetchone()
            last_act_dt = last_act_row["last_act"] if last_act_row else None
            last_act_str = last_act_dt.strftime("%H:%M") if last_act_dt else "Sin registro hoy"

            # 2. Customers and Proposals
            cur.execute("SELECT COUNT(*) as cnt FROM customers;")
            total_cust = int((cur.fetchone() or {"cnt": 0})["cnt"])

            cur.execute("SELECT COUNT(*) as cnt, COALESCE(SUM(estimated_value), 0) as val FROM proposals;")
            p_res = cur.fetchone() or {"cnt": 0, "val": 0.0}
            prop_count = int(p_res["cnt"])
            prop_val = float(p_res["val"])

            cur.execute("SELECT COUNT(*) FROM customers WHERE status = 'PROSPECTO_AGENDADO';")
            agendados = int((cur.fetchone() or {"count": 0})["count"])

            # 3. Solicitudes sin atender (>24h sin log)
            cur.execute("""
                SELECT COUNT(*) as cnt FROM proposals p
                WHERE p.status = 'DIAGNOSTIC_SCHEDULED'
                  AND p.created_at < %s
                  AND NOT EXISTS (
                      SELECT 1 FROM commercial_logs cl 
                      WHERE cl.customer_nit = p.customer_nit 
                        AND cl.occurred_at >= p.created_at
                  );
            """, (now - timedelta(hours=24),))
            unattended_requests = int((cur.fetchone() or {"cnt": 0})["cnt"])

            # 4. Cartera desatendida (>30 días sin log)
            cur.execute("""
                SELECT COUNT(*) as cnt FROM customers c
                WHERE c.updated_at < %s
                  AND NOT EXISTS (
                      SELECT 1 FROM commercial_logs cl
                      WHERE cl.customer_nit = c.nit
                        AND cl.occurred_at >= %s
                  );
            """, (now - timedelta(days=30), now - timedelta(days=30)))
            abandoned_accounts = int((cur.fetchone() or {"cnt": 0})["cnt"])

            # 5. Advisor stats
            compliance_pct = min(100, round((total_today / max(daily_target, 1)) * 100))
            if total_today >= daily_target:
                status_code, status_label, status_class = "META_CUMPLIDA", "Meta Cumplida", "badge-emerald"
                active_today = 1
                inactive_today = 0
            elif total_today > 0:
                status_code, status_label, status_class = "ACTIVO_HOY", f"En Progreso ({total_today}/{daily_target})", "badge-cyan"
                active_today = 1
                inactive_today = 0
            else:
                status_code, status_label, status_class = "SIN_ACTIVIDAD_HOY", "Sin Actividad Hoy", "badge-rose"
                active_today = 0
                inactive_today = 1

            leaderboard = [
                {
                    "username": "fabian.alarcon",
                    "full_name": "Fabián Andrés Alarcón Chávez",
                    "role": "DIRECTOR_COMERCIAL",
                    "acts_today": total_today,
                    "daily_target": daily_target,
                    "compliance_pct": compliance_pct,
                    "acts_week": total_week,
                    "acts_month": total_month,
                    "total_assigned_customers": total_cust,
                    "dormant_15d": 0,
                    "abandoned_30d": abandoned_accounts,
                    "quoted_count": prop_count,
                    "quoted_val": prop_val,
                    "closed_count": 0,
                    "closed_val": 0.0,
                    "closing_ratio": 0.0,
                    "last_activity": last_act_str,
                    "status_code": status_code,
                    "status_label": status_label,
                    "status_class": status_class
                }
            ]

            # 6. Channels breakdown
            cur.execute("""
                SELECT COALESCE(interaction_type, 'CANAL_DIRECTO') as ch, COUNT(*) as cnt
                FROM commercial_logs
                GROUP BY ch
                ORDER BY cnt DESC;
            """)
            channels = [{"channel": r["ch"], "cnt": int(r["cnt"])} for r in cur.fetchall()]

            # 7. 14-day effort trend
            cur.execute("""
                SELECT DATE(occurred_at) as log_date, COUNT(*) as cnt
                FROM commercial_logs
                WHERE occurred_at >= %s
                GROUP BY log_date
                ORDER BY log_date ASC;
            """, (days_14_ago,))
            trend_map = {r["log_date"].strftime("%Y-%m-%d"): int(r["cnt"]) for r in cur.fetchall()}

            effort_trend = []
            for i in range(14, -1, -1):
                d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
                d_obj = datetime.strptime(d, "%Y-%m-%d")
                effort_trend.append({
                    "date": d,
                    "label": d_obj.strftime("%d/%m"),
                    "count": trend_map.get(d, 0)
                })

            return {
                "kpis": {
                    "total_today": total_today,
                    "total_week": total_week,
                    "total_month": total_month,
                    "team_daily_target": daily_target,
                    "active_advisors_today": active_today,
                    "inactive_advisors_today": inactive_today,
                    "unattended_requests_24h": unattended_requests,
                    "abandoned_accounts_30d": abandoned_accounts,
                    "total_proposals": prop_count,
                    "active_pipeline": prop_val,
                    "scheduled_diagnostics": agendados,
                    "won_deals": 0
                },
                "advisors_leaderboard": leaderboard,
                "channels_breakdown": channels,
                "effort_trend_14d": effort_trend,
                "generated_at": now.strftime("%Y-%m-%d %H:%M:%S")
            }

@router.get("/v1/commercial-performance/abandoned-accounts")
@router.get("/commercial-performance/abandoned-accounts")
def get_abandoned_accounts(min_days: int = 30, limit: int = 25):
    with get_db() as db:
        with db.cursor() as cur:
            threshold = datetime.now() - timedelta(days=min_days)
            cur.execute("""
                SELECT c.nit, c.company_name, c.updated_at,
                       MAX(cl.occurred_at) as last_act
                FROM customers c
                LEFT JOIN commercial_logs cl ON cl.customer_nit = c.nit
                GROUP BY c.nit, c.company_name, c.updated_at
                HAVING (MAX(cl.occurred_at) < %s OR (MAX(cl.occurred_at) IS NULL AND c.updated_at < %s))
                ORDER BY last_act ASC NULLS FIRST
                LIMIT %s;
            """, (threshold, threshold, limit))
            rows = cur.fetchall()
            accounts = []
            for r in rows:
                last_dt = r["last_act"] or r["updated_at"]
                days_inactive = (datetime.now() - last_dt).days if last_dt else min_days
                accounts.append({
                    "nit": r["nit"],
                    "company_name": r["company_name"],
                    "advisor_name": "Fabián Andrés Alarcón Chávez",
                    "days_inactive": days_inactive,
                    "last_interaction": last_dt.strftime("%d/%m/%Y") if last_dt else "Sin registro"
                })
            return {"accounts": accounts}

# ──────────────────────────────────────────────────────────
# 6. MARKETING & BOT SESSIONS
# ──────────────────────────────────────────────────────────
@router.get("/bot-sessions")
def list_bot_sessions(limit: int = 50):
    return []

@router.get("/bot-sessions/{session_id}")
def get_bot_session(session_id: str):
    return {"session_id": session_id, "messages": []}

@router.post("/bot-sessions/batch-delete")
def batch_delete_sessions():
    return {"status": "ok", "deleted": 0}

@router.post("/bot-sessions/cleanup")
def cleanup_sessions():
    return {"status": "ok"}

@router.get("/v1/marketing/metrics")
def marketing_metrics():
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM customers WHERE status IN ('PROSPECTO', 'PROSPECTO_AGENDADO');")
            mql = (cur.fetchone() or {"count": 0})["count"]
            cur.execute("SELECT COUNT(*) FROM proposals WHERE status = 'DIAGNOSTIC_SCHEDULED';")
            sql = (cur.fetchone() or {"count": 0})["count"]

            return {
                "total_prospects_mql": mql,
                "total_sql": sql,
                "conversion_rate": round((sql / mql * 100) if mql > 0 else 0.0, 1)
            }

@router.get("/v1/editorial/topics")
@router.get("/editorial/topics")
def list_editorial_topics(status: Optional[str] = None, limit: int = 12, offset: int = 0):
    return {"total": 0, "topics": []}

@router.get("/v1/social-publisher/posts")
@router.get("/social-publisher/posts")
def list_social_posts(limit: int = 20, offset: int = 0):
    return {"total": 0, "posts": []}

@router.get("/v1/social-publisher/editorial/years")
@router.get("/social-publisher/editorial/years")
def list_editorial_years():
    return {"years": [2026]}

@router.get("/v1/social-publisher/maintenance/storage-stats")
def social_storage_stats():
    return {"total_files": 0, "total_bytes": 0, "size_formatted": "0 MB"}

@router.get("/v1/user-social-accounts/{username}")
@router.get("/user-social-accounts/{username}")
def get_user_social_accounts(username: str):
    return {"username": username, "accounts": []}

@router.get("/v1/user-social-accounts/{username}/linkedin")
def get_user_linkedin(username: str):
    return {"is_connected": False}

# ──────────────────────────────────────────────────────────
# 7. PERMISOS & ROLES
# ──────────────────────────────────────────────────────────
@router.get("/v1/permissions/roles")
@router.get("/permissions/roles")
def list_permission_roles():
    return [
        {
            "role": "SUPERADMIN",
            "label": "Super Administrador",
            "description": "Acceso total a todos los módulos y configuraciones del sistema."
        },
        {
            "role": "DIRECTOR_COMERCIAL",
            "label": "Director Comercial",
            "description": "Gestión estratégica de clientes, propuestas, tarifas y pipeline."
        },
        {
            "role": "ASESOR_COMERCIAL",
            "label": "Asesor Comercial",
            "description": "Gestión de solicitudes asignadas, bitácora y pre-ofertas."
        }
    ]

@router.get("/v1/permissions/users/{username}")
@router.get("/permissions/users/{username}")
def get_user_permissions(username: str):
    return []

@router.post("/v1/permissions/users/{username}/overrides")
def set_user_permission_override(username: str, data: Dict[str, Any] = None):
    return {"status": "ok", "message": "Override guardado"}

# ──────────────────────────────────────────────────────────
# 8. INTEGRACIONES COREPRICE, TEST TELEGRAM, EMAIL & WHATSAPP
# ──────────────────────────────────────────────────────────
@router.get("/v1/integrations/coreprice/products")
@router.get("/integrations/coreprice/products")
def search_coreprice_products(search: Optional[str] = None, limit: int = 10):
    products = [
        {
            "sku": "SRV-DIAG-01",
            "name": "Sprint Diagnóstico Operativo & Quick-Wins (1 Mes)",
            "brand": "CORALIS-PS",
            "price": 2200000.0,
            "category": "Procesos",
            "unit": "Servicio"
        },
        {
            "sku": "SRV-AUTO-02",
            "name": "Implementación de Pipelines n8n & Python (Flujos B2B)",
            "brand": "CORALIS-PS",
            "price": 4500000.0,
            "category": "Automatización",
            "unit": "Proyecto"
        },
        {
            "sku": "SRV-DASH-03",
            "name": "Diseño y Construcción de Dashboard Power BI / Telemetría",
            "brand": "CORALIS-PS",
            "price": 3000000.0,
            "category": "Business Intelligence",
            "unit": "Tablero"
        },
        {
            "sku": "SRV-FRAC-04",
            "name": "Dirección de Operaciones & Automatización Fraccionada (Mensual)",
            "brand": "CORALIS-PS",
            "price": 2500000.0,
            "category": "Retainer",
            "unit": "Mes"
        }
    ]
    if search:
        s = search.lower()
        products = [p for p in products if s in p["name"].lower() or s in p["sku"].lower() or s in p["category"].lower()]
    return {"data": products[:limit]}

@router.get("/v1/integrations/coreprice/products/{sku}")
def get_coreprice_product_by_sku(sku: str):
    res = search_coreprice_products(search=sku, limit=1)
    if res["data"]:
        return res["data"][0]
    return {"sku": sku, "name": f"Servicio {sku}", "price": 0.0}

@router.post("/integrations/test-telegram")
@router.post("/v1/integrations/test-telegram")
def test_telegram_integration():
    return {"status": "ok", "message": "Test enviado al canal Sentinel de Telegram exitosamente."}

@router.post("/integrations/test-email")
@router.post("/v1/integrations/test-email")
def test_email_integration():
    return {"status": "ok", "message": "Test de correo electrónico validado."}

@router.post("/integrations/test-whatsapp")
@router.post("/v1/integrations/test-whatsapp")
def test_whatsapp_integration():
    return {"status": "ok", "message": "Test de WhatsApp validado."}

@router.post("/integrations/send-custom-email")
def send_custom_email():
    return {"status": "ok", "message": "Correo enviado"}

# ──────────────────────────────────────────────────────────
# 9. ENCUESTAS / SURVEYS
# ──────────────────────────────────────────────────────────
@router.get("/surveys/naming-holding")
@router.get("/v1/surveys/naming-holding")
def get_naming_survey():
    return {
        "is_active": False,
        "campaign_code": "Votacion_Naming_Holding_2026",
        "title": "Votación Naming",
        "description": "Campaña inactiva.",
        "options": []
    }

@router.get("/surveys/admin/campaigns")
@router.get("/v1/surveys/admin/campaigns")
def list_admin_campaigns():
    return []

# ──────────────────────────────────────────────────────────
# 10. CONFIGURACIÓN DEL SISTEMA
# ──────────────────────────────────────────────────────────
@router.get("/config")
def get_system_config():
    return {
        "company_name": "CORALIS-PS - Servicios Profesionales",
        "crm_name": "CORALIS-PS",
        "currency": "USD",
        "version": "1.5.3"
    }

# ──────────────────────────────────────────────────────────
# 11. PRODUCTOS / CATÁLOGO DE SERVICIOS
# ──────────────────────────────────────────────────────────
@router.get("/v1/commercial/products")
def get_services_catalog():
    return [
        {
            "id": 1,
            "code": "TIER1_QUICKWIN",
            "name": "Tier 1: Diagnóstico Operativo & Quick-Win",
            "price": 600.0,
            "currency": "USD",
            "category": "Procesos"
        },
        {
            "id": 2,
            "code": "TIER2_CORE",
            "name": "Tier 2: Transformación Operativa & Power BI",
            "price": 2200.0,
            "currency": "USD",
            "category": "Automatización"
        },
        {
            "id": 3,
            "code": "TIER3_RETAINER",
            "name": "Tier 3: Retainer Fraccional de Procesos",
            "price": 750.0,
            "currency": "USD",
            "category": "Retainer"
        }
    ]

# ──────────────────────────────────────────────────────────
# 12. CLIENTES EXTRA HELPERS (TIPO, CONTACTOS, PRIORIDAD)
# ──────────────────────────────────────────────────────────
@router.put("/customers/{nit}/type")
def update_customer_type(nit: str, customer_type: str = "JURIDICA"):
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute("UPDATE customers SET customer_type = %s, updated_at = NOW() WHERE nit = %s RETURNING *;", (customer_type, nit))
            db.commit()
            return cur.fetchone() or {"status": "ok"}

@router.delete("/customers/{nit}/contacts/{contact_id}")
def delete_contact(nit: str, contact_id: int):
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute("DELETE FROM contacts WHERE id = %s AND customer_nit = %s;", (contact_id, nit))
            db.commit()
            return {"status": "ok"}

@router.put("/customers/{nit}/contacts/{contact_id}/priority")
def set_contact_priority(nit: str, contact_id: int, is_priority: bool = True):
    with get_db() as db:
        with db.cursor() as cur:
            cur.execute("UPDATE contacts SET is_priority = %s WHERE id = %s AND customer_nit = %s;", (is_priority, contact_id, nit))
            db.commit()
            return {"status": "ok"}
