# High-End Web3 Real Estate Platform

A premium, responsive, and fully decentralized fractional real estate marketplace. This project allows users to invest in real estate by purchasing digital shares (tokens) and earning rental income directly on the blockchain.

## 🚀 Key Features
- **Fractional Ownership**: Invest in high-value properties for as little as 0.01 ETH.
- **On-Chain Yield Distribution**: Admins can distribute rental income; investors claim their portion directly via smart contracts.
- **Premium UI/UX**: Modern "Glassmorphic" design with a fully responsive layout for Mobile, Tablet, and Desktop.
- **MetaMask Integration**: Secure Web3 authentication and transaction signing.
- **Live Performance Metrics**: Real-time tracking of Portfolio Value, Yield %, and Claimable Rent.
- **Hybrid Backend**: Uses FastAPI for lightning-fast metadata orchestration and transaction logging.

---

## 🛠️ Technology Stack
- **Frontend**: React (Vite), CSS3 (Flexbox/Grid), Ethers.js
- **Backend**: FastAPI (Python), Web3.py
- **Blockchain**: Solidity (Smart Contracts), Hardhat (Local Environment)
- **Wallet**: MetaMask

---

## 📂 Project Structure
```text
web3_realestate/
├── blockchain/   # Solidity Smart Contracts & Hardhat environment
├── server/       # FastAPI Backend (Active Engine)
└── client/       # Premium React Frontend
```

---

## 🚦 Getting Started

### 1. Start Local Blockchain
Open **Terminal 1**:
```bash
cd blockchain
npm install
npm run node
```
*Keep this running to maintain the local Ethereum network.*

### 2. Deploy Smart Contracts
Open **Terminal 2**:
```bash
cd blockchain
# Copy .env.example to .env and set your private key if needed
npm run compile
npm run deploy:local
```
*Copy the Deployed Contract Address from the output.*

### 3. Start the Backend (FastAPI)
Open **Terminal 3**:
```bash
cd server
pip install -r requirements.txt
python main.py
```
*The backend orchestrates property metadata and transaction history at http://localhost:8000.*

### 4. Start the Frontend (React)
Open **Terminal 4**:
```bash
cd client
npm install
npm run dev
```
*Access the dashboard at http://localhost:5173.*

---

## 🦊 MetaMask Setup
1. Add a **Custom RPC Network**:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
2. **Import Account**: Use one of the private keys printed by the Hardhat Node in Terminal 1.

---

## 📜 Simple App Flow
1. **Connect Wallet**: Authenticate via MetaMask.
2. **Browse Properties**: View high-end listings with real-time availability.
3. **Invest**: Purchase fractional shares directly on-chain.
4. **Earn**: Watch your "Claimable Rent" grow as the Admin distributes yield.
5. **Withdraw**: Click "Claim Rent" to transfer your profits to your wallet.

---

## 🛡️ License
Distributed under the MIT License.
