const { ethers, network } = require("hardhat")
const fs = require("fs")
const frontEndContractsFile =
    "../assetkidnft-frontend/constants/networkMapping.json"
const frontEndAbiLocation = "../assetkidnft-frontend/constants/"
const { networkConfig } = require("../helper-hardhat-config")
const { deployContract } = require("ethereum-waffle")

module.exports = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...")
        // await updateContractAddresses()
        await updateAbi()
        console.log("Front end written!")
    }
}

async function updateAbi() {
    const chainId = network.config.chainId.toString()
    const assemblerLibAddress =
        networkConfig[chainId].deployedContracts.assemblerLib
    const escrowLibAddress = networkConfig[chainId].deployedContracts.escrowLib

    galleryContract = await ethers.getContractFactory(
        "GalleryContractUpgradeable",
        {
            libraries: {
                DeployAssemblerContract: String(assemblerLibAddress),
                DeployEscrowContract: String(escrowLibAddress),
            },
        }
    )

    fs.writeFileSync(
        `${frontEndAbiLocation}Gallery.json`,
        galleryContract.interface.format(ethers.utils.FormatTypes.json)
    )

    let assetKidNftContract = await ethers.getContractFactory(
        "AssetKidNftUpgradeable"
    )
    
    fs.writeFileSync(
        `${frontEndAbiLocation}AssetKidNft.json`,
        assetKidNftContract.interface.format(ethers.utils.FormatTypes.json)
    )
}

// async function updateContractAddresses() {
//     const chainId = network.config.chainId.toString()
//     networkConfig[chainId]
//     // const nftMarketplace = await ethers.getContract("assetKidNftContract")
//     const nftMarketplaceAddress = JSON.parse(fs.readFileSync("", "utf8"))
//     const contractAddresses = JSON.parse(
//         fs.readFileSync(frontEndContractsFile, "utf8")
//     )
//     if (chainId in contractAddresses) {
//         if (
//             !contractAddresses[chainId]["assetKidNftContract"].includes(
//                 nftMarketplace.address
//             )
//         ) {
//             contractAddresses[chainId]["assetKidNftContract"].push(
//                 nftMarketplace.address
//             )
//         }
//     } else {
//         contractAddresses[chainId] = {
//             assetKidNftContract: [nftMarketplace.address],
//         }
//     }
//     fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
// }

module.exports.tags = ["all", "frontend"]
