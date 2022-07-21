const { ethers, run, network } = require("hardhat")
const {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    BIA,
    FFT,
} = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const {deployLib} = require("./helpful-scripts")

async function main() {

    console.log("-------------------------------")

    ;[owner, galleryAdmin] = await ethers.getSigners()
    console.log(`Owner's address: ${owner.address}`)
    console.log(`Gallery Admin's address: ${galleryAdmin.address}`)

    let BiaWalletContract = await ethers.getContractFactory("BiaWalletContract")

    // deploying Wallet Contract
    console.log("Deploying Wallet Contract Proxy ... ")

    const biaWalletContract = await upgrades.deployProxy(
        BiaWalletContract,
        [galleryAdmin.address, BIA, FFT],
        { initializer: "__init__BiaWalletContract" }
    )

    await biaWalletContract.deployTransaction.wait(6)
    
    console.log(biaWalletContract.address)
    
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
