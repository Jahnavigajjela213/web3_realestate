const platformAbi = [
  "function getProperties() view returns ((string name,uint256 sharePriceWei,uint256 totalShares,uint256 sharesSold,address tokenAddress,uint256 totalRentDistributed)[])",
  "function buyShares(uint256 propertyId, uint256 shareCount) payable",
  "function distributeRent(uint256 propertyId) payable",
  "function claimRent(uint256 propertyId)",
  "function getClaimableRent(uint256 propertyId, address user) view returns (uint256)",
  "function owner() view returns (address)"
];

const erc20Abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)"
];

module.exports = { platformAbi, erc20Abi };
