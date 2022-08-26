const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../../utils/move-blocks")
const { networkConfig } = require("../../helper-hardhat-config")
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

    let AssetKidNftContract = await ethers.getContractFactory(
        "AssetKidNftUpgradeable"
    )

    console.log(`assetKidNftAddress:${networkConfig[network.config.chainId].deployedContracts.assetKidNft
        .proxy}`)

    const assetKidNftContract = await AssetKidNftContract.attach(
        networkConfig[network.config.chainId].deployedContracts.assetKidNft
            .proxy
    )
    await assetKidNftContract
        .connect(galleryAdmin)
        .setNewBiaMetaData(
            "https://ipfs.io/ipfs/bafybeicpneod3h5apdxdytnydmr6ga3rfrtwwrzzulcuxmrah46qkmcp6q/metadata.json"
        )
    await assetKidNftContract
        .connect(galleryAdmin)
        .setNewFftMetaData(
            "https://ipfs.io/ipfs/bafybeichitywjbgozwy26hknqilcrcqtttxv6jyylu6gbmjcatsc4lt3zu/metadata.json"
        )

    if (network.config.chainId == "31337") {
        await moveBlocks(1, (sleepAmount = 1000))
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
