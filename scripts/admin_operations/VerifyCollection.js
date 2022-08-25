const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../../utils/move-blocks")

async function main(){
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
                    "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
                DeployEscrowContract:
                    "0x0165878A594ca255338adfa4d48449f69242Eb8F",
            },
        }
    )
    const galleryContract = await GalleryContract.attach(
        "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"
    )

    await galleryContract.connect(galleryAdmin).approveCollectionId(2)

    if (network.config.chainId == "31337"){
        await moveBlocks(1, (sleepAmount = 1000))
    }

}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})