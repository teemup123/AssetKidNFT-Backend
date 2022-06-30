const { ethers, run, network } = require("hardhat")

async function deployLib() {
    const AssemblerLib = await ethers.getContractFactory(
        "DeployAssemblerContract"
    )
    const assemblerLibContract = await AssemblerLib.deploy()
    await assemblerLibContract.deployed()
    //console.log(`Deploy Assembler Lib to: ${assemblerLibContract.address}`)

    const AssetKidNFTLib = await ethers.getContractFactory("DeployAssetKidNFT")
    const assetKidNFTLib = await AssetKidNFTLib.deploy()
    await assetKidNFTLib.deployed()
    //console.log(`Deploy AssetkidNFT Lib to: ${assetKidNFTLib.address}`)

    const EscrowContractLib = await ethers.getContractFactory(
        "DeployEscrowContract"
    )
    const escrowLib = await EscrowContractLib.deploy()
    await escrowLib.deployed()
    //console.log(`Deploy Escrow Lib to: ${escrowLib.address}`)

    //console.log("libraries Deployed ! ")

    return { assemblerLibContract, assetKidNFTLib, escrowLib }
}

async function main() {
    const libraries = await deployLib()
    const GalleryContract = await ethers.getContractFactory("GalleryContract", {
        libraries: {
            DeployAssemblerContract: String(
                libraries.assemblerLibContract.address
            ),
            DeployAssetKidNFT: String(libraries.assetKidNFTLib.address),
            DeployEscrowContract: String(libraries.escrowLib.address),
        },
    })
    const galleryContract = await GalleryContract.deploy()
    await galleryContract.deployed()
    assetKidNftAddress = await galleryContract.getAssetKidNftAddress()
    assetKidNftContract = await ethers.getContractAt(
        "AssetKidNFT",
        assetKidNftAddress
    )
    ;[owner, creator, collector1] = await ethers.getSigners()

    await assetKidNftContract.connect(creator).setApproval4Gallery()
    await assetKidNftContract.connect(collector1).setApproval4Gallery()
    // Fund wallet by the owner
    await galleryContract.connect(owner).fundAddress(collector1.address, 1000)
    hexId = await galleryContract.getHexId(0)
    collectorBia = await assetKidNftContract.balanceOf(
        collector1.address,
        hexId
    )
    console.log(`Init collector BIA: ${collectorBia}`)

    _baseTier = 10
    _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

    hexArray = [
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

    // CREATING TIER COLLECTABLE

    await galleryContract
        .connect(creator)
        .createTierCollectable(_baseTier, _subsequentTier, hexArray)

    initAmt = 50
    initPrice = 100

    // Escrow Contract Address
    escrowContract = await galleryContract.getEscrowContract(2)

    // CREATOR COMMERCIALIZING
    await galleryContract
        .connect(creator)
        .commercializeCollectionId(2, initAmt, initPrice, false)

    escrowBiaBal_init = await assetKidNftContract.balanceOf(escrowContract, await galleryContract.getHexId(0))
    console.log(`Init escrow BIA bal: ${escrowBiaBal_init}`)

    // Collector 1 supporting

    console.log("collector 1 supporting the project ... ")
    supportAmt = 2
    await galleryContract.connect(collector1).supportCollectionId(2, supportAmt)
    escrowBiaBal = await assetKidNftContract.balanceOf(escrowContract, await galleryContract.getHexId(0))
    console.log(`After support escrow BIA bal: ${escrowBiaBal}`)


    // get contract status for all token ids in collection

    escrowLibContract = await ethers.getContractAt(
        "DeployEscrowContract",
        String(libraries.escrowLib.address)
    )

    otherTokenInfo = await escrowLibContract.getOtherTokenInCollection(2,2,7, galleryContract.address)
    for (i=0; i<5; i++){
        escrowContract = await galleryContract.getEscrowContract(otherTokenInfo[i])
        console.log(escrowContract)
        escrowBiaBal = await assetKidNftContract.balanceOf(escrowContract, await galleryContract.getHexId(0))
        console.log(`BIA Bal in Escrow: ${escrowBiaBal}`)
        
    }
    console.log("-----------------------Approving--------------------")

    await galleryContract.connect(owner).approveCollectionId(2)
    for (i=0; i<5; i++){
        escrowContract = await galleryContract.getEscrowContract(otherTokenInfo[i])
        console.log(escrowContract)
        escrowBiaBal = await assetKidNftContract.balanceOf(escrowContract, await galleryContract.getHexId(0))
        console.log(`BIA Bal in Escrow: ${escrowBiaBal}`)
        
    }
    console.log("-----------------------Creator Claiming BIA --------------------")
    await galleryContract.connect(creator).claimBIA(2)

    await galleryContract.connect(owner).approveCollectionId(2)
    for (i=0; i<5; i++){
        escrowContract = await galleryContract.getEscrowContract(otherTokenInfo[i])
        console.log(escrowContract)
        escrowBiaBal = await assetKidNftContract.balanceOf(escrowContract, await galleryContract.getHexId(0))
        console.log(`BIA Bal in Escrow: ${escrowBiaBal}`)
        
    }
   
    
    


    // supportInfo = await escrowContract.getYourSupportInfo(creator.address)
    // console.log(`Escrow info - BIA owed to collector: ${supportInfo}`)
}

// We recommend this pattern to be able to use async/await everywhere

// and properly handle errors.
main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
