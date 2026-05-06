# Simple Web3 Real Estate (Local Only)

This is a beginner-friendly project with:
- `React` frontend
- `Node + Express` backend
- `Solidity + Hardhat` local blockchain
- `MetaMask` wallet

No AWS and no cloud services.

## Step 1: Folder Structure

```text
web3_realestate/
  blockchain/   # smart contract + local chain scripts
  server/       # backend APIs (GET /properties, POST /buy)
  client/       # simple React UI
```

## Step 2: Start Local Blockchain

Open terminal 1:

```bash
cd blockchain
npm install
npm run node
```

Keep terminal 1 running.

Open terminal 2:

```bash
cd blockchain
copy .env.example .env
npm run compile
npm run deploy:local
```

Copy the deployed contract address from terminal output.

## Step 3: Start Backend

Open terminal 3:

```bash
cd server
npm install
copy .env.example .env
```

Edit `server/.env` and set:

```text
CONTRACT_ADDRESS=PASTE_DEPLOYED_ADDRESS_HERE
```

Then run:

```bash
npm run dev
```

Backend runs at `http://localhost:4000`.

## Step 4: Start Frontend

Open terminal 4:

```bash
cd client
npm install
copy .env.example .env
```

Edit `client/.env` and set:

```text
VITE_CONTRACT_ADDRESS=PASTE_DEPLOYED_ADDRESS_HERE
```

Then run:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Step 5: MetaMask Setup

Add network in MetaMask:
- Network Name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency Symbol: `ETH`

Import one test private key printed by Hardhat node.

## Simple App Flow

1. Click **Connect MetaMask**
2. View list of properties
3. Click **Buy 1 Share**
4. Confirm tx in MetaMask
5. App sends tx hash to backend (`POST /buy`)
6. Transaction history updates in UI

## Backend APIs

- `GET /properties`  
  Returns property list from smart contract

- `POST /buy`  
  Verifies tx hash on local chain and stores history

Request body example:

```json
{
  "propertyId": 0,
  "sharesToBuy": 1,
  "buyerWallet": "0xYourWalletAddress",
  "txHash": "0xTransactionHash"
}
```
