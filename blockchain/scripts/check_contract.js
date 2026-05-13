const hre = require("hardhat");

async function main() {
    const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    console.log("Checking contract at:", contractAddress);
    
    try {
        const RealEstatePlatform = await hre.ethers.getContractFactory("RealEstatePlatform");
        const contract = await RealEstatePlatform.attach(contractAddress);
        
        const props = await contract.getProperties();
        console.log(`Success! Found ${props.length} properties.`);
        props.forEach((p, i) => {
            console.log(`- Property ${i}: ${p.name} (Sold: ${p.sharesSold}/${p.totalShares})`);
        });
    } catch (err) {
        console.error("FAILED to connect to contract:", err.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
