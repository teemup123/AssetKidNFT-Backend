const { ethers, run, network } = require("hardhat")
const { networkConfig } = require("../../helper-hardhat-config")
const {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    BIA,
    FFT,
} = require("../../helper-hardhat-config")
const { verify } = require("../../utils/verify")
const { moveBlocks } = require("../../utils/move-blocks")

async function main() {
    let proxy_address = await networkConfig[network.config.chainId]
        .deployedContracts.gallery1.proxy
    console.log("-------------------------------")
    ;[owner, galleryAdmin] = await ethers.getSigners()
    console.log(`Gallery Admin's address: ${galleryAdmin.address}`)
    let GalleryContract = await ethers.getContractFactory(
        "GalleryContractUpgradeable",
        {
            libraries: {
                DeployAssemblerContract:
                    networkConfig[network.config.chainId].deployedContracts
                        .assemblerLib,
                DeployEscrowContract:
                    networkConfig[network.config.chainId].deployedContracts
                        .escrowLib,
            },
        }
    )

    // deploying assetKid Nft contract proxy

    console.log("Upgrading Gallery contract implementation ... ")

    const galleryContract = await upgrades.upgradeProxy(
        proxy_address,
        GalleryContract,
        {
            unsafeAllow: ["external-library-linking"],
        }
    )

    if (network.config.chainId == 31337) {
        moveBlocks(6)
    } else {
        await galleryContract.deployTransaction.wait(6)
        verify(galleryContract.address)
    }

    console.log(`----------------------------------------`)
    console.log("Updating Implementation Contract ... ")

    await galleryContract
        .connect(galleryAdmin)
        .setNftContractAddress(
            networkConfig[network.config.chainId].deployedContracts.assetKidNft
                .proxy
        )

    if (network.config.chainId == 31337) {
        moveBlocks(6)
    } else {
        await galleryContract.deployTransaction.wait(6)
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
