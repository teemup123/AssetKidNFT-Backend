const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../../utils/move-blocks")
const hexArray = [
    "0xa85ac9d365ca47ee0c7570f8979a4f78b4e3b16c9422db94864a6c25637c662e",
    "0x6c4d63bf70041bfeffe7c250447170c53a081569e4ad44c3034c5f5023b35678",
    "0x1d40787e76ef7570c8fc88a03ad293aa4d9949a5744c3cf16b24e68034cbc519",
    "0xc651779b785af9d19d796342aadcd88cf642c1b11df85e415a3842ed26138aca",
    "0x008e6b3b7108e5c8d2a4f5f4286202ad9a74b3a84b7a5804cdd10c6d302338b8",
    "0x5ed8a07aa2a501489ab54d3e019df507c27a01ae1dacc11fe100eaa058725861",
    "0x3b5b8ca65757c0ce22777ffe9b13063098d90a65a252847bcee814b355336b13",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
]

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
                    "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
                DeployEscrowContract:
                    "0x0165878A594ca255338adfa4d48449f69242Eb8F",
            },
        }
    )
    const galleryContract = await GalleryContract.attach(
        "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"
    )

    let baseTier = 10
    let subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

    await galleryContract
        .connect(creator)
        .createTierCollectable(baseTier, subsequentTier, hexArray)
    
    if (network.config.chainId == "31337"){
        await moveBlocks(1, (sleepAmount = 1000))
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
