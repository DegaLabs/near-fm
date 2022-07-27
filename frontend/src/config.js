const IsMainnet = window.location.hostname === "near.fm";
const TestNearConfig = {
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.near.org",
  archivalNodeUrl: "https://rpc.testnet.internal.near.org",
  contractName: "dev-1613368835598-7014445",
  walletUrl: "https://wallet.testnet.near.org",
};

const MainNearConfig = {
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.near.org",
  archivalNodeUrl: "https://rpc.testnet.internal.near.org",
  contractName: "dev-1613368835598-7014445",
  walletUrl: "https://wallet.testnet.near.org",
};

// const MainNearConfig = {
//   networkId: 'mainnet',
//   nodeUrl: 'https://rpc.mainnet.near.org',
//   contractName: 'berryclub.ek.near',
//   walletUrl: 'https://wallet.near.org',
// };
const NearConfig = IsMainnet ? MainNearConfig : TestNearConfig;
module.exports = { NearConfig };
