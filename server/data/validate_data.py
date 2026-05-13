import json
import os

DATA_DIR = r'c:\Users\girid\OneDrive\Desktop\realestate\server\data'
TX_FILE = os.path.join(DATA_DIR, "transactions.json")
PROP_FILE = os.path.join(DATA_DIR, "simulated_properties.json")

txs = json.load(open(TX_FILE))
props = json.load(open(PROP_FILE))

print(f"Total Transactions: {len(txs)}")
print(f"Total Simulated Properties: {len(props)}")

john_wallet = "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65"

john_txs = [t for t in txs if t.get("buyerWallet", "").lower() == john_wallet]
print(f"John Davis Transactions: {len(john_txs)}")

for t in john_txs:
    pid = t.get("propertyId")
    type = t.get("type")
    shares = t.get("sharesToBuy", 0)
    print(f"  - TX: {type}, PropertyID: {pid}, Shares: {shares}")
    
    # Check if property exists
    p = next((p for p in props if p["id"] == pid), None)
    if p:
        print(f"    MATCH: {p['name']} (ID: {p['id']})")
    else:
        print(f"    NO MATCH for PropertyID: {pid}")

# Check IDs types
for p in props:
    print(f"Property {p['name']} ID type: {type(p['id'])}")
for t in txs:
    print(f"TX PropertyID type: {type(t.get('propertyId'))}")
