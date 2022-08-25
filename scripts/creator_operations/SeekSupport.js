const { ethers, network } = require("hardhat")
const {networkConfig} = require("../../helper-hardhat-config")
const { moveBlocks } = require("../../utils/move-blocks")

async function main() {
    ;[
        owner,
        galleryAdmin,
        creator,
        collector1,
        lastCollector,
        creator1,
        creator2,
    ] = await ethers.getSigners()

    const GalleryContract = await ethers.getContractFactory(
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
    const galleryContract = await GalleryContract.attach(
        networkConfig[network.config.chainId].deployedContracts.gallery1.proxy
    )

    let tokenId = 2,
        amount = 15,
        price = 1000,
        cancel = false

    await galleryContract
        .connect(creator)
        .commercializeCollectionId(tokenId, amount, price, cancel)

    if (network.config.chainId == "31337") {
        await moveBlocks(1, (sleepAmount = 1000))
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
