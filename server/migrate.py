import json
import os
from database import SessionLocal, PropertyMetadata, Transaction, init_db
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
PROPERTIES_METADATA_FILE = os.path.join(DATA_DIR, "properties.json")
TRANSACTIONS_FILE = os.path.join(DATA_DIR, "transactions.json")
SIMULATED_PROPERTIES_FILE = os.path.join(DATA_DIR, "simulated_properties.json")

def migrate():
    print("Initializing Database...")
    init_db()
    db = SessionLocal()
    
    # Migrate Properties
    if os.path.exists(PROPERTIES_METADATA_FILE):
        print("Migrating Properties...")
        with open(PROPERTIES_METADATA_FILE, "r") as f:
            properties = json.load(f)
            for p in properties:
                existing = db.query(PropertyMetadata).filter(PropertyMetadata.id == p["id"]).first()
                if not existing:
                    new_p = PropertyMetadata(
                        id=p["id"],
                        name=p["name"],
                        location=p["location"],
                        image=p["image"],
                        description=p["description"],
                        isSimulated=False
                    )
                    db.add(new_p)
            db.commit()
                    
    # Migrate Simulated Properties
    if os.path.exists(SIMULATED_PROPERTIES_FILE):
        print("Migrating Simulated Properties...")
        with open(SIMULATED_PROPERTIES_FILE, "r") as f:
            sim_properties = json.load(f)
            for p in sim_properties:
                existing = db.query(PropertyMetadata).filter(PropertyMetadata.id == p["id"]).first()
                if not existing:
                    new_p = PropertyMetadata(
                        id=p["id"],
                        name=p["name"],
                        location=p["location"],
                        image=p["image"],
                        description=p["description"],
                        symbol=p.get("symbol"),
                        sharePriceEth=p.get("sharePriceEth", "0.01"),
                        totalShares=p.get("totalShares", 100),
                        isSimulated=True
                    )
                    db.add(new_p)
    
    # Migrate Transactions
    if os.path.exists(TRANSACTIONS_FILE):
        print("Migrating Transactions...")
        with open(TRANSACTIONS_FILE, "r") as f:
            transactions = json.load(f)
            for t in transactions:
                existing = db.query(Transaction).filter(Transaction.id == t["id"]).first()
                if not existing:
                    try:
                        created_at = datetime.fromisoformat(t["createdAt"])
                    except:
                        created_at = datetime.utcnow()
                        
                    new_t = Transaction(
                        id=t["id"],
                        propertyId=t["propertyId"],
                        propertyName=t["propertyName"],
                        sharesToBuy=t.get("sharesToBuy", 0),
                        amountEth=t.get("amountEth", "0"),
                        buyerWallet=t["buyerWallet"],
                        buyerName=t.get("buyerName", "Anonymous"),
                        txHash=t.get("txHash"),
                        isMock=t.get("isMock", False),
                        type=t.get("type", "buy"),
                        tenantName=t.get("tenantName"),
                        rentAmount=t.get("rentAmount"),
                        createdAt=created_at
                    )
                    db.add(new_t)
    
    db.commit()
    db.close()
    print("Migration Complete!")

if __name__ == "__main__":
    migrate()
