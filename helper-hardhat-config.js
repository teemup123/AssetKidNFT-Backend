const networkConfig = {
    default: {
        name: "hardhat",
    },
    31337: {
        name: "localhost",
        callbackGasLimit: "500000", // 500,000 gas
        deployedContracts: {
            biaWallet: {
                proxy: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
                imp: ""
            },
            assetKidNft: {
                proxy: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
                imp: ""
            },
            assemblerLib: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
            escrowLib: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
            gallery1: {
                proxy: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
                imp: ""
            },
            gallery2: {
                proxy: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
                imp: ""
            },
        }
    },
    4: {
        name: "rinkeby",
    },

    80001: {
        name: "polygonTestNet",
        deployedContracts: {
            biaWallet: {
                proxy: "0xc5fb9DD60Dd3e7dE0E205e77981F494C914250fA",
                imp: "0x18dd89e9dA63A2390d59E1AfA66194807F8b5614"
            },
            assetKidNft: {
                proxy: "0x47acEe75cE302ACdab8f4Db78835aA719D220bB4",
                imp: "0xac2FdAb31084C34bf674CF5123cc2d913db6BbF8"
            },
            assemblerLib: "0x6CE6F9a7331BB28557b44973f77D6Dc16a47424E",
            escrowLib: "0x4f1cF63F4F90D1f3439aDf3BA2b07b96A05bd278",
            gallery1: {
                proxy: "0xBCAA3c36F27D460C54EE94B34aFB76A48F96f8eE",
                imp: "0xF087a830f36737069574846A1671Fb3b6cAE6995"
            },
            gallery2: {
                proxy: "0xF5f3a5923C3bEaFc9a5d22249a24325D6615c808",
                imp: "0x2c1De4de75e9FE4f140fbcBE125eBd08B0631B31"
            },
        }
    }
}


const developmentChains = ["hardhat", "localhost"]
const BIA = "0xb130f89938255007645fca0397717c42dda5d6fb544ae2028a106bc0e0bba8e7"
const FFT = "0x204e2560e88f1d0a68fd87ad260c282b9ad7480d8dc1158c830f3b87cf1b404d"
const VERIFICATION_BLOCK_CONFIRMATIONS = 6

module.exports = {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    BIA,
    FFT
}
