export const contractAbi = [
  // Read all properties (includes totalRentDistributed).
  "function getProperties() view returns ((string name,uint256 sharePriceWei,uint256 totalShares,uint256 sharesSold,address tokenAddress,uint256 totalRentDistributed)[])",
  // Buy shares.
  "function buyShares(uint256 propertyId, uint256 shareCount) payable",
  // Yield/Rent management.
  "function distributeRent(uint256 propertyId) payable",
  "function withdrawRent()",
  "function pendingWithdrawals(address user) view returns (uint256)",
  "function owner() view returns (address)",
  // Events.
  "event SharePurchased(uint256 propertyId, address buyer, uint256 shares, uint256 totalPaidWei)",
  "event RentDistributed(uint256 propertyId, uint256 totalAmount)",
  "event RentClaimed(address user, uint256 amount)"
];

export const erc20Abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function symbol() view returns (string)"
];
