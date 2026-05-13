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

const DEMO_PRIVATE_KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Acc 0 (Admin)
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Acc 1
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Acc 2
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // Acc 3
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // Acc 4 (Investor)
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba", // Acc 5
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e", // Acc 6
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356", // Acc 7
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97", // Acc 8
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6", // Acc 9
  "0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897", // Acc 10
  "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82", // Acc 11
  "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1", // Acc 12 (Tenant)
  "0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd", // Acc 13
  "0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa", // Acc 14
  "0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61", // Acc 15
  "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0", // Acc 16
  "0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd", // Acc 17
  "0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0", // Acc 18
  "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e"  // Acc 19
];

import { Wallet } from "ethers";

async function getContractWithSigner(provider) {
  if (!APP_CONFIG.contractAddress) {
    throw new Error("Missing VITE_CONTRACT_ADDRESS in client/.env");
  }

  // If MetaMask provider is available, use it
  if (provider && typeof provider.getSigner === 'function') {
    const signer = await provider.getSigner();
    return new Contract(APP_CONFIG.contractAddress, contractAbi, signer);
  }

  // FALLBACK: Use Demo Signer from Local Storage address
  const savedAddr = localStorage.getItem("walletAddress");
  const DEMO_ADDRESSES = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9", "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    "0xBcd4042DE499D14e55001CcbB24a551F3b954096", "0x71bE63f3384f5fb98995898A86B02Fb2426c5788",
    "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a", "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec",
    "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097", "0xcd3B766CCDd6AE721141F452C550Ca635964ce71",
    "0x2546BcD3c84621e976D8185a91A922aE77ECEc30", "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
    "0xdD2FD4581271e230360230F9337D5c0430Bf44C0", "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"
  ];
  
  const index = DEMO_ADDRESSES.findIndex(a => a.toLowerCase() === savedAddr?.toLowerCase());
  
  if (index !== -1) {
    const rpcProvider = new JsonRpcProvider(APP_CONFIG.rpcUrl);
    const demoSigner = new Wallet(DEMO_PRIVATE_KEYS[index], rpcProvider);
    return new Contract(APP_CONFIG.contractAddress, contractAbi, demoSigner);
  }

  throw new Error("Blockchain actions require MetaMask or a Demo Account.");
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
        lastPaid: Number(t.lastPaid),
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
  const tx = await contract.payMonthlyRent(propertyId, { value: rentWei });
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
