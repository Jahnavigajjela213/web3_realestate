import os
import json
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Web3 Real Estate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Simplified for local dev, or specify exact list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Blockchain Configuration
RPC_URL = os.getenv("RPC_URL", "http://127.0.0.1:8545")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
w3 = Web3(Web3.HTTPProvider(RPC_URL))

# ABIs (Simplified for Python)
PLATFORM_ABI = [
    {
        "inputs": [],
        "name": "getProperties",
        "outputs": [
            {
                "components": [
                    {"name": "name", "type": "string"},
                    {"name": "sharePriceWei", "type": "uint256"},
                    {"name": "totalShares", "type": "uint256"},
                    {"name": "sharesSold", "type": "uint256"},
                    {"name": "tokenAddress", "type": "address"},
                    {"name": "totalRentDistributed", "type": "uint256"}
                ],
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "propertyId", "type": "uint256"}, {"name": "user", "type": "address"}],
        "name": "getClaimableRent",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

ERC20_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    }
]

# Data Paths
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
PROPERTIES_METADATA_FILE = os.path.join(DATA_DIR, "properties.json")
TRANSACTIONS_FILE = os.path.join(DATA_DIR, "transactions.json")
SIMULATED_PROPERTIES_FILE = os.path.join(DATA_DIR, "simulated_properties.json")

def load_json(path, default=[]):
    if not os.path.exists(path):
        return default
    with open(path, "r") as f:
        return json.load(f)

def save_json(path, data):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

# Models
class TransactionInput(BaseModel):
    propertyId: int
    propertyName: str
    sharesToBuy: int
    amountEth: str
    buyerWallet: str
    buyerName: str = "Anonymous"
    txHash: Optional[str] = None
    isMock: bool = False
    type: str = "buy" # "buy" or "claim"

@app.get("/health")
def health():
    return {"status": "ok", "framework": "FastAPI"}

@app.post("/properties")
def save_property_metadata(data: dict):
    if data.get("isSimulated"):
        simulated = load_json(SIMULATED_PROPERTIES_FILE)
        # Generate a high ID for simulated property
        next_id = 1000 + len(simulated)
        data["id"] = next_id
        simulated.append(data)
        save_json(SIMULATED_PROPERTIES_FILE, simulated)
        return {"status": "success", "id": next_id}
    else:
        metadata = load_json(PROPERTIES_METADATA_FILE)
        metadata.append(data)
        save_json(PROPERTIES_METADATA_FILE, metadata)
        return {"status": "success"}

@app.get("/properties")
def get_properties():
    try:
        # Ensure checksum address
        checksum_contract = Web3.to_checksum_address(CONTRACT_ADDRESS)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid CONTRACT_ADDRESS")
        
    contract = w3.eth.contract(address=checksum_contract, abi=PLATFORM_ABI)
    try:
        raw_props = contract.functions.getProperties().call()
        metadata = load_json(PROPERTIES_METADATA_FILE)
        txs = load_json(TRANSACTIONS_FILE)
        
        properties = []
        for i, p in enumerate(raw_props):
            # Sum up mock shares sold for this property
            mock_sold = sum(t.get("sharesToBuy", 0) for t in txs if int(t.get("propertyId")) == i and t.get("isMock") and t.get("type", "buy") == "buy")
            # Sum up mock rent distributions
            mock_rent = sum(float(t.get("amountEth", 0)) for t in txs if int(t.get("propertyId")) == i and t.get("type") == "distribute")
            
            meta = next((m for m in metadata if m["id"] == i), {})
            properties.append({
                "id": i,
                "name": p[0],
                "sharePriceWei": str(p[1]),
                "sharePriceEth": str(w3.from_wei(p[1], 'ether')),
                "totalShares": p[2],
                "sharesSold": p[3] + mock_sold,
                "availableShares": p[2] - (p[3] + mock_sold),
                "tokenAddress": p[4],
                "totalRentDistributed": str(float(w3.from_wei(p[5], 'ether')) + mock_rent),
                "location": meta.get("location", "Unknown"),
                "image": meta.get("image", ""),
                "description": meta.get("description", ""),
                "isSimulated": False
            })

        # Append Simulated Properties
        simulated = load_json(SIMULATED_PROPERTIES_FILE)
        for sp in simulated:
            i = sp["id"]
            mock_sold = sum(t.get("sharesToBuy", 0) for t in txs if int(t.get("propertyId")) == i and t.get("isMock") and t.get("type", "buy") == "buy")
            mock_rent = sum(float(t.get("amountEth", 0)) for t in txs if int(t.get("propertyId")) == i and t.get("type") == "distribute")
            
            properties.append({
                "id": i,
                "name": sp["name"],
                "sharePriceEth": sp["sharePriceEth"],
                "totalShares": sp["totalShares"],
                "sharesSold": mock_sold,
                "availableShares": sp["totalShares"] - mock_sold,
                "totalRentDistributed": str(mock_rent),
                "location": sp.get("location", "Unknown"),
                "image": sp.get("image", ""),
                "description": sp.get("description", ""),
                "isSimulated": True
            })
        return {"data": properties}
    except Exception as e:
        print(f"Error in get_properties: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/portfolio/{wallet_address}")
def get_portfolio(wallet_address: str):
    try:
        # Ensure checksum addresses
        checksum_wallet = Web3.to_checksum_address(wallet_address)
        checksum_contract = Web3.to_checksum_address(CONTRACT_ADDRESS)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid wallet or contract address")
    
    contract = w3.eth.contract(address=checksum_contract, abi=PLATFORM_ABI)
    try:
        raw_props = contract.functions.getProperties().call()
    except Exception as e:
        print(f"Error calling getProperties: {e}")
        return {"data": []} # Return empty if contract fails

    txs = load_json(TRANSACTIONS_FILE)
    
    # Fetch global pending rent for this user from contract
    total_pending_wei = 0
    try:
        total_pending_wei = contract.functions.pendingWithdrawals(checksum_wallet).call()
    except:
        pass

    # Calculate mock pending rent
    mock_pending_eth = 0.0
    # Find all mock distributions
    distribute_txs = [t for t in txs if t.get("type") == "distribute"]
    # Find all mock claims by this user to subtract
    claim_txs = [t for t in txs if t.get("type") == "claim" and str(t.get("buyerWallet", "")).lower() == str(wallet_address).lower()]
    
    portfolio = []
    for i, p in enumerate(raw_props):
        # Real On-chain balance
        token_contract = w3.eth.contract(address=Web3.to_checksum_address(p[4]), abi=ERC20_ABI)
        try:
            on_chain_balance = token_contract.functions.balanceOf(checksum_wallet).call()
        except:
            on_chain_balance = 0
        
        # Mock balance for this user
        token_address = p[4]
        if token_address:
            token_contract = w3.eth.contract(address=token_address, abi=ERC20_ABI)
            try:
                real_balance = token_contract.functions.balanceOf(checksum_wallet).call()
            except:
                real_balance = 0
            
            # ADD MOCK SHARES FROM HISTORY (for demo visibility)
            mock_shares = sum(int(t.get("sharesToBuy", 0)) for t in txs if int(t.get("propertyId")) == i and str(t.get("buyerWallet", "")).lower() == str(wallet_address).lower() and t.get("type", "buy") == "buy")
            
            total_user_shares = real_balance + mock_shares

            if total_user_shares > 0:
                # Add to mock pending rent: (User Shares / Total Shares) * Mock Rent Distributed
                prop_distributions = sum(float(t.get("amountEth", 0)) for t in distribute_txs if int(t.get("propertyId")) == i)
                mock_pending_eth += (total_user_shares / p[2]) * prop_distributions
                
                portfolio.append({
                    "propertyId": i,
                    "propertyName": p[0],
                    "sharesOwned": total_user_shares,
                    "valueEth": f"{(total_user_shares * float(w3.from_wei(p[1], 'ether'))):.3f}",
                    "totalPropertyRentDistributed": str(float(w3.from_wei(p[5], 'ether')) + prop_distributions)
                })
    
    # Subtract claims already made
    total_claimed = sum(float(t.get("amountEth", 0)) for t in claim_txs)
    final_pending_eth = max(0, (float(w3.from_wei(total_pending_wei, 'ether')) + mock_pending_eth) - total_claimed)
            
    # REAL-TIME ETH BALANCE FROM BLOCKCHAIN
    balance_wei = w3.eth.get_balance(checksum_wallet)
    balance_eth = float(w3.from_wei(balance_wei, 'ether'))

    return {
        "data": portfolio,
        "pendingRentEth": f"{final_pending_eth:.4f}",
        "balanceEth": f"{balance_eth:.4f}"
    }

@app.get("/transactions")
def get_all_transactions():
    """Returns ALL transactions from ALL investors (Global Feed) sorted by date"""
    txs = load_json(TRANSACTIONS_FILE)
    # Sort newest first
    txs.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return {"data": txs}

@app.get("/transactions/{wallet_address}")
def get_user_transactions(wallet_address: str):
    """Returns transactions for a specific investor sorted by date"""
    txs = load_json(TRANSACTIONS_FILE)
    filtered = [tx for tx in txs if tx["buyerWallet"].lower() == wallet_address.lower()]
    filtered.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return {"data": filtered}

@app.post("/transactions")
def add_transaction(tx: TransactionInput):
    txs = load_json(TRANSACTIONS_FILE)
    
    new_entry = tx.dict()
    new_entry["id"] = str(uuid.uuid4())
    new_entry["createdAt"] = datetime.now().isoformat()
    new_entry["buyerWallet"] = tx.buyerWallet.lower() # Store lowercase
    
    if not tx.txHash:
        new_entry["txHash"] = f"0x-mock-{uuid.uuid4().hex[:8]}"
        
    txs.insert(0, new_entry)
    save_json(TRANSACTIONS_FILE, txs)
    return {"data": new_entry}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
