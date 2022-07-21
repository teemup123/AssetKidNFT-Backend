const { ethers, network } = require("hardhat")
const {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    BIA,
    FFT,
} = require("../helper-hardhat-config")

const zero_address = "0x0000000000000000000000000000000000000000"
// let bia = "0x9be311107159657ffe70682e3b33dcaf994ed60bb0afd954dbdd8afa12f139e5"
// let fft = "0x204e2560e88f1d0a68fd87ad260c282b9ad7480d8dc1158c830f3b87cf1b404d"

async function deployLib() {
    const AssemblerLib = await ethers.getContractFactory(
        "DeployAssemblerContract"
    )
    const assemblerLibContract = await AssemblerLib.deploy()
    await assemblerLibContract.deployed()

    const EscrowContractLib = await ethers.getContractFactory(
        "DeployEscrowContract"
    )
    const escrowLib = await EscrowContractLib.deploy()
    await escrowLib.deployed()

    return { assemblerLibContract, escrowLib }
}

async function deployProject() {
    /**
     * This function will deploy contracts for the back-end of the AssetKidGallery project.
     * Contracts:
     *      1. BiaWallet contract proxy
     *      2. AssetKidNft contract proxy
     *      3. Libraries
     *          i. DeployAssembler
     *          ii. DeployEscrow
     *      4. Gallery contract proxy
     */

    if (developmentChains.includes(network.name)) {
        // if development, use ethers.getSigners()
        ;[
            owner,
            galleryAdmin,
            creator,
            collector1,
            lastCollector,
            creator1,
            creator2,
        ] = await ethers.getSigners()
    } else {
        ;[
            owner,
            galleryAdmin
        ] = await ethers.getSigners()
    }

    let AssetKidNftContract = await ethers.getContractFactory(
        "AssetKidNftUpgradeable"
    )
    let BiaWalletContract = await ethers.getContractFactory("BiaWalletContract")

    // deploying Wallet Contract

    const biaWalletContract = await upgrades.deployProxy(
        BiaWalletContract,
        [galleryAdmin.address, BIA, FFT],
        { initializer: "__init__BiaWalletContract" }
    )

    // deploying assetKid Nft contract proxy

    const assetKidNftContract = await upgrades.deployProxy(
        AssetKidNftContract,
        [galleryAdmin.address, biaWalletContract.address, BIA, FFT],
        { initializer: "initialize" }
    )

    adminAddress = await assetKidNftContract.getAdminAddress()

    // deploying libraries

    const libraries = await deployLib()

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

    const galleryContract = await upgrades.deployProxy(
        GalleryContract,
        [galleryAdmin.address, BIA, FFT],
        {
            initializer: "initialize",
            unsafeAllow: ["external-library-linking"],
        }
    )

    // deploying gallery2Contract proxy

    const Gallery2Contract = await ethers.getContractFactory(
        "GalleryContract2Upgradeable",
        {
            libraries: {
                DeployEscrowContract: String(libraries.escrowLib.address),
            },
        }
    )

    gallery2Contract = await upgrades.deployProxy(
        Gallery2Contract,
        [galleryContract.address, assetKidNftContract.address],
        {
            initializer: "initialize",
            unsafeAllow: ["external-library-linking"],
        }
    )

    // setting contract addresses by admin.

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

    return {
        biaWalletContract,
        galleryContract,
        gallery2Contract,
        assetKidNftContract,
        owner,
        galleryAdmin,
        creator,
        creator1,
        creator2,
        collector1,
        lastCollector,
        libraries,
    }
}

module.exports = { deployProject, deployLib }
