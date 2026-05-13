@echo off
echo =============================================
echo  Web3 Real Estate Platform - Full Startup
echo =============================================

echo [1/4] Starting Hardhat local blockchain node...
start "Hardhat Node" cmd /k "cd /d %~dp0blockchain && npx hardhat node"

echo [2/4] Waiting 8 seconds for node to initialize...
timeout /t 8 /nobreak

echo [3/4] Deploying smart contract and updating .env files...
cd /d %~dp0blockchain
npx hardhat run scripts/deploy.js --network localhost
echo Contract deployed! .env files updated.

echo [4/4] Starting backend server...
start "FastAPI Backend" cmd /k "cd /d %~dp0server && python main.py"

echo [5/5] Starting React frontend...
start "React Frontend" cmd /k "cd /d %~dp0client && npm run dev"

echo =============================================
echo  All services started!
echo  - Hardhat Node:   http://127.0.0.1:8545
echo  - Backend API:    http://localhost:8001
echo  - Frontend:       http://localhost:5174
echo =============================================
pause
