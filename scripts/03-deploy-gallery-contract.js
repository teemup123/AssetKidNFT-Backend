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
    
 
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
