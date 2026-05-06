async function getPortfolio(req, res, next) {
  const { walletAddress } = req.params;
  
  if (!walletAddress) {
    return res.status(400).json({ error: "walletAddress parameter is required" });
  }

  try {
    const portfolio = await req.services.blockchain.getUserPortfolio(walletAddress);
    return res.status(200).json({ data: portfolio });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPortfolio
};
