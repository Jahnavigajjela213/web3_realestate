const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  const Platform = await hre.ethers.getContractFactory("RealEstatePlatform");
  const platform = Platform.attach(contractAddress);

  // Let's distribute rent to Property 0 (Green Villa)
  const propertyId = 0; 
  const rentAmount = hre.ethers.parseEther("0.5"); // 0.5 ETH total rent to distribute

  console.log(`Distributing ${hre.ethers.formatEther(rentAmount)} ETH rent to property ${propertyId} token holders...`);
  
  try {
    const tx = await platform.distributeRent(propertyId, { 
      value: rentAmount,
      gasLimit: 300000 // reasonable manual gas limit
    });
    await tx.wait();
    console.log("✅ Rent distributed successfully!");
  } catch (err) {
    console.error("Failed to distribute rent. Reason:", err.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
