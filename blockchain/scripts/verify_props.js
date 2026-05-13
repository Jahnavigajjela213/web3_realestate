const hre = require("hardhat");

async function main() {
  const address = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  const Platform = await hre.ethers.getContractFactory("RealEstatePlatform");
  const platform = Platform.attach(address);

  const props = await platform.getProperties();
  console.log(`Total properties on-chain: ${props.length}`);
  props.forEach((p, i) => {
    console.log(`${i}: ${p.name}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
