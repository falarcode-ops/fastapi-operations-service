import os
from contextlib import contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "crm_db")
DB_SCHEMA = os.getenv("DB_SCHEMA", "portfolio")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

@contextmanager
def get_db():
    """
    Entrega una conexión a PostgreSQL configurada con el esquema aislado 'portfolio'.
    Cualquier consulta como 'SELECT * FROM customers' accederá automáticamente
    a 'portfolio.customers' sin tocar las tablas de CORALIS (public.*).
    """
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        cursor_factory=RealDictCursor,
        options=f"-c search_path={DB_SCHEMA},public -c timezone=America/Bogota"
    )
    try:
        yield conn
    finally:
        conn.close()
