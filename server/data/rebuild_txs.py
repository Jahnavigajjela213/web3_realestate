import json
import uuid
from datetime import datetime

# Wallet Mapping
WALLETS = {
    "David Hernandez": "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    "Linda Martinez": "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    "Susan Thomas": "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec",
    "Joseph Taylor": "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097",
    "Patricia Miller": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "Robert Brown": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "Richard Anderson": "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a",
    "John Davis": "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "Jennifer Garcia": "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    "Elizabeth Lopez": "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    "Michael Rodriguez": "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    "Admin": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
}

# ID Mapping
ID_MAP = {
    "Manhattan Luxury Suite": 0,
    "London Bridge Flat": 1,
    "Dubai Marina Penthouse": 2,
    "Sydney Coastal Retreat": 3,
    "Tokyo Sky Tower": 4,
    "Berlin Logistics Center": 5,
    "Ocean Apartments": 6,
    "Downtown Office": 7,
    "Sunset Beach House": 8,
    "Rental Income (Sunset Beach House)": 8,
    "Singapore Global Mall": 1000,
    "City Center Mall": 1001,
}

# Transaction List from User
raw_data = [
    ("11-05-2026", "buy", "David Hernandez", "Sydney Coastal Retreat", 10, "0.4000"),
    ("11-05-2026", "claim", "Linda Martinez", "Manhattan Luxury Suite", 20, "0.0040"),
    ("11-05-2026", "buy", "Linda Martinez", "Sydney Coastal Retreat", 6, "0.2400"),
    ("11-05-2026", "rent", "Susan Thomas", "Singapore Global Mall", 0, "0.0450"),
    ("11-05-2026", "rent", "Joseph Taylor", "London Bridge Flat", 0, "0.0200"),
    ("11-05-2026", "buy", "Patricia Miller", "Ocean Apartments", 5, "0.1000"),
    ("11-05-2026", "buy", "Robert Brown", "Downtown Office", 10, "0.3000"),
    ("10-05-2026", "rent", "Richard Anderson", "Manhattan Luxury Suite", 0, "0.0100"),
    ("10-05-2026", "rent", "Richard Anderson", "Dubai Marina Penthouse", 0, "0.0300"),
    ("10-05-2026", "rent", "Susan Thomas", "Berlin Logistics Center", 0, "0.0600"),
    ("10-05-2026", "buy", "Linda Martinez", "Manhattan Luxury Suite", 20, "0.2000"),
    ("08-05-2026", "buy", "John Davis", "Berlin Logistics Center", 20, "1.2000"),
    ("07-05-2026", "buy", "Linda Martinez", "London Bridge Flat", 5, "0.1000"),
    ("07-05-2026", "rent", "Susan Thomas", "Dubai Marina Penthouse", 0, "0.0300"),
    ("07-05-2026", "buy", "Linda Martinez", "London Bridge Flat", 5, "0.1000"),
    ("07-05-2026", "claim", "Jennifer Garcia", "Total Rental Income", 0, "0.0150"),
    ("07-05-2026", "buy", "Elizabeth Lopez", "Berlin Logistics Center", 20, "1.1600"),
    ("07-05-2026", "claim", "John Davis", "Total Rental Income", 0, "0.0075"),
    ("07-05-2026", "claim", "Linda Martinez", "London Bridge Flat", 32, "0.3200"),
    ("07-05-2026", "buy", "Linda Martinez", "London Bridge Flat", 20, "0.4000"),
    ("07-05-2026", "claim", "Michael Rodriguez", "Sydney Coastal Retreat", 15, "0.0075"),
    ("07-05-2026", "claim", "Jennifer Garcia", "Sydney Coastal Retreat", 30, "0.0150"),
    ("07-05-2026", "buy", "Michael Rodriguez", "Sydney Coastal Retreat", 15, "1.2000"),
    ("07-05-2026", "buy", "Jennifer Garcia", "Sydney Coastal Retreat", 30, "2.4000"),
    ("07-05-2026", "claim", "David Hernandez", "Manhattan Luxury Suite", 1, "0.0001"),
    ("07-05-2026", "buy", "David Hernandez", "Manhattan Luxury Suite", 1, "0.0100"),
    ("07-05-2026", "claim", "John Davis", "Rental Income (Sunset Beach House)", 15, "0.0075"),
    ("07-05-2026", "rent", "Susan Thomas", "Sydney Coastal Retreat", 0, "0.0500"),
    ("07-05-2026", "rent", "Susan Thomas", "Manhattan Luxury Suite", 0, "0.0100"),
    ("07-05-2026", "buy", "John Davis", "Sydney Coastal Retreat", 15, "0.7500"),
    ("07-05-2026", "rent", "Joseph Taylor", "City Center Mall", 0, "0.2000"),
]

final_txs = []
for date, type, name, prop, shares, amount in raw_data:
    # Convert date DD-MM-YYYY to ISO
    d_obj = datetime.strptime(date, "%d-%m-%Y")
    iso_date = d_obj.strftime("%Y-%m-%dT%H:%M:%S.000000")
    
    tx = {
        "propertyId": ID_MAP.get(prop, -1),
        "propertyName": prop,
        "sharesToBuy": shares if type == "buy" else 0,
        "shares": shares if type != "buy" else 0, # for claims
        "amountEth": amount,
        "buyerWallet": WALLETS.get(name, "0x0000000000000000000000000000000000000000"),
        "buyerName": name,
        "txHash": f"0x-mock-{uuid.uuid4().hex[:8]}",
        "isMock": True,
        "type": type,
        "id": str(uuid.uuid4()),
        "createdAt": iso_date
    }
    final_txs.append(tx)

with open(r'c:\Users\girid\OneDrive\Desktop\realestate\server\data\transactions.json', 'w') as f:
    json.dump(final_txs, f, indent=2)

print("Rebuilt transactions.json with clean data.")
