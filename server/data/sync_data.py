import json
import os

TRANSACTIONS_FILE = r'c:\Users\girid\OneDrive\Desktop\realestate\server\data\transactions.json'
SIMULATED_FILE = r'c:\Users\girid\OneDrive\Desktop\realestate\server\data\simulated_properties.json'

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

# Update Transactions
if os.path.exists(TRANSACTIONS_FILE):
    with open(TRANSACTIONS_FILE, 'r') as f:
        txs = json.load(f)
    
    for t in txs:
        name = t.get("propertyName")
        if name in ID_MAP:
            t["propertyId"] = ID_MAP[name]
        elif name == "Total Rental Income":
            t["propertyId"] = -1
            
    with open(TRANSACTIONS_FILE, 'w') as f:
        json.dump(txs, f, indent=2)
    print("Updated transactions.json")

# Update Simulated Properties
if os.path.exists(SIMULATED_FILE):
    with open(SIMULATED_FILE, 'r') as f:
        sim = json.load(f)
    
    # Existing properties in simulated list
    sim_names = {s["name"] for s in sim}
    
    # Properties that SHOULD be in simulated (if not real)
    # Assume 0, 1, 2 are real (Manhattan, London, Dubai)
    target_sim = [
        {"id": 3, "name": "Sydney Coastal Retreat", "symbol": "SCR", "sharePriceEth": "0.04", "totalShares": 120, "location": "Sydney, Australia", "image": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&auto=format&fit=crop&q=80", "description": "Sydney beach house with ocean views."},
        {"id": 4, "name": "Tokyo Sky Tower", "symbol": "TST", "sharePriceEth": "0.05", "totalShares": 100, "location": "Tokyo, Japan", "image": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&auto=format&fit=crop&q=80", "description": "Premium residential tower in Tokyo."},
        {"id": 5, "name": "Berlin Logistics Center", "symbol": "BLC", "sharePriceEth": "0.06", "totalShares": 150, "location": "Berlin, Germany", "image": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80", "description": "Industrial warehouse leased to companies."},
        {"id": 1000, "name": "Singapore Global Mall", "symbol": "SGM", "sharePriceEth": "0.045", "totalShares": 150, "location": "Singapore", "image": "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&auto=format&fit=crop&q=80", "description": "Premium retail destination in Singapore."},
        {"id": 6, "name": "Ocean Apartments", "symbol": "OAP", "sharePriceEth": "0.02", "totalShares": 200, "location": "Miami, USA", "image": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80", "description": "Luxury oceanfront apartments."},
        {"id": 7, "name": "Downtown Office", "symbol": "DTO", "sharePriceEth": "0.03", "totalShares": 300, "location": "New York, USA", "image": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80", "description": "Corporate office space in downtown Manhattan."},
        {"id": 1001, "name": "City Center Mall", "symbol": "CCM", "sharePriceEth": "0.05", "totalShares": 500, "location": "London, UK", "image": "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&auto=format&fit=crop&q=80", "description": "Large shopping mall in central London."},
        {"id": 8, "name": "Sunset Beach House", "symbol": "SBH", "sharePriceEth": "0.03", "totalShares": 100, "location": "Malibu, USA", "image": "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&auto=format&fit=crop&q=80", "description": "Cozy beach house with sunset views."}
    ]
    
    with open(SIMULATED_FILE, 'w') as f:
        json.dump(target_sim, f, indent=2)
    print("Updated simulated_properties.json")
