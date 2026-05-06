import { BrowserProvider, Contract, JsonRpcProvider, formatEther, parseEther } from "ethers";
import { APP_CONFIG } from "../config/env";
import { contractAbi, erc20Abi } from "../config/contractAbi";

// Property images matched by index (same order as contract constructor)
const PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80"
];

const PROPERTY_LOCATIONS = ["Bangalore", "Mumbai", "Hyderabad"];

function getReadonlyContract() {
  if (!APP_CONFIG.contractAddress) {
    throw new Error("Missing VITE_CONTRACT_ADDRESS in client/.env");
  }
  const provider = new JsonRpcProvider(APP_CONFIG.rpcUrl);
  return new Contract(APP_CONFIG.contractAddress, contractAbi, provider);
}

async function getContractWithSigner(provider) {
  if (!APP_CONFIG.contractAddress) {
    throw new Error("Missing VITE_CONTRACT_ADDRESS in client/.env");
  }
  const signer = await provider.getSigner();
  return new Contract(APP_CONFIG.contractAddress, contractAbi, signer);
}

/**
 * Fetch all properties from the chain + tenant info.
 */
export async function fetchProperties() {
  const contract = getReadonlyContract();
  const raw = await contract.getProperties();

  const properties = [];
  for (let i = 0; i < raw.length; i++) {
    const p = raw[i];
    const totalShares = Number(p.totalShares);
    const sharesSold = Number(p.sharesSold);
    const availableShares = totalShares - sharesSold;

    // Fetch tenant info for this property
    let tenantInfo = { name: "None", rentAmount: "0", isActive: false };
    try {
      const t = await contract.tenants(i);
      tenantInfo = {
        name: t.name,
        rentAmount: formatEther(t.rentAmount),
        isActive: t.isActive
      };
    } catch (e) {
      console.warn(`Could not fetch tenant for property ${i}`);
    }

    properties.push({
      id: i,
      name: p.name,
      location: PROPERTY_LOCATIONS[i] || "India",
      image: PROPERTY_IMAGES[i] || PROPERTY_IMAGES[0],
      sharePriceWei: p.sharePriceWei.toString(),
      sharePriceEth: formatEther(p.sharePriceWei),
      totalShares,
      sharesSold,
      availableShares,
      tokenAddress: p.tokenAddress,
      tenant: tenantInfo
    });
  }
  return properties;
}

/**
 * Buy shares on-chain.
 */
export async function buySharesOnChain({ provider, propertyId, shareCount, sharePriceWei }) {
  if (!(provider instanceof BrowserProvider)) {
    throw new Error("Wallet provider unavailable.");
  }

  const contract = await getContractWithSigner(provider);
  const totalCost = BigInt(sharePriceWei) * BigInt(shareCount);
  const tx = await contract.buyShares(propertyId, shareCount, { value: totalCost });
  const receipt = await tx.wait();

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    amountEth: formatEther(totalCost)
  };
}

/**
 * Get user's ERC-20 token balance for a specific property.
 */
export async function getUserTokenBalance(tokenAddress, walletAddress) {
  const provider = new JsonRpcProvider(APP_CONFIG.rpcUrl);
  const token = new Contract(tokenAddress, erc20Abi, provider);
  const balance = await token.balanceOf(walletAddress);
  return Number(balance);
}

/**
 * Withdraw accumulated rental yield for the user.
 */
export async function claimRentOnChain({ provider }) {
  if (!(provider instanceof BrowserProvider)) {
    throw new Error("Wallet provider unavailable.");
  }
  const contract = await getContractWithSigner(provider);
  const tx = await contract.withdrawRent();
  await tx.wait();
  return { txHash: tx.hash };
}

/**
 * Fetch pending rent for a user.
 */
export async function fetchPendingRent(walletAddress) {
  const contract = getReadonlyContract();
  const amountWei = await contract.pendingWithdrawals(walletAddress);
  return formatEther(amountWei);
}

/**
 * Fetch the admin (owner).
 */
export async function getContractOwner() {
  const contract = getReadonlyContract();
  const owner = await contract.owner();
  return owner.toLowerCase();
}

/**
 * ADMIN: Assign a tenant to a property.
 */
export async function setTenantOnChain({ provider, propertyId, name, rentEth }) {
  const contract = await getContractWithSigner(provider);
  const rentWei = parseEther(rentEth.toString());
  const tx = await contract.setTenant(propertyId, name, rentWei);
  await tx.wait();
  return { txHash: tx.hash };
}

/**
 * TENANT: Pay rent for a property.
 */
export async function payRentOnChain({ provider, propertyId, rentEth }) {
  const contract = await getContractWithSigner(provider);
  const rentWei = parseEther(rentEth.toString());
  const tx = await contract.payRent(propertyId, { value: rentWei });
  await tx.wait();
  return { txHash: tx.hash };
}

/**
 * ADMIN: Deploys a new property token.
 */
export async function addPropertyOnChain({ provider, name, symbol, sharePriceEth, totalShares }) {
  const contract = await getContractWithSigner(provider);
  const sharePriceWei = parseEther(sharePriceEth.toString());
  const tx = await contract.addProperty(name, symbol, sharePriceWei, totalShares, { gasLimit: 3000000 });
  await tx.wait();
  return { txHash: tx.hash };
}

/**
 * ADMIN: Deposits rent (ETH) manually.
 */
export async function distributeRentOnChain({ provider, propertyId, rentEth }) {
  const contract = await getContractWithSigner(provider);
  const rentWei = parseEther(rentEth.toString());
  const tx = await contract.distributeRent(propertyId, { value: rentWei, gasLimit: 300000 });
  await tx.wait();
  return { txHash: tx.hash };
}
