const { ethers, run, network } = require("hardhat")
const {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    BIA,
    FFT,
} = require("../../helper-hardhat-config")
const { verify } = require("../../utils/verify")
const { deployLib } = require("../helpful-scripts")
let proxy_address = "0x47acEe75cE302ACdab8f4Db78835aA719D220bB4"

async function main() {
    console.log("-------------------------------")
    ;[owner, galleryAdmin] = await ethers.getSigners()
    console.log(`Owner's address: ${owner.address}`)
    console.log(`Gallery Admin's address: ${galleryAdmin.address}`)
    let AssetKidNftContract = await ethers.getContractFactory(
        "AssetKidNftUpgradeable"
    )
    // deploying assetKid Nft contract proxy

    console.log("Upgrading assetKid Nft contract proxy ... ")

    const assetKidNftContract = await upgrades.upgradeProxy(
        proxy_address,
        AssetKidNftContract
    )

    await assetKidNftContract.deployTransaction.wait(6)
    verify(assetKidNftContract.address)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
