const { ethers, run, network } = require("hardhat")
const {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    BIA,
    FFT,
    networkConfig
} = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const {deployLib} = require("./helpful-scripts")

async function main() {

    console.log("-------------------------------")
    
    ;[owner, galleryAdmin] = await ethers.getSigners()
    console.log(`Owner's address: ${owner.address}`)
    console.log(`Gallery Admin's address: ${galleryAdmin.address}`)

    
    let escrowAddress = networkConfig[80001]["deployedContracts"].EscrowLib
    let galleryContractAddress = networkConfig[80001]["deployedContracts"]["Gallery1"].proxy
    let nftAddress = networkConfig[80001]["deployedContracts"]["assetKidNft"].proxy
    console.log(escrowAddress)
    

    Gallery2Contract = await ethers.getContractFactory(
        "GalleryContract2Upgradeable",
        {
            libraries: {
                DeployEscrowContract: String(escrowAddress),
            },
        }
    )
    
    console.log('Deploying Gallery2Contract ...')
    const gallery2Contract = await upgrades.deployProxy(
        Gallery2Contract,
        [galleryContractAddress, nftAddress],
        {
            initializer: "initialize",
            unsafeAllow: ["external-library-linking"],
        }
    )
    await gallery2Contract.deployTransaction.wait(6)
    console.log(galleryContract.address)
 
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
