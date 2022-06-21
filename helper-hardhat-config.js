const networkConfig = {
    default: {
        name: "hardhat",
    },
    31337: {
        name: "localhost",
        callbackGasLimit: "500000", // 500,000 gas
    },
    4: {
        name: "rinkeby",
    }
}

const developmentChains = ["hardhat", "localhost"]
const VERIFICATION_BLOCK_CONFIRMATIONS = 6

module.exports = {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS
}
