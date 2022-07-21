require("@nomiclabs/hardhat-waffle")
require("dotenv").config()
require("@nomiclabs/hardhat-etherscan")
require("hardhat-gas-reporter")
require("solidity-coverage")
require("@Openzeppelin/hardhat-upgrades")
require("hardhat-deploy")


const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL || "https://eth-rinkeby"
const POLYGON_MUMBAI_RPC_URL = process.env.POLYGON_MUMBAI_RPC_URL || "https://polygon-mumbai.infura.io/v3/9401bd79a75c4c9e92bf0bc6a84c3a14"
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x000" // Find a way to encrypt and decrypt on hard hat or smt
const PRIVATE_KEY_OWNER = process.env.PRIVATE_KEY_OWNER || "0x000" // Find a way to encrypt and decrypt on hard hat or smt
const PRIVATE_KEY_GALLERY_ADMIN = process.env.PRIVATE_KEY_GALLERY_ADMIN || "0x000" // Find a way to encrypt and decrypt on hard hat or smt

const ETHER_SCAN_API_KEY = process.env.ETHER_SCAN_API_KEY || "0x000"
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "0x000"
const REPORT_GAS = process.env.REPORT_GAS || false

const POLYGON_SCAN_API_KEY =
  process.env.POLYGON_SCAN_API_KEY || "Your polygonscan API key"

module.exports = {
    // defaultNetwork: "hardhat"
    defaultNetwork: "hardhat",
    networks: {
        localhost: {
            url: "http://127.0.0.1:8545/",
            // accounts: Thanks hardhat!
            chainId: 31337,
        },
        hardhat: {
            // // If you want to do some forking, uncomment this
            // forking: {
            //   url: MAINNET_RPC_URL
            // }
            chainId: 31337,
        },
        rinkeby: {
            url: RINKEBY_RPC_URL,
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            //   accounts: {
            //     mnemonic: MNEMONIC,
            //   },
            saveDeployments: true,
            chainId: 4,
        },
        polygonTestNet: {
            url: POLYGON_MUMBAI_RPC_URL,
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY_OWNER, PRIVATE_KEY_GALLERY_ADMIN] : [],
            // saveDeployments: true,
            chainId: 80001,
            timeout: 60000,
        },
    },
    solidity: "0.8.7",
    etherscan: {
        apiKey: POLYGON_SCAN_API_KEY,
    },
    gasReporter: {
        enable: REPORT_GAS,
        outputFile: "gas-report.txt",
        noColors: true,
        currency: "USD",
        coinmarketcap: COINMARKETCAP_API_KEY,
        token: "MATIC",
    },
    namedAccounts: {
        owner: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
        },
        galleryAdmin: {
            default: 1,
        },
        creator: {
            default: 2,
        },
        collector1: {
            default: 3,
        },
        lastCollector: {
            default: 4,
        },
        creator1: {
            default: 5,
        },
        creator2: {
            default: 6,
        },
    }
}

