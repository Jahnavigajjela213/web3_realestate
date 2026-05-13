@app.get("/properties")
def get_properties():
    try:
        # Ensure checksum address
        try:
            checksum_contract = Web3.to_checksum_address(CONTRACT_ADDRESS)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid CONTRACT_ADDRESS")
            
        contract = w3.eth.contract(address=checksum_contract, abi=PLATFORM_ABI)
        raw_props = []
        metadata = load_json(PROPERTIES_METADATA_FILE)
        txs = load_json(TRANSACTIONS_FILE)
        
        try:
            raw_props = contract.functions.getProperties().call()
        except Exception as e:
            print(f"Graceful handle in get_properties: Contract call failed. Using mock/metadata only.")
            raw_props = []

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
        simulated = load_json(SIMULATED_PROPERTIES_FILE)
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
