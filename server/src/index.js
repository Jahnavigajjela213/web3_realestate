const app = require("./app");
const env = require("./config/env");

app.listen(env.port, () => {
  // Server initialized (CORS fixed)
  console.log(`Using contract address: ${env.contractAddress}`);
  // Server initialized (Global CORS enabled)
});
