import json
import os
from datetime import datetime

TX_FILE = r"c:\Users\girid\OneDrive\Desktop\realestate\server\data\transactions.json"

def clean_transactions():
    if not os.path.exists(TX_FILE):
        return
        
    with open(TX_FILE, 'r') as f:
        txs = json.load(f)
    
    seen = set()
    cleaned = []
    
    # Wallet Linda
    linda = "0x14dc79964da2c08b23698b3d3cc7ca32193d9955"
    
    for tx in txs:
        # Fix names first
        name = tx.get("propertyName", "")
        if "London Bridge" in name: tx["propertyName"] = "London Bridge Flat"
        elif "Manhattan" in name: tx["propertyName"] = "Manhattan Luxury Suite"
        elif "Sydney" in name: tx["propertyName"] = "Sydney Coastal Retreat"
        
        # Deduplicate claims for Linda
        if str(tx.get("buyerWallet", "")).lower() == linda and tx.get("type") == "claim":
            # Round time to nearest minute to catch "double clicks"
            dt = tx.get("createdAt", "")[:16] # YYYY-MM-DDTHH:MM
            # Deduplicate by property, amount, and time bucket
            key = (tx.get("propertyId"), tx.get("amountEth"), dt)
            if key in seen:
                continue
            seen.add(key)
            
        cleaned.append(tx)
    
    print(f"Cleaned transactions: {len(txs)} -> {len(cleaned)}")
    with open(TX_FILE, 'w') as f:
        json.dump(cleaned, f, indent=2)

if __name__ == "__main__":
    clean_transactions()
