const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../../utils/move-blocks")
const { networkConfig } = require("../../helper-hardhat-config")

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

    let AssetKidNftContract = await ethers.getContractFactory(
        "AssetKidNftUpgradeable"
    )

  
    const assetKidNftContract = await AssetKidNftContract.attach(
        networkConfig[network.config.chainId].deployedContracts.assetKidNft.proxy
    )

    assetKidNftContract.connect(creator).setApprovalForAll(networkConfig[network.config.chainId].deployedContracts.gallery1.proxy, true)

    if (network.config.chainId == "31337"){
        await moveBlocks(1, (sleepAmount = 1000))
    }

}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})