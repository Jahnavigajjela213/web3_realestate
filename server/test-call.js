const { ethers } = require("ethers");
const { platformAbi } = require("./src/config/contractAbi");
const env = require("./src/config/env");

async function test() {
  console.log("Connecting to:", env.rpcUrl);
  console.log("Contract:", env.contractAddress);
  const provider = new ethers.JsonRpcProvider(env.rpcUrl);
  const contract = new ethers.Contract(env.contractAddress, platformAbi, provider);

  try {
    console.log("Calling getProperties...");
    const props = await contract.getProperties();
    console.log("Success! Found", props.length, "properties.");
    console.log("First property name:", props[0][0]); // Access by index
  } catch (err) {
    console.error("Error calling getProperties:", err.message);
    if (err.data) console.error("Error data:", err.data);
  }
}

test();
