import json
import os

TX_FILE = r"c:\Users\girid\OneDrive\Desktop\realestate\server\data\transactions.json"

def delete_specific_tx():
    with open(TX_FILE, 'r') as f:
        txs = json.load(f)
    
    # ID of the 42-share claim for London Bridge Flat
    target_id = "c9694122-12c0-4876-bde5-dddfe004b38e"
    
    cleaned = [tx for tx in txs if tx.get("id") != target_id]
    
    print(f"Transactions: {len(txs)} -> {len(cleaned)}")
    
    with open(TX_FILE, 'w') as f:
        json.dump(cleaned, f, indent=2)

if __name__ == "__main__":
    delete_specific_tx()
