const {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    BIA,
    FFT,
} = require("../helper-hardhat-config")

const { ethers, network, artifacts } = require("hardhat")
//const { deploy } = require("@openzeppelin/hardhat-upgrades/dist/utils")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { owner, galleryAdmin } = await getNamedAccounts()
    const chainId = network.config.chainId

    log("***************************")

    log("Deploying Libraries . . . ")

    // deploying libraries
    const deployAssemblerContract = await deploy("DeployAssemblerContract", {
        from: owner,
        log: true,
    })

    const deployEscrowContract = await deploy("DeployEscrowContract", {
        from: owner,
        log: true,
    })
    log("-------------------------")
    const galleryContract = await deploy("GalleryContractUpgradeable", {
        from: owner,
        args: [], //galleryAdmin.address, BIA, FFT
        log: true,
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            viaAdminContract: {
                name: "GalleryProxyAdmin",
                artifacts: "GalleryProxyAdmin",
            },
        },
        libraries: {
            DeployAssemblerContract: deployAssemblerContract.address,
            DeployEscrowContract: deployEscrowContract.address,
        },
    })
    log("-------------------------")
    // deploying GalleryContract2

    const galleryContract2 = await deploy("GalleryContract2Upgradeable", {
        from: owner,
        args: [],
        log: true,
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            viaAdminAcontract: {
                name: "GalleryProxyAdmin",
                artifacts: "GalleryProxyAdmin",
            },
        },
        libraries: {
            DeployEscrowContract: deployEscrowContract.address,
        },
    })
    log("-------------------------")
    // deploying Wallet Contract

    const biaWalletContract = await deploy("BiaWalletContract", {
        from: owner,
        log: true,
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            viaAdminContract: {
                name: "GalleryProxyAdmin",
                artifacts: "GalleryProxyAdmin",
            },
        },
        args: [],
    })
    log("-------------------------")
    // deploying assetKidNft

    const assetKidNftContract = await deploy("AssetKidNftUpgradeable", {
        from: owner,
        log: true,
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            viaAdminContract: {
                name: "GalleryProxyAdmin",
                artifacts: "GalleryProxyAdmin",
            },
        },
        args: [],
    })
    log("-------------------------")

    log("Setting Up ... ")

    biaWalletContract
        .connect(galleryAdmin)
        .setNftContractAddress(assetKidNftContract.address)

    galleryContract
        .connect(galleryAdmin)
        .setNftContractAddress(assetKidNftContract.address)

    assetKidNftContract
        .connect(galleryAdmin)
        .setGalleryAddress(galleryContract.address)

    await galleryContract
        .connect(galleryAdmin)
        .setGallery2Address(gallery2Contract.address)

    await assetKidNftContract
        .connect(creator1)
        .setApprovalForAll(gallery2Contract.address, true)

    await assetKidNftContract
        .connect(creator2)
        .setApprovalForAll(gallery2Contract.address, true)
}
