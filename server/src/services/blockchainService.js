const { ethers } = require("ethers");
const { platformAbi, erc20Abi } = require("../config/contractAbi");
const env = require("../config/env");

class BlockchainService {
  constructor() {
    if (!env.contractAddress) {
      throw new Error("CONTRACT_ADDRESS is required in server/.env");
    }
    this.provider = new ethers.JsonRpcProvider(env.rpcUrl);
    this.platform = new ethers.Contract(env.contractAddress, platformAbi, this.provider);
  }

  /**
   * Fetches the core property list from the main platform contract.
   */
  async getProperties() {
    const rawProperties = await this.platform.getProperties();
    return rawProperties.map((p, index) => ({
      id: index,
      name: p.name,
      sharePriceWei: p.sharePriceWei.toString(),
      sharePriceEth: ethers.formatEther(p.sharePriceWei),
      totalShares: Number(p.totalShares),
      sharesSold: Number(p.sharesSold),
      tokenAddress: p.tokenAddress,
      totalRentDistributed: ethers.formatEther(p.totalRentDistributed)
    }));
  }

  /**
   * Fetches the ERC-20 token balances for a specific wallet across all properties.
   */
  async getUserPortfolio(walletAddress) {
    const properties = await this.getProperties();
    const portfolio = await Promise.all(
      properties.map(async (p) => {
        const token = new ethers.Contract(p.tokenAddress, erc20Abi, this.provider);
        const balance = await token.balanceOf(walletAddress);
        const claimable = await this.platform.getClaimableRent(p.id, walletAddress);
        return {
          propertyId: p.id,
          propertyName: p.name,
          tokenAddress: p.tokenAddress,
          balance: balance.toString(),
          claimableRentEth: ethers.formatEther(claimable)
        };
      })
    );
    // Only return tokens the user actually owns
    return portfolio.filter(item => BigInt(item.balance) > 0n);
  }
}

module.exports = BlockchainService;
