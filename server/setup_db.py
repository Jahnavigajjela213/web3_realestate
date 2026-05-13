import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

load_dotenv()

def create_database():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("[ERROR] DATABASE_URL not found in .env")
        return

    # Extract connection details
    try:
        # Expected format: postgresql://user:password@host:port/dbname
        base_part = db_url.rsplit('/', 1)[0]
        target_db = db_url.rsplit('/', 1)[1]
        postgres_url = base_part + '/postgres'
        
        print(f"Connecting to: {postgres_url}")
        con = psycopg2.connect(postgres_url)
        con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = con.cursor()
        
        cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{target_db}'")
        exists = cur.fetchone()
        
        if not exists:
            print(f"Creating database: {target_db}...")
            cur.execute(f"CREATE DATABASE {target_db}")
            print(f"Database {target_db} created successfully!")
        else:
            print(f"Database {target_db} already exists.")
            
        cur.close()
        con.close()
    except Exception as e:
        print(f"[ERROR] Detailed failure: {e}")

if __name__ == "__main__":
    create_database()
