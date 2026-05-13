import os
import json
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from web3 import Web3
from dotenv import load_dotenv
from database import PropertyMetadata, Transaction as DbTransaction, get_db, init_db

load_dotenv()

app = FastAPI(title="Web3 Real Estate API")

@app.on_event("startup")
def on_startup():
    init_db()


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

def tx_to_dict(t):
    return {
        "id": t.id,
        "propertyId": t.propertyId,
        "propertyName": t.propertyName,
        "sharesToBuy": t.sharesToBuy,
        "amountEth": t.amountEth,
        "buyerWallet": t.buyerWallet,
        "buyerName": t.buyerName,
        "txHash": t.txHash,
        "isMock": t.isMock,
        "type": t.type,
        "tenantName": t.tenantName,
        "rentAmount": t.rentAmount,
        "createdAt": t.createdAt.isoformat() if t.createdAt else ""
    }

def prop_to_dict(m):
    return {
        "id": m.id,
        "name": m.name,
        "location": m.location,
        "image": m.image,
        "description": m.description,
        "symbol": m.symbol,
        "sharePriceEth": m.sharePriceEth,
        "totalShares": m.totalShares,
        "sharesSold": m.sharesSold,
        "totalRentDistributed": m.totalRentDistributed,
        "isSimulated": m.isSimulated
    }

# Models
class TransactionInput(BaseModel):
    propertyId: int
    propertyName: str
    sharesToBuy: int = 0
    amountEth: str = "0"
    buyerWallet: str
    buyerName: str = "Anonymous"
    txHash: Optional[str] = None
    isMock: bool = False
    type: str = "buy" # "buy", "claim", "rent", "assign_tenant", "distribute"
    tenantName: Optional[str] = None
    rentAmount: Optional[str] = None

@app.get("/health")
def health():
    return {"status": "ok", "framework": "FastAPI"}

@app.post("/properties")
def save_property_metadata(data: dict, db: Session = Depends(get_db)):
    if data.get("isSimulated"):
        simulated = db.query(PropertyMetadata).filter_by(isSimulated=True).all()
        next_id = 1000 + len(simulated)
        new_p = PropertyMetadata(
            id=next_id,
            name=data.get("name"),
            location=data.get("location"),
            image=data.get("image"),
            description=data.get("description"),
            symbol=data.get("symbol"),
            sharePriceEth=data.get("sharePriceEth", "0.01"),
            totalShares=data.get("totalShares", 100),
            isSimulated=True
        )
        db.add(new_p)
        db.commit()
        return {"status": "success", "id": next_id}
    else:
        new_p = PropertyMetadata(
            id=data.get("id"),
            name=data.get("name"),
            location=data.get("location"),
            image=data.get("image"),
            description=data.get("description"),
            isSimulated=False
        )
        db.add(new_p)
        db.commit()
        return {"status": "success"}

@app.get("/properties")
def get_properties(db: Session = Depends(get_db)):
    try:
        # Ensure checksum address gracefully
        contract = None
        try:
            if CONTRACT_ADDRESS and Web3.is_address(CONTRACT_ADDRESS):
                checksum_contract = Web3.to_checksum_address(CONTRACT_ADDRESS)
                contract = w3.eth.contract(address=checksum_contract, abi=PLATFORM_ABI)
        except Exception as e:
            print(f"Contract initialization failed: {e}")

        raw_props = []
        metadata = [prop_to_dict(p) for p in db.query(PropertyMetadata).filter_by(isSimulated=False).all()]
        txs = [tx_to_dict(t) for t in db.query(DbTransaction).all()]
        
        if contract:
            try:
                raw_props = contract.functions.getProperties().call()
            except Exception as e:
                print(f"Graceful handle: Contract call failed. Using mock/metadata only.")

        properties = []
        
        # 1. Process On-Chain Properties
        for i, p in enumerate(raw_props):
            # Sum up mock shares sold for this property
            mock_sold = sum(t.get("sharesToBuy", 0) for t in txs if int(t.get("propertyId", -1)) == i and t.get("isMock") and t.get("type", "buy") == "buy")
            # Sum up mock rent distributions
            mock_rent = sum(float(t.get("amountEth", 0)) for t in txs if int(t.get("propertyId", -1)) == i and t.get("type") in ["distribute", "rent"])
            
            meta = next((m for m in metadata if m["id"] == i), None)
            if meta:
                # Check for mock tenant assignment
                mock_assignment = next((t for t in txs if int(t.get("propertyId", -1)) == i and t.get("type") == "assign_tenant"), None)
                
                tenant_info = {"isActive": False}
                try:
                    t_chain = contract.functions.tenants(i).call()
                    if t_chain[3]: # isActive on chain
                        tenant_info = {
                            "name": t_chain[0],
                            "rentAmount": str(w3.from_wei(t_chain[1], 'ether')),
                            "lastPaid": t_chain[2],
                            "isActive": t_chain[3]
                        }
                    elif mock_assignment:
                        tenant_info = {
                            "name": mock_assignment.get("tenantName", "Unknown"),
                            "rentAmount": mock_assignment.get("rentAmount", "0"),
                            "lastPaid": 0,
                            "isActive": True
                        }
                except:
                    if mock_assignment:
                        tenant_info = {
                            "name": mock_assignment.get("tenantName", "Unknown"),
                            "rentAmount": mock_assignment.get("rentAmount", "0"),
                            "lastPaid": 0,
                            "isActive": True
                        }

                properties.append({
                    "id": i,
                    "name": meta.get("name", p[0]),
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
                    "tenant": tenant_info,
                    "isSimulated": False
                })

        # 2. Append Simulated Properties
        simulated = [prop_to_dict(p) for p in db.query(PropertyMetadata).filter_by(isSimulated=True).all()]
        for sp in simulated:
            i = int(sp["id"])
            mock_sold = sum(t.get("sharesToBuy", 0) for t in txs if int(t.get("propertyId", -1)) == i and t.get("isMock") and t.get("type", "buy") == "buy")
            mock_rent = sum(float(t.get("amountEth", 0)) for t in txs if int(t.get("propertyId", -1)) == i and t.get("type") in ["distribute", "rent"])
            
            # Find latest mock assignment for this simulated property
            mock_assignment = next((t for t in txs if int(t.get("propertyId", -1)) == i and t.get("type") == "assign_tenant"), None)
            
            tenant_info = {"isActive": False}
            if mock_assignment:
                tenant_info = {
                    "name": mock_assignment.get("tenantName", "Unknown"),
                    "rentAmount": mock_assignment.get("rentAmount", "0"),
                    "lastPaid": 0,
                    "isActive": True
                }

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
                "tenant": tenant_info,
                "isSimulated": True
            })
            
        return {"data": properties}
    except Exception as e:
        print(f"Error in get_properties: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/portfolio/{wallet_address}")
def get_portfolio(wallet_address: str, db: Session = Depends(get_db)):
    try:
        # Ensure checksum wallet
        try:
            checksum_wallet = Web3.to_checksum_address(wallet_address)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid wallet address")

        # Initialize contract gracefully
        contract = None
        raw_props = []
        try:
            if CONTRACT_ADDRESS and Web3.is_address(CONTRACT_ADDRESS):
                checksum_contract = Web3.to_checksum_address(CONTRACT_ADDRESS)
                contract = w3.eth.contract(address=checksum_contract, abi=PLATFORM_ABI)
                raw_props = contract.functions.getProperties().call()
        except Exception as e:
            print(f"Graceful handle: Contract interaction failed ({e}). Using mock/metadata only.")

        txs = [tx_to_dict(t) for t in db.query(DbTransaction).all()]
    
        # Fetch global pending rent for this user from contract
        total_pending_wei = 0
        try:
            if contract:
                total_pending_wei = contract.functions.pendingWithdrawals(checksum_wallet).call()
        except:
            pass

        # Calculate mock pending rent — only count rent AFTER last claim per property
        mock_pending_eth = 0.0
        # Find all mock distributions (direct distributions + tenant rent payments)
        distribute_txs = [t for t in txs if t.get("type") in ["distribute", "rent"]]
        # Find all mock claims by this user
        claim_txs = [t for t in txs if t.get("type") == "claim" and str(t.get("buyerWallet", "")).lower() == str(wallet_address).lower()]
        
        # Find the timestamp of the user's most recent claim (global fallback)
        last_global_claim_time = ""
        if claim_txs:
            last_global_claim_time = max(t.get("createdAt", "") for t in claim_txs)
        
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
                mock_shares = sum(int(t.get("sharesToBuy", 0)) for t in txs if int(t.get("propertyId", -1)) == i and str(t.get("buyerWallet", "")).lower() == str(wallet_address).lower() and t.get("type", "buy") == "buy")
                
                total_user_shares = real_balance + mock_shares

                if total_user_shares > 0:
                    # Find last claim time for THIS property (or fall back to global last claim)
                    prop_claims = [t for t in claim_txs if int(t.get("propertyId", -1)) == i]
                    last_claim_time = max((t.get("createdAt", "") for t in prop_claims), default=last_global_claim_time)
                    
                    # Only count rent distributions that happened AFTER the last claim
                    new_distributions = sum(
                        float(t.get("amountEth", 0))
                        for t in distribute_txs
                        if int(t.get("propertyId")) == i and t.get("createdAt", "") > last_claim_time
                    )
                    mock_pending_eth += (total_user_shares / p[2]) * new_distributions
                    
                    # Total ever distributed (for display)
                    all_distributions = sum(float(t.get("amountEth", 0)) for t in distribute_txs if int(t.get("propertyId", -1)) == i)
                    
                    portfolio.append({
                        "propertyId": i,
                        "propertyName": p[0],
                        "sharesOwned": total_user_shares,
                        "totalShares": p[2],
                        "sharePriceEth": str(w3.from_wei(p[1], 'ether')),
                        "valueEth": f"{(total_user_shares * float(w3.from_wei(p[1], 'ether'))):.3f}",
                        "totalPropertyRentDistributed": str(float(w3.from_wei(p[5], 'ether')) + all_distributions)
                    })

        # ADD SIMULATED PROPERTIES TO PORTFOLIO
        simulated = [prop_to_dict(p) for p in db.query(PropertyMetadata).filter_by(isSimulated=True).all()]
        for sp in simulated:
            i = int(sp["id"])
            # Mock shares for this simulated property
            mock_shares = sum(int(t.get("sharesToBuy", 0)) for t in txs if int(t.get("propertyId", -1)) == i and str(t.get("buyerWallet", "")).lower() == str(wallet_address).lower() and t.get("type", "buy") == "buy")
            
            if mock_shares > 0:
                # Calculate mock rent earned for this simulated property
                prop_claims = [t for t in claim_txs if int(t.get("propertyId", -1)) == i]
                last_claim_time = max((t.get("createdAt", "") for t in prop_claims), default=last_global_claim_time)
                
                # Rent distributions for simulated property
                distribute_txs_prop = [t for t in txs if t.get("type") in ["distribute", "rent"] and int(t.get("propertyId", -1)) == i]
                
                new_distributions = sum(
                    float(t.get("amountEth", 0))
                    for t in distribute_txs_prop
                    if t.get("createdAt", "") > last_claim_time
                )
                mock_pending_eth += (mock_shares / sp["totalShares"]) * new_distributions
                
                # Total ever distributed (for display)
                all_distributions = sum(float(t.get("amountEth", 0)) for t in distribute_txs_prop)
                
                portfolio.append({
                    "propertyId": i,
                    "propertyName": sp["name"],
                    "sharesOwned": mock_shares,
                    "totalShares": sp["totalShares"],
                    "sharePriceEth": sp["sharePriceEth"],
                    "valueEth": f"{(mock_shares * float(sp['sharePriceEth'])):.3f}",
                    "totalPropertyRentDistributed": str(all_distributions)
                })
        
        # Add on-chain pending (if any) to mock pending
        final_pending_eth = max(0, float(w3.from_wei(total_pending_wei, 'ether')) + mock_pending_eth)
                
        # REAL-TIME ETH BALANCE FROM BLOCKCHAIN (Adjusted for Mock Transactions)
        real_balance_eth = 0.0
        try:
            balance_wei = w3.eth.get_balance(checksum_wallet)
            real_balance_eth = float(w3.from_wei(balance_wei, 'ether'))
        except:
            # Fallback for demo mode if node is offline
            real_balance_eth = 0.0
        
        # Calculate mock adjustments: -buys, -rent, +claims
        mock_buys = sum(float(t.get("amountEth", 0)) for t in txs if str(t.get("buyerWallet", "")).lower() == str(wallet_address).lower() and t.get("type", "buy") == "buy" and t.get("isMock"))
        mock_rents = sum(float(t.get("amountEth", 0)) for t in txs if str(t.get("buyerWallet", "")).lower() == str(wallet_address).lower() and t.get("type") == "rent" and t.get("isMock"))
        mock_claims = sum(float(t.get("amountEth", 0)) for t in txs if str(t.get("buyerWallet", "")).lower() == str(wallet_address).lower() and t.get("type") == "claim" and t.get("isMock"))
        
        final_balance_eth = max(0, real_balance_eth - mock_buys - mock_rents + mock_claims)

        return {
            "data": portfolio,
            "pendingRentEth": f"{final_pending_eth:.4f}",
            "balanceEth": f"{final_balance_eth:.4f}"
        }
    except Exception as e:
        print(f"Error in get_portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/debug/transactions/{wallet}")
def debug_txs(wallet: str, db: Session = Depends(get_db)):
    txs = [tx_to_dict(t) for t in db.query(DbTransaction).all()]
    filtered = [t for t in txs if str(t.get("buyerWallet", "")).lower() == str(wallet).lower()]
    return {"wallet": wallet, "count": len(filtered), "txs": filtered}

@app.get("/transactions")
def get_all_transactions(db: Session = Depends(get_db)):
    """Returns ALL transactions from ALL investors (Global Feed) sorted by date"""
    txs = [tx_to_dict(t) for t in db.query(DbTransaction).all()]
    # Sort newest first
    txs.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return {"data": txs}

@app.get("/transactions/{wallet_address}")
def get_user_transactions(wallet_address: str, db: Session = Depends(get_db)):
    """Returns transactions for a specific investor sorted by date"""
    txs = [tx_to_dict(t) for t in db.query(DbTransaction).all()]
    filtered = [tx for tx in txs if tx["buyerWallet"].lower() == wallet_address.lower()]
    filtered.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return {"data": filtered}

@app.post("/transactions")
def add_transaction(tx: TransactionInput, db: Session = Depends(get_db)):
    new_id = str(uuid.uuid4())
    tx_hash = tx.txHash if tx.txHash else f"0x-mock-{uuid.uuid4().hex[:8]}"
    
    new_t = DbTransaction(
        id=new_id,
        propertyId=tx.propertyId,
        propertyName=tx.propertyName,
        sharesToBuy=tx.sharesToBuy,
        amountEth=tx.amountEth,
        buyerWallet=tx.buyerWallet.lower(),
        buyerName=tx.buyerName,
        txHash=tx_hash,
        isMock=tx.isMock,
        type=tx.type,
        tenantName=tx.tenantName,
        rentAmount=tx.rentAmount,
        createdAt=datetime.utcnow()
    )
    db.add(new_t)
    db.commit()
    
    return {"data": tx_to_dict(new_t)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
