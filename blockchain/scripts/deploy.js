const { ethers } = require("hardhat");

async function main() {
  // Get the first account from local Hardhat node.
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  // Deploy the simple contract.
  const platformFactory = await ethers.getContractFactory("RealEstatePlatform");
  // Set a safe gas limit for local Hardhat node.
  const platform = await platformFactory.deploy({ gasLimit: 8_000_000 });
  await platform.waitForDeployment();

  const contractAddress = await platform.getAddress();
  console.log(`RealEstatePlatform deployed at: ${contractAddress}`);
  console.log("Done. Contract already includes sample properties.");

  // Auto-update .env files
  const fs = require('fs');
  const path = require('path');
  
  const clientEnvPath = path.join(__dirname, '../../client/.env');
  const serverEnvPath = path.join(__dirname, '../../server/.env');

  const updateEnvFile = (filePath, key, value) => {
    let lines = [];
    if (fs.existsSync(filePath)) {
      lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    }
    
    let found = false;
    const newLines = lines.map(line => {
      if (line.startsWith(`${key}=`)) {
        found = true;
        return `${key}=${value}`;
      }
      return line;
    });

    if (!found) {
      newLines.push(`${key}=${value}`);
    }

    fs.writeFileSync(filePath, newLines.join('\n').trim() + '\n');
  };

  updateEnvFile(clientEnvPath, 'VITE_CONTRACT_ADDRESS', contractAddress);
  updateEnvFile(serverEnvPath, 'CONTRACT_ADDRESS', contractAddress);
  console.log('✅ Updated client/.env and server/.env with new contract address.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
