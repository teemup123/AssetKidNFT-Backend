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
    ;[owner, galleryAdmin] = await ethers.getSigners()
    console.log(`Owner's address: ${owner.address}`)
    console.log(`Gallery Admin's address: ${galleryAdmin.address}`)

    let AssetKidNftContract = await ethers.getContractFactory(
        "AssetKidNftUpgradeable"
    )
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

    // deploying assetKid Nft contract proxy

    console.log("Deploying assetKid Nft contract proxy ... ")

    const assetKidNftContract = await upgrades.deployProxy(
        AssetKidNftContract,
        [galleryAdmin.address, biaWalletContract.address, BIA, FFT],
        { initializer: "initialize" }
    )

    await assetKidNftContract.deployTransaction.wait(6)

    console.log(assetKidNftContract.address)

    // deploying libraries
    console.log('Deploying Libraries ... ')
    const libraries = await deployLib()
    console.log(`Deploy Assembler Lib Contract: ${libraries.assemblerLibContract.address}`)

    console.log(`Deploy Escrow Lib Contract: ${libraries.escrowLib.address}`)


    // deploying galleryContract proxy
    
    GalleryContract = await ethers.getContractFactory(
        "GalleryContractUpgradeable",
        {
            libraries: {
                DeployAssemblerContract: String(
                    libraries.assemblerLibContract.address
                ),
                DeployEscrowContract: String(libraries.escrowLib.address),
            },
        }
    )
    
    console.log('Deploying GalleryContract ...')
    const galleryContract = await upgrades.deployProxy(
        GalleryContract,
        [galleryAdmin.address, BIA, FFT],
        {
            initializer: "initialize",
            unsafeAllow: ["external-library-linking"],
        }
    )
    await galleryContract.deployTransaction.wait(6)
    console.log(galleryContract.address)

    // deploying gallery2Contract proxy
    console.log('Deploying Gallery2Contract ...')
    
    const Gallery2Contract = await ethers.getContractFactory(
        "GalleryContract2Upgradeable",
        {
            libraries: {
                DeployEscrowContract: String(libraries.escrowLib.address),
            },
        }
    )

    gallery2Contract = await upgrades.deployProxy(
        Gallery2Contract,
        [galleryContract.address, assetKidNftContract.address],
        {
            initializer: "initialize",
            unsafeAllow: ["external-library-linking"],
        }
    )
    await gallery2Contract.deployTransaction.wait(6)
    console.log(gallery2Contract.address)

    
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
