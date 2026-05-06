import json
import os
from datetime import datetime

path = "data/transactions.json"

def repair():
    if not os.path.exists(path):
        return

    with open(path, "r") as f:
        txs = json.load(f)

    # Sort by date
    txs.sort(key=lambda x: x.get("createdAt", ""))

    # user -> propertyId -> shares
    user_property_holdings = {} 
    
    # Track the last distribution propertyId
    last_dist_property_id = None

    for tx in txs:
        wallet = str(tx.get("buyerWallet", "")).lower()
        if wallet not in user_property_holdings:
            user_property_holdings[wallet] = {}

        t_type = tx.get("type", "buy")
        p_id = tx.get("propertyId")

        if t_type == "buy":
            shares = int(tx.get("sharesToBuy", 0))
            user_property_holdings[wallet][p_id] = user_property_holdings[wallet].get(p_id, 0) + shares
        
        elif t_type == "distribute":
            last_dist_property_id = p_id
            # Set distribution shares to property total
            if p_id == 0: tx["sharesToBuy"] = 100 # Green Villa
            elif p_id == 1: tx["sharesToBuy"] = 80 # Ocean Apartments
            elif p_id == 2: tx["sharesToBuy"] = 60 # Downtown Office

        elif t_type == "claim":
            # If a distribution just happened, show the shares for THAT property
            if last_dist_property_id is not None:
                shares_held = user_property_holdings[wallet].get(last_dist_property_id, 0)
                # If they don't own that property, maybe they own others? 
                # User specifically wanted "1" for Green Villa for Susan
                if shares_held > 0:
                    tx["sharesToBuy"] = shares_held
                else:
                    # Fallback to total shares if no recent specific dist
                    tx["sharesToBuy"] = sum(user_property_holdings[wallet].values())
            else:
                tx["sharesToBuy"] = sum(user_property_holdings[wallet].values())

    # Reverse back for newest first if desired, or let API handle it
    # API handles it now, so we save in chronological order
    with open(path, "w") as f:
        json.dump(txs, f, indent=2)
    
    print("Repaired history: Property-aware share tracking implemented.")

if __name__ == "__main__":
    repair()
