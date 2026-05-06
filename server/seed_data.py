import json
import uuid
from datetime import datetime

path = "data/transactions.json"
with open(path, "r") as f:
    txs = json.load(f)

# Base for demo investors (38 chars)
DEMO_BASE = "70997970c51812dc3a010c7d01b50e0d17dc79"

mock_data = [
    # Robert Brown (Investor 3)
    {
        "propertyId": 2,
        "propertyName": "Downtown Office",
        "sharesToBuy": 10,
        "amountEth": "0.3000",
        "buyerWallet": f"0x{DEMO_BASE}03",
        "buyerName": "Robert Brown",
        "txHash": "0x-mock-init-3",
        "isMock": True,
        "type": "buy",
        "id": str(uuid.uuid4()),
        "createdAt": datetime.now().isoformat()
    },
    # Patricia Miller (Investor 4)
    {
        "propertyId": 1,
        "propertyName": "Ocean Apartments",
        "sharesToBuy": 5,
        "amountEth": "0.1000",
        "buyerWallet": f"0x{DEMO_BASE}04",
        "buyerName": "Patricia Miller",
        "txHash": "0x-mock-init-4",
        "isMock": True,
        "type": "buy",
        "id": str(uuid.uuid4()),
        "createdAt": datetime.now().isoformat()
    }
]

txs.extend(mock_data)

with open(path, "w") as f:
    json.dump(txs, f, indent=2)

print("Added initial mock data for Investor 3 and 4.")
