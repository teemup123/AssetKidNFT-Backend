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
    await galleryContract.connect(owner).transferBetween(
        galleryContract.address,
        collector1.address,
        0,
        100
     )

    _baseTier = 10
    _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

    await galleryContract
        .connect(creator)
        .createTierCollectable(_baseTier, _subsequentTier)

    // Approve collection and submit bid/offer, study escrow and nft contract.
    await galleryContract.connect(owner).approveCollectionId(2)
    creatorPrice = 60 
    creatorAmt = 20
    await galleryContract.connect(creator).submitOffer(2, creatorAmt, creatorPrice, false) // id, amount, price, bid
    // NFT Contract info
    creatorToken2 = await assetKidNftContract.balanceOf(creator.address, "2")
    console.log(`Creator submitted ${creatorAmt} tokens at ${creatorPrice} BIA`)
    console.log(`Creator nft contract info - TokenId 2 : ${creatorToken2}`)
    // Escrow Info
    escrowContractAddress = await galleryContract.connect(creator).getEscrowContract("2")
    escrowContract = await ethers.getContractAt(
        "EscrowContract",
        escrowContractAddress )
    escrow_ask_array = await escrowContract.connect(creator).getAskArrayInfo("0")
    console.log(`escrow contract info - ask Index 0 : ${escrow_ask_array}`)


    

    console.log(`-------------------------------------------------------------------`)

    initCollect1BIA = await assetKidNftContract.connect(collector1).balanceOf(collector1.address, "0")
    console.log(`Initial collector1 BIA: ${initCollect1BIA}`)

    collectorPrice = 60 //BIA
    collectorAmt = 1 // Tokens
    await galleryContract.connect(collector1).submitOffer(2, collectorAmt, collectorPrice, true) // buying at 60.
    console.log(`collector1 submit bid for ${collectorAmt} tokens, at ${collectorPrice} BIA`)

    Collect1BIA = await assetKidNftContract.connect(collector1).balanceOf(collector1.address, "0")
    console.log(`Collector1 BIA: ${Collect1BIA}`)

    escrow_bid_array = await escrowContract.connect(collector1).getBidArrayInfo("0")
    console.log(`escrow contract info - bid Index 0 : ${escrow_bid_array}`)
    collector1Bia = await assetKidNftContract.balanceOf(collector1.address, "0")
    console.log(`Collector1 nft contract info - BIA : ${collector1Bia}`)

    creatorBia = await assetKidNftContract.balanceOf(creator.address, "0")
    console.log(`Creators nft contract info - BIA : ${creatorBia}`)

    escrow_ask_array = await escrowContract.connect(creator).getAskArrayInfo("0")
    console.log(`Final escrow contract info - ask Index 0 : ${escrow_ask_array}`)


}

// We recommend this pattern to be able to use async/await everywhere

// and properly handle errors.
main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
