import os
import json
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("RPC_URL", "http://127.0.0.1:8545")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
w3 = Web3(Web3.HTTPProvider(RPC_URL))

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
    }
]

def debug():
    print(f"RPC_URL: {RPC_URL}")
    print(f"CONTRACT_ADDRESS: {CONTRACT_ADDRESS}")
    print(f"Is connected: {w3.is_connected()}")
    
    if not CONTRACT_ADDRESS:
        print("Error: No CONTRACT_ADDRESS found")
        return

    try:
        checksum_contract = Web3.to_checksum_address(CONTRACT_ADDRESS)
        contract = w3.eth.contract(address=checksum_contract, abi=PLATFORM_ABI)
        print("Calling getProperties...")
        props = contract.functions.getProperties().call()
        print(f"Success! Found {len(props)} properties.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug()
