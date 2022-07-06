require("@nomiclabs/hardhat-waffle")
require("dotenv").config()
require("@nomiclabs/hardhat-etherscan")
require("hardhat-gas-reporter")
require("solidity-coverage")
require("@Openzeppelin/hardhat-upgrades")
const fs = require("fs-extra")

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL || "https://eth-rinkeby"
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x000" // Find a way to encrypt and decrypt on hard hat or smt
const ETHER_SCAN_API_KEY = process.env.ETHER_SCAN_API_KEY || "0x000"
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "0x000"
module.exports = {
    // defaultNetwork: "hardhat"
    defaultNetwork: "hardhat",
    networks: {
        rinkeby: {
            url: RINKEBY_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 4,
        },
        localhost: {
            url: "http://127.0.0.1:8545/",
            // accounts: Thanks hardhat!
            chainId: 31337,
        },
    },
    solidity: "0.8.4",
    etherscan: {
        apiKey: ETHER_SCAN_API_KEY,
    },
    gasReporter: {
        enable: false,
        outputFile: "gas-report.txt",
        noColors: true,
        currency: "USD",
        coinmarketcap: COINMARKETCAP_API_KEY,
        token: "MATIC",
    },
}