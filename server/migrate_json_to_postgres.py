import json
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import PropertyMetadata, Base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def migrate_data():
    db = SessionLocal()
    try:
        # Load Real Properties
        real_path = os.path.join("data", "properties.json")
        if os.path.exists(real_path):
            with open(real_path, "r") as f:
                real_props = json.load(f)
                for p in real_props:
                    existing = db.query(PropertyMetadata).filter_by(id=p["id"]).first()
                    if not existing:
                        new_p = PropertyMetadata(
                            id=p["id"],
                            name=p["name"],
                            location=p.get("location", "Unknown"),
                            image=p.get("image", ""),
                            description=p.get("description", ""),
                            isSimulated=False
                        )
                        db.add(new_p)
                        print(f"Added Real Property: {p['name']}")

        # Load Simulated Properties
        sim_path = os.path.join("data", "simulated_properties.json")
        if os.path.exists(sim_path):
            with open(sim_path, "r") as f:
                sim_props = json.load(f)
                for p in sim_props:
                    existing = db.query(PropertyMetadata).filter_by(id=p["id"]).first()
                    if not existing:
                        new_p = PropertyMetadata(
                            id=p["id"],
                            name=p["name"],
                            location=p.get("location", "Unknown"),
                            image=p.get("image", ""),
                            description=p.get("description", ""),
                            symbol=p.get("symbol", ""),
                            sharePriceEth=p.get("sharePriceEth", "0.01"),
                            totalShares=p.get("totalShares", 100),
                            isSimulated=True
                        )
                        db.add(new_p)
                        print(f"Added Simulated Property: {p['name']}")

        db.commit()
        print("SUCCESS: All JSON data has been migrated to PostgreSQL!")
    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_data()
