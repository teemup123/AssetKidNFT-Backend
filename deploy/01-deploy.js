const { network, deployments, ethers } = require("hardhat")
const {
    developmentChains,
    networkConfig,
    BIA,
    FFT,
} = require("../helper-hardhat-config")
const { deployProject } = require("../scripts/helpful-scripts")
const zero_address = "0x0000000000000000000000000000000000000000"
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
upgrades.silenceWarnings()

module.exports = async () => {
    let projectInfo, galleryContract, assetKidNftContract, biaWalletContract,libraries
    projectInfo = await deployProject() // this is everything except gallery2 for some reason
    galleryContract = projectInfo.galleryContract
    assetKidNftContract = projectInfo.assetKidNftContract
    biaWalletContract = projectInfo.biaWalletContract
    libraries = projectInfo.libraries

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

    // Setting GalleryContract2Address
    await galleryContract
        .connect(galleryAdmin)
        .setGallery2Address(gallery2Contract.address)


    console.log(`Gallery Contract Address: ${galleryContract.address}`)
    console.log(`assetKidNftContract Address: ${assetKidNftContract.address}`)
    console.log(`biaWalletContract Address: ${biaWalletContract.address}`)
    console.log(`Gallery2 Address: ${gallery2Contract.address}`)
    console.log(`Assembler Library Address: ${projectInfo.assemblerLib}`)
    console.log(`Escrow Library Address: ${projectInfo.escrowLib}`)
}

module.exports.tags = ["all", "deployProject"]
