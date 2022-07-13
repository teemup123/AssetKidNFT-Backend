let AssetKidNftContract, assetkid_nft_contract, deployer
const zero_address = "0x0000000000000000000000000000000000000000"
let bia = "0x9be311107159657ffe70682e3b33dcaf994ed60bb0afd954dbdd8afa12f139e5"
let fft = "0x204e2560e88f1d0a68fd87ad260c282b9ad7480d8dc1158c830f3b87cf1b404d"

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

async function deployProxyContracts() {
    ;[owner, galleryAdmin] = await ethers.getSigners()
    AssetKidNftContract = await ethers.getContractFactory(
        "AssetKidNftUpgradeable"
    )

    // deploying assetKid Nft contract proxy

    assetkid_nft_contract = await upgrades.deployProxy(
        AssetKidNftContract,
        [galleryAdmin.address, bia, fft],
        { initializer: "initialize" }
    )

    console.log(
        `AssetKidNft proxy deployed to: ${assetkid_nft_contract.address}`
    )
    adminAddress = await assetkid_nft_contract.getAdminAddress()
    console.log(`Gallery Admin Address: ${adminAddress}`)
    BiaAmount = await assetkid_nft_contract.balanceOf(
        assetkid_nft_contract.address,
        bia
    )
    FftAmount = await assetkid_nft_contract.balanceOf(
        assetkid_nft_contract.address,
        fft
    )
    console.log(
        `AssetKidNft proxy contract holds ${BiaAmount} BIA & ${FftAmount} FFT`
    )

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

    gallery_contract = await upgrades.deployProxy(
        GalleryContract,
        [galleryAdmin.address, bia, fft],
        { 
            initializer: "initialize" ,
            unsafeAllow: ["external-library-linking"]
        }
    )

    console.log(`Gallery proxy deployed to: ${gallery_contract.address}`)
    console.log(`Gallery Admin Address: ${adminAddress}`)
}

module.exports = { deployLib, deployProxyContracts }
