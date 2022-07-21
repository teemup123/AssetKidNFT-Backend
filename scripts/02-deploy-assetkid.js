const { ethers, run, network } = require("hardhat")
const {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    BIA,
    FFT,
} = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

async function main() {
    console.log("-------------------------------")
    ;[owner, galleryAdmin] = await ethers.getSigners()
    console.log(`Owner's address: ${owner.address}`)
    console.log(`Gallery Admin's address: ${galleryAdmin.address}`)
    let AssetKidNftContract = await ethers.getContractFactory(
        "AssetKidNftUpgradeable"
    )
    // deploying assetKid Nft contract proxy

    console.log("Deploying assetKid Nft contract proxy ... ")

    const assetKidNftContract = await upgrades.deployProxy(
        AssetKidNftContract,
        [galleryAdmin.address, "0xd530f77aEce59981c5D57ac11e563dB08025077d", BIA, FFT],
        { initializer: "initialize" }
    )

    await assetKidNftContract.deployTransaction.wait(6)
    console.log(assetKidNftContract.address)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
