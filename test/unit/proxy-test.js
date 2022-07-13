const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config")
const { deployLib } = require("../../scripts/helpful-scripts")
const bia = "0x9be311107159657ffe70682e3b33dcaf994ed60bb0afd954dbdd8afa12f139e5"
const fft = "0x204e2560e88f1d0a68fd87ad260c282b9ad7480d8dc1158c830f3b87cf1b404d"
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

async function deployProject() {
    ;[
        owner,
        galleryAdmin,
        creator,
        collector1,
        lastCollector,
        creator1,
        creator2,
    ] = await ethers.getSigners()

    AssetKidNftContract = await ethers.getContractFactory(
        "AssetKidNftUpgradeable"
    )
    let BiaWalletContract = await ethers.getContractFactory("BiaWalletContract")

    // deploying Wallet Contract

    const biaWalletContract = await upgrades.deployProxy(
        BiaWalletContract,
        [galleryAdmin.address, bia, fft],
        { initializer: "__init__BiaWalletContract" }
    )

    // deploying assetKid Nft contract proxy

    const assetKidNftContract = await upgrades.deployProxy(
        AssetKidNftContract,
        [galleryAdmin.address, biaWalletContract.address, bia, fft],
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
        [galleryAdmin.address, bia, fft],
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

    return {
        biaWalletContract,
        galleryContract,
        assetKidNftContract,
        owner,
        galleryAdmin,
        creator,
        creator1,
        creator2,
        collector1,
        lastCollector,
        libraries
    }
}

describe("Testing Basic Functions Behind Proxies", function () {
    let projectInfo, galleryContract, assetKidNftContract, biaWalletContract

    beforeEach(async () => {
        projectInfo = await deployProject()
        galleryContract = projectInfo.galleryContract
        assetKidNftContract = projectInfo.assetKidNftContract
        biaWalletContract = projectInfo.biaWalletContract
    })

    describe("Initial Deployment", function () {
        it("Checking BIA in project wallet = 10^9", async function () {
            const currentValue = await assetKidNftContract.balanceOf(
                biaWalletContract.address,
                bia
            )
            const expectedValue = String(10 ** 9)
            assert.equal(currentValue.toString(), expectedValue)
        })

        it("Checking FFT in project wallet = 50", async function () {
            const currentValue = await assetKidNftContract.balanceOf(
                biaWalletContract.address,
                fft
            )
            const expectedValue = String(50)
            assert.equal(currentValue.toString(), expectedValue)
        })

        it("BIA & FFT assembler contracts are zero address", async function () {
            galleryContract = projectInfo.galleryContract
            biaTokenInfo = await galleryContract.getTokenInfo(0)
            fftTokenInfo = await galleryContract.getTokenInfo(1)

            assert.equal(biaTokenInfo[3], zero_address)
            assert.equal(fftTokenInfo[3], zero_address)
        })

        it("BIA & FFT escrow contracts are zero address", async function () {
            galleryContract = projectInfo.galleryContract
            biaTokenInfo = await galleryContract.getTokenInfo(0)
            fftTokenInfo = await galleryContract.getTokenInfo(1)

            assert.equal(biaTokenInfo[2], zero_address)
            assert.equal(fftTokenInfo[2], zero_address)
        })

        it("BIA & FFT percent rep. = 100%", async function () {
            galleryContract = projectInfo.galleryContract
            biaTokenInfo = await galleryContract.getTokenInfo(0)
            fftTokenInfo = await galleryContract.getTokenInfo(1)

            assert.equal(biaTokenInfo[1], "1000")
            assert.equal(fftTokenInfo[1], "1000")
        })

        it("BIA & FFT collection type is correct", async function () {
            galleryContract = projectInfo.galleryContract
            biaTokenInfo = await galleryContract.getTokenInfo(0)
            fftTokenInfo = await galleryContract.getTokenInfo(1)

            assert.equal(biaTokenInfo[4], "4")
            assert.equal(fftTokenInfo[4], "5")
        })

        it("Correct creator address", async function () {
            biaTokenInfo = await galleryContract.getTokenInfo(0)
            fftTokenInfo = await galleryContract.getTokenInfo(1)
            assert.equal(biaTokenInfo[5], galleryContract.address)
            assert.equal(fftTokenInfo[5], galleryContract.address)
        })
    })

    describe("Public getter functions", function () {
        it("Get Gallery Contract's address", async function () {
            assert.equal(
                await galleryContract.getGalleryContractAddress(),
                galleryContract.address
            )
        })
        it("Get Collection Owner's address", async function () {
            assert.equal(
                await galleryContract.getCollectionOwner("0"),
                galleryContract.address
            )
        })

        it("Get unapproved collections amount", async function () {
            assert.equal(
                await galleryContract
                    .connect(galleryContract.address)
                    .getAmountOfUnapprovedCollections(),
                "0"
            )
        })
    })

    describe("Create Simple Collectable", function () {
        it("Create simple: 30(1%) + 6(5%) + 4(10%) = 1(100%) collection & correctly assigning ownership", async function () {
            _quantity = [30, 6, 4, 0, 0, 0, 0, 0, 0, 0]
            _percentage = [10, 50, 100, 0, 0, 0, 0, 0, 0, 0]

            await projectInfo.galleryContract
                .connect(creator)
                .createSimpleCollectable(_quantity, _percentage, hexArray)
            creatorAddress = creator.address
            assert.equal(
                await assetKidNftContract.balanceOf(
                    creatorAddress,
                    "0xa85ac9d365ca47ee0c7570f8979a4f78b4e3b16c9422db94864a6c25637c662e"
                ),
                30
            )
            assert.equal(
                await assetKidNftContract.balanceOf(
                    creatorAddress,
                    "0x6c4d63bf70041bfeffe7c250447170c53a081569e4ad44c3034c5f5023b35678"
                ),
                6
            )
            assert.equal(
                await assetKidNftContract.balanceOf(
                    creatorAddress,
                    "0x1d40787e76ef7570c8fc88a03ad293aa4d9949a5744c3cf16b24e68034cbc519"
                ),
                4
            )
        })

        it("Create half-percent collection: 30(1.5%)+7(5%)+1(20%) = 1(100%) collection", async function () {
            _quantity = [30, 7, 1, 0, 0, 0, 0, 0, 0, 0]
            _percentage = [15, 50, 200, 0, 0, 0, 0, 0, 0, 0]

            await projectInfo.galleryContract
                .connect(creator)
                .createSimpleCollectable(_quantity, _percentage, hexArray)
            creatorAddress = creator.address
            assert.equal(
                await assetKidNftContract.balanceOf(
                    creatorAddress,
                    "0xa85ac9d365ca47ee0c7570f8979a4f78b4e3b16c9422db94864a6c25637c662e"
                ),
                30
            )
            assert.equal(
                await assetKidNftContract.balanceOf(
                    creatorAddress,
                    "0x6c4d63bf70041bfeffe7c250447170c53a081569e4ad44c3034c5f5023b35678"
                ),
                7
            )
            assert.equal(
                await assetKidNftContract.balanceOf(
                    creatorAddress,
                    "0x1d40787e76ef7570c8fc88a03ad293aa4d9949a5744c3cf16b24e68034cbc519"
                ),
                1
            )
        })

        it("Cannot create collection >100%: 30(1%)+7(5%)+4(10%) = 1(105%) collection", async function () {
            _quantity = [30, 7, 4, 0, 0, 0, 0, 0, 0, 0]
            _percentage = [10, 50, 100, 0, 0, 0, 0, 0, 0, 0]

            await expect(
                projectInfo.galleryContract
                    .connect(creator)
                    .createSimpleCollectable(_quantity, _percentage, hexArray)
            ).to.be.reverted
        })

        it("Cannot create half quantity: 1(0.5%)+29.5(1%)+6(5%)+4(10%) = 1(100%) collection", async function () {
            _quantity = [1, 29.5, 6, 4, 0, 0, 0, 0, 0, 0]
            _percentage = [5, 10, 50, 100, 0, 0, 0, 0, 0, 0]

            await expect(
                projectInfo.galleryContract
                    .connect(creator)
                    .createSimpleCollectable(_quantity, _percentage, hexArray)
            ).to.be.reverted
        })
    })

    describe("Collectable creation events", function () {
        it("Simple Collectable Event", async function () {
            _quantity = [30, 6, 4, 0, 0, 0, 0, 0, 0, 0]
            _percentage = [10, 50, 100, 0, 0, 0, 0, 0, 0, 0]

            await expect(
                projectInfo.galleryContract
                    .connect(creator)
                    .createSimpleCollectable(_quantity, _percentage, hexArray)
            )
                .to.emit(
                    projectInfo.galleryContract,
                    "simpleCollectableCreated"
                )
                .withArgs(2, [2, 3, 4, 0, 0, 0, 0, 0, 0, 0], creator.address)
        })

        it("Tier Collectable Event", async function () {
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await expect(
                projectInfo.galleryContract
                    .connect(creator)
                    .createTierCollectable(_baseTier, _subsequentTier, hexArray)
            )
                .to.emit(projectInfo.galleryContract, "tierCollectableCreated")
                .withArgs(2, [2, 3, 4, 5, 0, 0, 0, 0, 0, 0], creator.address)
        })

        it("Tier Exchange Event", async function () {
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await projectInfo.galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier, hexArray)

            await projectInfo.galleryContract
                .connect(galleryAdmin)
                .approveCollectionId(2)

            await assetKidNftContract
                .connect(creator)
                .setApprovalForAll(projectInfo.galleryContract.address, true)

            await expect(
                projectInfo.galleryContract.connect(creator).exchangeTierToken(
                    2, // CollectionId
                    2, // TokenId submit (1%)
                    25, // amount
                    4 // TokenId exchange (25%)
                )
            )
                .to.emit(projectInfo.galleryContract, "tierExchange")
                .withArgs(2, 2, 4, creator.address)
        })
    })

    describe("Create Tier Collectable", function () {
        it("Create tier: [1%, 5%, 25%, 50%] collection & correctly assigning ownership to minter and assembler address", async function () {
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await projectInfo.galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier, hexArray)

            tokenInfo = await projectInfo.galleryContract.getTokenInfo(2)
            assemblerAddress = await tokenInfo[3]

            hexId = await projectInfo.galleryContract.getHexId(2)

            creatorAddress = await creator.address

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                1000 / _baseTier
            )

            tokenInfo = await projectInfo.galleryContract.getTokenInfo(3)
            hexId = await projectInfo.galleryContract.getHexId(3)

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                0
            )

            assert.equal(
                await assetKidNftContract.balanceOf(assemblerAddress, hexId),
                1000 / _subsequentTier[0]
            )

            tokenInfo = await projectInfo.galleryContract.getTokenInfo(4)
            hexId = await projectInfo.galleryContract.getHexId(4)

            assert.equal(
                await assetKidNftContract.balanceOf(assemblerAddress, hexId),
                1000 / _subsequentTier[1]
            )

            tokenInfo = await galleryContract.getTokenInfo(5)
            hexId = await galleryContract.getHexId(5)

            assert.equal(
                await assetKidNftContract.balanceOf(assemblerAddress, hexId),
                1000 / _subsequentTier[2]
            )
        })

        it("Cannot create tier: [1%, 10%, 25%, 50%] collection -> 2.5x10% = 25%", async function () {
            _baseTier = 10
            _subsequentTier = [100, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await expect(
                galleryContract
                    .connect(creator)
                    .createTierCollectable(_baseTier, _subsequentTier)
            ).to.be.reverted
        })

        it("Cannot create tier: [1%, 10%, 60%] collection ->  60% x 1.67 =100%", async function () {
            _baseTier = 10
            _subsequentTier = [100, 600, 0, 0, 0, 0, 0, 0, 0, 0]

            await expect(
                galleryContract
                    .connect(creator)
                    .createTierCollectable(_baseTier, _subsequentTier)
            ).to.be.reverted
        })
    })

    describe("Tier exchange", function () {
        it("Attempting exchange without approval", async function () {
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await expect(
                galleryContract
                    .connect(creator)
                    .exchangeTierToken(_baseTier, _subsequentTier, hexArray)
            ).to.be.reverted
        })

        it("Exchanging up 25(1%) -> 1(25%)", async function () {
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await assetKidNftContract
                .connect(creator)
                .setApprovalForAll(galleryContract.address, true)

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier, hexArray)

            await galleryContract.connect(galleryAdmin).approveCollectionId(2)

            tokenInfo = await galleryContract.getTokenInfo(2)
            assemblerAddress = await tokenInfo[3]

            creatorAddress = await creator.address
            creatorToken2InitAmount = 1000 / _baseTier

            hexId = await galleryContract.getHexId(2)

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                creatorToken2InitAmount
            )

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                2, // TokenId submit (1%)
                25, // amount
                4 // TokenId exchange (25%)
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                creatorToken2InitAmount - 25
            )

            hexId = await galleryContract.getHexId(4)
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                1
            )
        })

        it("Exchanging up 50(1%) -> 1(50%)", async function () {
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await assetKidNftContract
                .connect(creator)
                .setApprovalForAll(galleryContract.address, true)

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier, hexArray)

            await galleryContract.connect(galleryAdmin).approveCollectionId(2)

            tokenInfo = await galleryContract.getTokenInfo(2)
            assemblerAddress = await tokenInfo[3]
            creatorAddress = await creator.address
            creatorToken2InitAmount = 1000 / _baseTier

            hexId = await galleryContract.getHexId(2)
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                creatorToken2InitAmount
            )

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                2, // TokenId submit (1%)
                50, // amount
                5 // TokenId exchange (50%)
            )

            hexId = await galleryContract.getHexId(2)
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                creatorToken2InitAmount - 50
            )

            hexId = await galleryContract.getHexId(5)
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                1
            )
        })

        it("Exchanging up 100(1%) -> 2(50%)", async function () {
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await assetKidNftContract
                .connect(creator)
                .setApprovalForAll(galleryContract.address, true)

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier, hexArray)

            await galleryContract.connect(galleryAdmin).approveCollectionId(2)

            tokenInfo = await galleryContract.getTokenInfo(2)
            assemblerAddress = await tokenInfo[3]
            creatorAddress = await creator.address
            creatorToken2InitAmount = 1000 / _baseTier

            hexId = await galleryContract.getHexId(2)

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                creatorToken2InitAmount
            )

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                2, // TokenId submit (1%)
                100, // amount
                5 // TokenId exchange (50%)
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                creatorToken2InitAmount - 100
            )

            hexId = await galleryContract.getHexId(5)

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                2
            )
        })

        it("Exchanging up 100(1%) -> 1(100%)", async function () {
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

            await assetKidNftContract
                .connect(creator)
                .setApprovalForAll(galleryContract.address, true)

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier, hexArray)

            await galleryContract.connect(galleryAdmin).approveCollectionId(2)

            tokenInfo = await galleryContract.getTokenInfo(2)
            assemblerAddress = await tokenInfo[3]
            creatorAddress = await creator.address
            creatorToken2InitAmount = 1000 / _baseTier
            hexId = await galleryContract.getHexId(2)
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                creatorToken2InitAmount
            )

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                2, // TokenId submit (1%)
                100, // amount
                6 // TokenId exchange (50%)
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                creatorToken2InitAmount - 100
            )

            hexId = await galleryContract.getHexId(6)

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                1
            )
        })

        it("Exchanging down 1(50%) -> 50(1%)", async function () {
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await assetKidNftContract
                .connect(creator)
                .setApprovalForAll(galleryContract.address, true)

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier, hexArray)

            await galleryContract.connect(galleryAdmin).approveCollectionId(2)

            tokenInfo = await galleryContract.getTokenInfo(2)
            assemblerAddress = await tokenInfo[3]
            creatorAddress = await creator.address
            creatorToken2InitAmount = 1000 / _baseTier

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                2, // TokenId submit (1%)
                100, // amount
                5 // TokenId exchange (50%)
            )

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                5, // TokenId submit (1%)
                1, // amount
                2 // TokenId exchange (50%)
            )

            hexId = await galleryContract.getHexId(2)

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                creatorToken2InitAmount - 100 + 50
            )
            hexId = await galleryContract.getHexId(5)
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                0 + 2 - 1
            )
        })

        it("Exchanging down 1(100%) -> 100(1%)", async function () {
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

            await assetKidNftContract
                .connect(creator)
                .setApprovalForAll(galleryContract.address, true)

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier, hexArray)

            await galleryContract.connect(galleryAdmin).approveCollectionId(2)

            tokenInfo = await galleryContract.getTokenInfo(2)
            assemblerAddress = await tokenInfo[3]
            creatorAddress = await creator.address
            creatorToken2InitAmount = 1000 / _baseTier

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                2, // TokenId submit (1%)
                100, // amount
                6 // TokenId exchange (100%)
            )

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                6, // TokenId submit (100%)
                1, // amount
                2 // TokenId exchange (1%)
            )
            hexId = await galleryContract.getHexId(2)
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                creatorToken2InitAmount - 100 + 100
            )
            hexId = await galleryContract.getHexId(6)
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                0 + 1 - 1
            )
        })

        it("Exchanging down 1(100%) -> 4(25%)", async function () {
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

            await assetKidNftContract
                .connect(creator)
                .setApprovalForAll(galleryContract.address, true)

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier, hexArray)

            await galleryContract.connect(galleryAdmin).approveCollectionId(2)

            tokenInfo = await galleryContract.getTokenInfo(2)
            assemblerAddress = await tokenInfo[3]
            creatorAddress = await creator.address
            creatorToken2InitAmount = 1000 / _baseTier

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                2, // TokenId submit (1%)
                100, // amount
                6 // TokenId exchange (100%)
            )
            hexId = await galleryContract.getHexId(6)
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                "1"
            )

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                6, // TokenId submit (100%)
                1, // amount
                4 // TokenId exchange (25%)
            )
            hexId = await galleryContract.getHexId(2)
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                creatorToken2InitAmount - 100
            )
            hexId = await galleryContract.getHexId(4)
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, hexId),
                0 + 4
            )
        })
    })
})

describe("Test Escrow Feature Behind Proxies", function () {
    let projectInfo,
        galleryContract,
        assetKidNftContract,
        biaWalletContract,
        creator,
        collector1,
        escrowContract

    beforeEach(async () => {
        projectInfo = await deployProject()
        galleryContract = projectInfo.galleryContract
        assetKidNftContract = projectInfo.assetKidNftContract
        biaWalletContract = projectInfo.biaWalletContract
        creator = projectInfo.creator
        collector1 = projectInfo.collector1
        galleryAdmin = projectInfo.galleryAdmin
        owner = projectInfo.owner

        // create and approve tier tokens
        _baseTier = 10
        _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

        await assetKidNftContract
            .connect(creator)
            .setApprovalForAll(galleryContract.address, true)

        // Creator Funded Right Here.

        await biaWalletContract
            .connect(creator)
            .fundAddress(creator.address, 100)

        await galleryContract
            .connect(creator)
            .createTierCollectable(_baseTier, _subsequentTier, hexArray)

        testCollectionInfo = await galleryContract.getTokenInfo(2)

        // Get escrow contract.
        escrowAddress = testCollectionInfo[2]
        escrowContract = await ethers.getContractAt(
            "EscrowContract",
            escrowAddress
        )

        // approving collection Id

        await galleryContract.connect(galleryAdmin).approveCollectionId(2)
    })

    describe("Book keeping features", function () {
        it("Bid submission without gallery approval FAILS", async function () {
            let tokenId, bid_amount, bid_price

            tokenId = 2
            bid_amount = 10
            bid_price = 5

            await expect(
                galleryContract
                    .connect(collector1)
                    .submitOffer(tokenId, bid_amount, bid_price, true)
            ).to.be.reverted
        })
        it("Offer submission without gallery approval FAILS", async function () {
            let tokenId, bid_amount, bid_price

            tokenId = 2
            ask_amount = 10
            ask_price = 5

            await expect(
                galleryContract
                    .connect(collector1)
                    .submitOffer(tokenId, ask_amount, ask_price, false)
            ).to.be.reverted
        })

        it("Bid submission with BIA bal. too low: FAILS", async function () {
            let tokenId, bid_amount, bid_price

            tokenId = 2
            bid_amount = 10
            bid_price = 5

            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)

            await expect(
                galleryContract
                    .connect(collector1)
                    .submitOffer(tokenId, bid_amount, bid_price, true)
            ).to.be.reverted
        })

        it("Offer submission with SFT bal. too low: FAILS", async function () {
            let tokenId, bid_amount, bid_price

            tokenId = 2
            ask_amount = 10
            ask_price = 5

            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)

            await expect(
                galleryContract
                    .connect(collector1)
                    .submitOffer(tokenId, ask_amount, ask_price, false)
            ).to.be.reverted
        })

        it("Bid submission approve with enough BIA and approval", async function () {
            let tokenId, bid_amount, bid_price
            tokenId = 2
            bid_amount = 10
            bid_price = 5

            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)

            await biaWalletContract
                .connect(collector1)
                .fundAddress(collector1.address, 1000)

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            let bidInfo = await escrowContract.getArrayInfo(0, true)
            assert.equal(bidInfo.adr, collector1.address)
        })

        it("Offer submission approve with enough SFT and approval", async function () {
            let tokenId, bid_amount, bid_price
            tokenId = 2
            ask_amount = 10
            ask_price = 5

            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)

            await biaWalletContract
                .connect(collector1)
                .fundAddress(collector1.address, 1000)

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, ask_amount, ask_price, false)

            let askInfo = await escrowContract.getArrayInfo(0, false)
            assert.equal(askInfo.adr, creator.address)
        })

        it("Escrow contract accurately records bid-offer information", async function () {
            let tokenId, bid_amount, bid_price
            tokenId = 2
            bid_amount = 10
            bid_price = 5

            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)

            await biaWalletContract
                .connect(collector1)
                .fundAddress(collector1.address, 1000)

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            let bidInfo = await escrowContract.getArrayInfo(0, true)
            assert.equal(bidInfo.adr, collector1.address)
            assert.equal(bidInfo.price, bid_price)
            assert.equal(bidInfo.amount, bid_amount)
            assert.equal(bidInfo.active, true)
        })

        it("Escrow contract accurately records ask-offer information", async function () {
            let tokenId, bid_amount, bid_price
            tokenId = 2
            bid_amount = 10
            bid_price = 5

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, bid_amount, bid_price, false)

            let askInfo = await escrowContract.getArrayInfo(0, false)
            assert.equal(askInfo.adr, creator.address)
            assert.equal(askInfo.price, ask_price)
            assert.equal(askInfo.amount, ask_amount)
            assert.equal(askInfo.active, true)
        })
    })

    describe("Exchange features", function () {
        it("Multiple bid submission FAILS", async function () {
            let tokenId, bid_amount, bid_price
            tokenId = 2
            bid_amount = 10
            bid_price = 5

            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)

            await biaWalletContract
                .connect(collector1)
                .fundAddress(collector1.address, 10000)

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            await expect(
                galleryContract
                    .connect(collector1)
                    .submitOffer(tokenId, bid_amount, bid_price, true)
            ).to.be.reverted
        })

        it("Multiple offer submission FAILS", async function () {
            let tokenId, bid_amount, bid_price
            tokenId = 2
            ask_amount = 10
            ask_price = 5

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, ask_amount, ask_price, false)

            await expect(
                galleryContract
                    .connect(creator)
                    .submitOffer(tokenId, ask_amount, ask_price, false)
            ).to.be.reverted
        })

        it("Offer taking bid: bidAmt = offerAmt, bidPrice = offerPrice: Bidders get their SFT", async function () {
            let tokenId, bid_amount, bid_price, offer_amount, offer_price

            tokenId = 2
            bid_amount = 10
            bid_price = 5

            //fund the collector
            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)

            await biaWalletContract
                .connect(collector1)
                .fundAddress(collector1.address, 10000)

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            offer_amount = 10
            offer_price = 5

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)

            hexId = await galleryContract.getHexId(0)

            assert.equal(
                await assetKidNftContract.balanceOf(collector1.address, hexId),
                10000 - bid_amount * bid_price - 1
            )

            hexId = await galleryContract.getHexId(2)
            assert.equal(
                await assetKidNftContract.balanceOf(collector1.address, hexId),
                bid_amount
            )
        })

        it("Offer taking bid: bidAmt = offerAmt, bidPrice = offerPrice: Offerers get their BIA", async function () {
            let tokenId, bid_amount, bid_price, offer_amount, offer_price

            tokenId = 2
            bid_amount = 10
            bid_price = 5

            //fund the collector
            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)

            await biaWalletContract
                .connect(collector1)
                .fundAddress(collector1.address, 10000)

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            offer_amount = 10
            offer_price = 5

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)
            hexId = await galleryContract.getHexId(0)
            assert.equal(
                await assetKidNftContract.balanceOf(creator.address, hexId),
                100 + bid_amount * bid_price - 1
            )
            hexId = await galleryContract.getHexId(2)
            assert.equal(
                await assetKidNftContract.balanceOf(creator.address, hexId),
                100 - 10
            )
        })

        it("Bid taking offer: bidAmt = offerAmt, bidPrice = offerPrice: Bidders get their SFT", async function () {
            let tokenId, bid_amount, bid_price, offer_amount, offer_price

            tokenId = 2
            bid_amount = 10
            bid_price = 5

            offer_amount = 10
            offer_price = 5

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)

            //fund the collector
            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)

            await biaWalletContract
                .connect(collector1)
                .fundAddress(collector1.address, 10000)

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)
            hexId = await galleryContract.getHexId(0)

            assert.equal(
                await assetKidNftContract.balanceOf(collector1.address, hexId),
                10000 - bid_amount * bid_price - 1
            )
            hexId = await galleryContract.getHexId(2)

            assert.equal(
                await assetKidNftContract.balanceOf(collector1.address, hexId),
                bid_amount
            )
        })

        it("Bid taking offer: bidAmt = offerAmt, bidPrice = offerPrice: Offerers get their BIA", async function () {
            let tokenId, bid_amount, bid_price, offer_amount, offer_price

            tokenId = 2
            bid_amount = 10
            bid_price = 5

            offer_amount = 10
            offer_price = 5

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)

            //fund the collector
            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)

            await biaWalletContract
                .connect(collector1)
                .fundAddress(collector1.address, 10000)

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            hexId = await galleryContract.getHexId(0)
            assert.equal(
                await assetKidNftContract.balanceOf(creator.address, hexId),
                100 + bid_amount * bid_price - 1
            )
            hexId = await galleryContract.getHexId(2)
            assert.equal(
                await assetKidNftContract.balanceOf(creator.address, hexId),
                100 - 10
            )
        })

        it("Offer taking bid: bidAmt > offerAmt: bidPrice = offerPrice: escrow holds onto the bid difference", async function () {
            tokenId = 2
            bid_amount = 20
            bid_price = 5

            //fund the collector
            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)

            await biaWalletContract
                .connect(collector1)
                .fundAddress(collector1.address, 10000)

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            offer_amount = 10
            offer_price = 5

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)

            //bid difference = 5BIA/SFT * (20-10)SFT = 50 BIA
            hexId = await galleryContract.getHexId(0)
            assert.equal(
                await assetKidNftContract.balanceOf(
                    escrowContract.address,
                    hexId
                ),
                50
            )
            hexId = await galleryContract.getHexId(2)
            assert.equal(
                await assetKidNftContract.balanceOf(collector1.address, hexId),
                offer_amount
            )
        })

        it("Bid taking offer: bidAmt > offerAmt: bidPrice = offerPrice: escrow holds onto the bid difference", async function () {
            offer_amount = 10 // SFT
            offer_price = 5 // BIA/SFT
            tokenId = 2

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)

            //fund the collector
            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)
            await biaWalletContract
                .connect(collector1)
                .fundAddress(collector1.address, 10000)
            bid_amount = 20 // SFT
            bid_price = 5 // BIA/SFT

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            //bid difference = 5BIA/SFT * (20-10)SFT = 50 BIA
            hexId = await galleryContract.getHexId(0)

            assert.equal(
                await assetKidNftContract.balanceOf(
                    escrowContract.address,
                    hexId
                ),
                50
            )
            hexId = await galleryContract.getHexId(2)
            assert.equal(
                await assetKidNftContract.balanceOf(collector1.address, hexId),
                offer_amount
            )
        })

        it("Bid taking offer: bidAmt < offerAmt: bidPrice = offerPrice: escrow holds onto the offer difference", async function () {
            offer_amount = 20
            offer_price = 5
            tokenId = 2

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)

            bid_amount = 10
            bid_price = 5

            //fund the collector
            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)
            await biaWalletContract
                .connect(collector1)
                .fundAddress(collector1.address, 10000)

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            //bid difference = 5BIA/SFT * (20-10)SFT = 50 BIA
            hexId = await galleryContract.getHexId(0)
            assert.equal(
                await assetKidNftContract.balanceOf(
                    escrowContract.address,
                    hexId
                ),
                0
            )
            hexId = await galleryContract.getHexId(2)
            assert.equal(
                await assetKidNftContract.balanceOf(
                    escrowContract.address,
                    hexId
                ),
                10
            )
        })

        it("Bid taking offer: bidAmt < offerAmt: bidPrice > offerPrice: Escrow holds onto the offer difference AND gallery paid difference", async function () {
            offer_amount = 20
            offer_price = 5
            tokenId = 2

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)

            bid_amount = 10
            bid_price = 10

            //fund the collector
            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)
            await biaWalletContract
                .connect(collector1)
                .fundAddress(collector1.address, 10000)

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            //bid difference = 5BIA/SFT * (20-10)SFT = 50 BIA
            hexId = await galleryContract.getHexId(0)
            assert.equal(
                await assetKidNftContract.balanceOf(
                    biaWalletContract.address,
                    hexId
                ),
                10 ** 9 - 10000 - 100 + (20 - 10) * 5 + 2
            )
            hexId = await galleryContract.getHexId(2)
            assert.equal(
                await assetKidNftContract.balanceOf(
                    escrowContract.address,
                    hexId
                ),
                10
            )
        })

        it("Bid taking offer: bidAmt < offerAmt: bidPrice > offerPrice: Escrow accurately records offer info", async function () {
            offer_amount = 20
            offer_price = 5
            tokenId = 2

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)

            bid_amount = 10
            bid_price = 10

            //fund the collector
            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)
            await biaWalletContract
                .connect(collector1)
                .fundAddress(collector1.address, 10000)

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            //bid difference = 5BIA/SFT * (20-10)SFT = 50 BIA

            offerInfo = await escrowContract.getArrayInfo(0, false)

            assert.equal(offerInfo[0], creator.address)
            assert.equal(offerInfo[1], offer_price)
            assert.equal(offerInfo[2], offer_amount - bid_amount)
            assert.equal(offerInfo[3], true)
        })

        it("Offer taking bid: bidAmt > offerAmt: bidPrice > offerPrice: Escrow accurately records bid info", async function () {
            tokenId = 2
            bid_amount = 20
            bid_price = 5

            //fund the collector
            await assetKidNftContract
                .connect(collector1)
                .setApprovalForAll(galleryContract.address, true)
            await biaWalletContract
                .connect(collector1)
                .fundAddress(collector1.address, 10000)

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            offer_amount = 10
            offer_price = 4

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)

            //bid difference = 5BIA/SFT * (20-10)SFT = 50 BIA

            bidInfo = await escrowContract.getArrayInfo(0, true)

            assert.equal(bidInfo[0], collector1.address)
            assert.equal(bidInfo[1], bid_price)
            assert.equal(bidInfo[2], bid_amount - offer_amount)
            assert.equal(bidInfo[3], true)
        })
    })
})

describe("Bid Array Overflow", function () {
    let galleryContract,
        assetKidNftContract,
        escrowContract,
        owner,
        collector1,
        creator,
        lastCollector,
        galleryAdmin,
        biaWalletContract

    beforeEach(async () => {
        projectInfo = await deployProject()
        galleryContract = projectInfo.galleryContract
        assetKidNftContract = projectInfo.assetKidNftContract
        biaWalletContract = projectInfo.biaWalletContract
        creator = projectInfo.creator
        collector1 = projectInfo.collector1
        galleryAdmin = projectInfo.galleryAdmin
        owner = projectInfo.owner
        lastCollector = projectInfo.lastCollector

        // Deploy tier token
        _baseTier = 10
        _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

        await assetKidNftContract
            .connect(creator)
            .setApprovalForAll(galleryContract.address, true)

        await galleryContract
            .connect(creator)
            .createTierCollectable(_baseTier, _subsequentTier, hexArray)

        testCollectionInfo = await galleryContract.getTokenInfo(2)

        // Get escrow contract.
        escrowAddress = testCollectionInfo[2]
        escrowContract = await ethers.getContractAt(
            "EscrowContract",
            escrowAddress
        )

        // Approve collection
        await galleryContract.connect(galleryAdmin).approveCollectionId(2)

        // Saturating bid loop.
        for (let i = 0; i < 50; i++) {
            if (i == 49) {
                await biaWalletContract
                    .connect(lastCollector)
                    .fundAddress(lastCollector.address, 1000)
                // Wallet submit Bid

                await assetKidNftContract
                    .connect(lastCollector)
                    .setApprovalForAll(galleryContract.address, true)

                // Saturate bid and offer array
                await galleryContract
                    .connect(lastCollector)
                    .submitOffer(2, 10, 60 - i, true)
                break
            }

            // Create wallet
            account = await ethers.Wallet.createRandom().connect(
                ethers.provider
            )

            // Send some eth so they can interact with the system
            await owner.sendTransaction({
                to: account.address,
                value: ethers.utils.parseEther("10"),
            })

            // Fund wallet by the owner
            await biaWalletContract
                .connect(account)
                .fundAddress(account.address, 1000)

            // set approval
            await assetKidNftContract
                .connect(account)
                .setApprovalForAll(galleryContract.address, true)

            // Saturate bid and offer array
            await galleryContract
                .connect(account)
                .submitOffer(2, 10, 60 - i, true)
        }
        await biaWalletContract
            .connect(collector1)
            .fundAddress(collector1.address, 100)

        await assetKidNftContract
            .connect(collector1)
            .setApprovalForAll(galleryContract.address, true)
    })

    it("Submitting Higher Bid PASSES and refunded", async function () {
        collector1Price = 12
        collctor1Amount = 1

        await galleryContract
            .connect(collector1)
            .submitOffer(2, collctor1Amount, collector1Price, true)
        bidArray49 = await escrowContract.getArrayInfo(49, true)

        // escrow recorded accurately
        assert.equal(bidArray49[0], collector1.address)
        assert.equal(bidArray49[1], collector1Price)
        assert.equal(bidArray49[2], collctor1Amount)
        // NFT is refunded to last collector
        hexId = await galleryContract.getHexId(0)
        assert.equal(
            await assetKidNftContract.balanceOf(lastCollector.address, hexId),
            1000 - 1
        )
    })

    it("Submitting Lower Bid Fails", async function () {
        collector1Price = 11 // lowest price was 11
        collctor1Amount = 1

        await expect(
            galleryContract
                .connect(collector1)
                .submitOffer(2, collctor1Amount, collector1Price, true)
        ).to.be.reverted
    })
})

describe("Ask Array Overflow", function () {
    let galleryContract,
        assetKidNftContract,
        escrowContract,
        owner,
        collector1,
        creator,
        lastCollector,
        galleryAdmin,
        biaWalletContract

    beforeEach(async () => {
        projectInfo = await deployProject()
        galleryContract = projectInfo.galleryContract
        assetKidNftContract = projectInfo.assetKidNftContract
        biaWalletContract = projectInfo.biaWalletContract
        creator = projectInfo.creator
        collector1 = projectInfo.collector1
        galleryAdmin = projectInfo.galleryAdmin
        owner = projectInfo.owner
        lastCollector = projectInfo.lastCollector

        // Deploy tier token
        _baseTier = 10
        _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

        await assetKidNftContract
            .connect(creator)
            .setApprovalForAll(galleryContract.address, true)

        await galleryContract
            .connect(creator)
            .createTierCollectable(_baseTier, _subsequentTier, hexArray)

        testCollectionInfo = await galleryContract.getTokenInfo(2)

        // Get escrow contract.
        escrowAddress = testCollectionInfo[2]
        escrowContract = await ethers.getContractAt(
            "EscrowContract",
            escrowAddress
        )

        // Approve collection
        await galleryContract.connect(galleryAdmin).approveCollectionId(2)

        // Saturating ask loop.
        for (let i = 0; i < 50; i++) {
            const token2 =
                "0xa85ac9d365ca47ee0c7570f8979a4f78b4e3b16c9422db94864a6c25637c662e"
            if (i == 49) {
                await assetKidNftContract
                    .connect(creator)
                    .safeTransferFrom(
                        creator.address,
                        lastCollector.address,
                        token2,
                        1,
                        "0x"
                    )
                // Wallet submit Bid

                await assetKidNftContract
                    .connect(lastCollector)
                    .setApprovalForAll(galleryContract.address, true)
                // fund wallet
                await biaWalletContract
                    .connect(lastCollector)
                    .fundAddress(lastCollector.address, 1)

                // Saturate ask and offer array
                await galleryContract
                    .connect(lastCollector)
                    .submitOffer(2, 1, 60 + i, false)
                break
            }

            // Create wallet
            account = await ethers.Wallet.createRandom().connect(
                ethers.provider
            )
            // Fund wallet by the owner
            await assetKidNftContract
                .connect(creator)
                .safeTransferFrom(
                    creator.address,
                    account.address,
                    token2,
                    1,
                    "0x"
                )

            // Send some eth so they can interact with the system.
            await owner.sendTransaction({
                to: account.address,
                value: ethers.utils.parseEther("10"),
            })

            // set approval
            await assetKidNftContract
                .connect(account)
                .setApprovalForAll(galleryContract.address, true)

            // Give account 1 BIA to pay for fee
            await biaWalletContract
                .connect(account)
                .fundAddress(account.address, 1)

            // Saturate ask and offer array
            await galleryContract
                .connect(account)
                .submitOffer(2, 1, 60 + i, false)
        }
        await biaWalletContract
            .connect(collector1)
            .fundAddress(collector1.address, 100)

        await assetKidNftContract
            .connect(collector1)
            .setApprovalForAll(galleryContract.address, true)
    })

    it("Submitting Lower Ask Passes", async function () {
        const token2 =
            "0xa85ac9d365ca47ee0c7570f8979a4f78b4e3b16c9422db94864a6c25637c662e"
        await assetKidNftContract
            .connect(creator)
            .safeTransferFrom(
                creator.address,
                collector1.address,
                token2,
                1,
                "0x"
            )

        collector1Price = 10
        collctor1Amount = 1
        // fund collector 1

        await galleryContract
            .connect(collector1)
            .submitOffer(2, collctor1Amount, collector1Price, false)
        bidArray49 = await escrowContract.getArrayInfo(49, false)

        // escrow recorded accurately
        assert.equal(bidArray49[0], collector1.address)
        assert.equal(bidArray49[1], collector1Price)
        assert.equal(bidArray49[2], collctor1Amount)
        // SFT is refunded to last collector

        hexId = await galleryContract.getHexId(2)

        assert.equal(
            await assetKidNftContract.balanceOf(lastCollector.address, hexId),
            1
        )
    })

    it("Submitting Higher Ask Fails", async function () {
        const token2 =
            "0xa85ac9d365ca47ee0c7570f8979a4f78b4e3b16c9422db94864a6c25637c662e"
        await assetKidNftContract
            .connect(creator)
            .safeTransferFrom(
                creator.address,
                collector1.address,
                token2,
                1,
                "0x"
            )

        collector1Price = 110 // highest price was 60+49 = 109
        collctor1Amount = 1

        await expect(
            galleryContract
                .connect(collector1)
                .submitOffer(2, collctor1Amount, collector1Price, false)
        ).to.be.reverted
    })
})

describe("Support Functions", function () {
    let galleryContract,
        assetKidNftContract,
        escrowContract,
        owner,
        collector1,
        creator,
        lastCollector,
        galleryAdmin,
        biaWalletContract

    beforeEach(async () => {
        projectInfo = await deployProject()
        galleryContract = projectInfo.galleryContract
        assetKidNftContract = projectInfo.assetKidNftContract
        biaWalletContract = projectInfo.biaWalletContract
        creator = projectInfo.creator
        collector1 = projectInfo.collector1
        galleryAdmin = projectInfo.galleryAdmin
        owner = projectInfo.owner
        lastCollector = projectInfo.lastCollector

        await biaWalletContract
            .connect(collector1)
            .fundAddress(collector1.address, 1000)

        await assetKidNftContract
            .connect(collector1)
            .setApprovalForAll(galleryContract.address, true)

        // Deploy tier token
        _baseTier = 10
        _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

        await assetKidNftContract
            .connect(creator)
            .setApprovalForAll(galleryContract.address, true)

        await galleryContract
            .connect(creator)
            .createTierCollectable(_baseTier, _subsequentTier, hexArray)

        testCollectionInfo = await galleryContract.getTokenInfo(2)

        // Get escrow contract.
        escrowAddress = testCollectionInfo[2]
        escrowContract = await ethers.getContractAt(
            "EscrowContract",
            escrowAddress
        )
    })

    it("Creator create support: escrow receives & record", async function () {
        initAmt = 50
        initPrice = 100

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, initAmt, initPrice, false)

        // NFT is transferred to escrow
        hexId = await galleryContract.getHexId(2)
        tokenBal = await assetKidNftContract
            .connect(creator)
            .balanceOf(creator.address, hexId)
        assert.equal(tokenBal, 100 - initAmt)

        escrowTokenBal = await assetKidNftContract
            .connect(creator)
            .balanceOf(escrowContract.address, hexId)
        assert.equal(escrowTokenBal, initAmt)
    })

    it("Creator create support: escrow state updates", async function () {
        initAmt = 50
        initPrice = 100

        contractStatus = await escrowContract
            .connect(creator)
            .getContractStatus()

        // collectionState 0 = UNVERIFIED
        // COMMERCIALIZATION = true

        assert.equal(contractStatus[0], 0)
        assert.equal(contractStatus[1], true)

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, initAmt, initPrice, false)

        contractStatus = await escrowContract
            .connect(creator)
            .getContractStatus()

        assert.equal(contractStatus[0], 1)
        assert.equal(contractStatus[1], false)
    })

    it("Collector support project: escrow receive and record", async function () {
        initAmt = 50
        initPrice = 100

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, initAmt, initPrice, false)

        supportAmt = 2

        await galleryContract
            .connect(collector1)
            .supportCollectionId(2, supportAmt)
        supportInfo = await escrowContract
            .connect(collector1)
            .getYourSupportInfo(collector1.address)

        hexId = await galleryContract.getHexId(0)

        tokenBal = await assetKidNftContract
            .connect(collector1)
            .balanceOf(collector1.address, hexId)
        assert.equal(tokenBal, 1000 - initPrice * supportAmt)

        escrowTokenBal = await assetKidNftContract
            .connect(collector1)
            .balanceOf(escrowContract.address, hexId)
        assert.equal(escrowTokenBal, initPrice * supportAmt)

        assert.equal(supportInfo[1], supportAmt)
    })

    it("Gallery Approves: BIA transfers", async function () {
        initAmt = 50
        initPrice = 100

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, initAmt, initPrice, false)

        supportAmt = 2
        await galleryContract
            .connect(collector1)
            .supportCollectionId(2, supportAmt)

        supportInfo = await escrowContract
            .connect(creator)
            .getYourSupportInfo(creator.address)
        //console.log(`Creator Bia Owed ${supportInfo}`)

        hexId = await galleryContract.getHexId(0)

        biaInEscrow = await assetKidNftContract
            .connect(owner)
            .balanceOf(escrowContract.address, hexId)
        //console.log(`bia in escrow ${biaInEscrow}`)

        await galleryContract.connect(galleryAdmin).approveCollectionId(2)
        //
        creatorBia = await assetKidNftContract
            .connect(creator)
            .balanceOf(creator.address, hexId)
        //console.log(`Creator Bia ${creatorBia}`)
        biaInEscrow = await assetKidNftContract
            .connect(owner)
            .balanceOf(escrowContract.address, hexId)

        await galleryContract.connect(creator).claimBIA(2)
        creatorBia = await assetKidNftContract
            .connect(creator)
            .balanceOf(creator.address, hexId)
        // console.log(`bia in escrow after collection approves ${biaInEscrow}`)
        // supportInfo = await escrowContract.connect(creator).getYourSupportInfo(creator.address)
        // escrowStatus = await escrowContract.connect(creator).getContractStatus()
        // console.log(`support info ${supportInfo}`)
        // console.log(`escrow status ${escrowStatus}`)

        // collector doest get until claim.
        assert.equal(creatorBia, supportAmt * initPrice)
    })

    it("Gallery Approves: SFT transfers", async function () {
        initAmt = 50
        initPrice = 100

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, initAmt, initPrice, false)

        supportAmt = 2
        await galleryContract
            .connect(collector1)
            .supportCollectionId(2, supportAmt)

        supportInfo = await escrowContract
            .connect(creator)
            .getYourSupportInfo(creator.address)
        //console.log(`Creator Bia Owed ${supportInfo}`)

        hexId = await galleryContract.getHexId(0)

        biaInEscrow = await assetKidNftContract
            .connect(owner)
            .balanceOf(escrowContract.address, hexId)
        //console.log(`bia in escrow ${biaInEscrow}`)

        await galleryContract.connect(galleryAdmin).approveCollectionId(2)
        //
        hexId = await galleryContract.getHexId(2)
        collectorSFT = await assetKidNftContract
            .connect(creator)
            .balanceOf(collector1.address, hexId)
        //console.log(`Creator Bia ${creatorBia}`)

        //console.log(`bia in escrow after collection approves ${biaInEscrow}`)
        // supportInfo = await escrowContract.connect(creator).getYourSupportInfo(creator.address)
        // escrowStatus = await escrowContract.connect(creator).getContractStatus()
        // console.log(`support info ${supportInfo}`)
        // console.log(`escrow status ${escrowStatus}`)

        // collector doest get until claim.
        assert.equal(collectorSFT, 0)

        //claim
        await galleryContract.connect(collector1).claimSFT(2)

        collectorSFT = await assetKidNftContract
            .connect(creator)
            .balanceOf(collector1.address, hexId)
        assert.equal(collectorSFT, 2)
    })

    it("Collector withdraw support: BIA transfer back to collector", async function () {
        initAmt = 50
        initPrice = 100

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, initAmt, initPrice, false)

        supportAmt = 2
        await galleryContract
            .connect(collector1)
            .supportCollectionId(2, supportAmt)
        await galleryContract.connect(collector1).withdrawSupport(2)

        hexId = await galleryContract.getHexId(0)

        collectorBia = await assetKidNftContract
            .connect(creator)
            .balanceOf(collector1.address, hexId)
        assert.equal(collectorBia, 1000)
    })

    it("Collector withdraw support: BIA recoded accurately", async function () {
        initAmt = 50
        initPrice = 100

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, initAmt, initPrice, false)

        supportAmt = 2
        await galleryContract
            .connect(collector1)
            .supportCollectionId(2, supportAmt)

        supportInfo = await escrowContract
            .connect(collector1)
            .getYourSupportInfo(collector1.address)
        assert.equal(supportInfo[0], 0)
        assert.equal(supportInfo[1], supportAmt)

        await galleryContract.connect(collector1).withdrawSupport(2)

        supportInfo = await escrowContract
            .connect(collector1)
            .getYourSupportInfo(collector1.address)
        assert.equal(supportInfo[0], 0)
        assert.equal(supportInfo[1], 0)
    })

    it("Creator cancel collection: SFT transfer back to creator, BIA available to withdraw", async function () {
        initAmt = 50
        initPrice = 100

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, initAmt, initPrice, false)

        hexId = await galleryContract.getHexId(2)

        creatorSftBal = await assetKidNftContract.balanceOf(
            creator.address,
            hexId
        )
        assert.equal(creatorSftBal, 50)

        supportAmt = 2
        await galleryContract
            .connect(collector1)
            .supportCollectionId(2, supportAmt)

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, 0, 0, true)

        creatorSftBal = await assetKidNftContract
            .connect(owner)
            .balanceOf(creator.address, hexId)
        assert.equal(creatorSftBal, 100)
        // console.log(creatorSftBal)
        hexId = await galleryContract.getHexId(0)

        escrowBiaBal = await assetKidNftContract
            .connect(owner)
            .balanceOf(escrowContract.address, hexId)
        // console.log(escrowBiaBal)
        assert.equal(escrowBiaBal, supportAmt * initPrice)
    })

    it("Creator cancel collection: SFT transfer back to creator, collector1 withdraw, recorded properly", async function () {
        initAmt = 50
        initPrice = 100

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, initAmt, initPrice, false)

        hexId = await galleryContract.getHexId(2)

        creatorSftBal = await assetKidNftContract.balanceOf(
            creator.address,
            hexId
        )
        assert.equal(creatorSftBal, 50)

        supportAmt = 2
        await galleryContract
            .connect(collector1)
            .supportCollectionId(2, supportAmt)

        hexId = await galleryContract.getHexId(0)

        collector1BIA = await assetKidNftContract.balanceOf(
            collector1.address,
            hexId
        )
        // console.log(collector1BIA)

        supportInfo = await escrowContract
            .connect(collector1)
            .getYourSupportInfo(collector1.address)
        assert.equal(supportInfo[1], supportAmt)
        //assert.equal(supportInfo[1], supportAmt)

        //Creator Cancelling.

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, 0, 0, true)

        // Collevtor Claiming SFT

        await galleryContract.connect(collector1).claimSFT(2)
        collector1BIA = await assetKidNftContract.balanceOf(
            collector1.address,
            hexId
        )

        supportInfo = await escrowContract
            .connect(collector1)
            .getYourSupportInfo(collector1.address)
        assert.equal(supportInfo[1], 0)
    })

    it("Creator cancel collection: SFT transfer back to creator, collector1 withdraw, transferred properly", async function () {
        initAmt = 50
        initPrice = 100

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, initAmt, initPrice, false)

        hexId = await galleryContract.getHexId(2)

        creatorSftBal = await assetKidNftContract.balanceOf(
            creator.address,
            hexId
        )
        assert.equal(creatorSftBal, 50)

        hexId = await galleryContract.getHexId(0)

        // Collector 1 BIA = 1000
        collector1BIA = await assetKidNftContract.balanceOf(
            collector1.address,
            hexId
        )
        assert.equal(collector1BIA, 1000)

        supportInfo = await escrowContract
            .connect(collector1)
            .getYourSupportInfo(collector1.address)
        constractStat = await escrowContract
            .connect(collector1)
            .getContractStatus()
        // console.log(`pre support Contract ${constractStat}`)
        // console.log(`pre support ${supportInfo}`)
        // console.log(`pre support BIA ${collector1BIA}`)

        supportAmt = 2
        await galleryContract
            .connect(collector1)
            .supportCollectionId(2, supportAmt)
        collector1BIA = await assetKidNftContract.balanceOf(
            collector1.address,
            hexId
        )
        supportInfo = await escrowContract
            .connect(collector1)
            .getYourSupportInfo(collector1.address)
        constractStat = await escrowContract
            .connect(collector1)
            .getContractStatus()
        // console.log(`post support Contract ${constractStat}`)
        // console.log(`post support ${supportInfo}`)
        // console.log(`post support BIA ${collector1BIA}`)

        // Collector 1 BIA = 1000 - 2*100 = 800
        assert.equal(collector1BIA, 1000 - supportAmt * initPrice)
        //assert.equal(supportInfo[1], supportAmt)

        //Pre-Cancelling
        supportInfo = await escrowContract
            .connect(collector1)
            .getYourSupportInfo(collector1.address)
        collector1BIA = await assetKidNftContract.balanceOf(
            collector1.address,
            hexId
        )
        constractStat = await escrowContract
            .connect(collector1)
            .getContractStatus()
        // console.log(`pre cancelling | Contract ${constractStat}`)
        // console.log(`pre cancelling | Info ${supportInfo}`)
        // console.log(`pre cancelling | BIA ${collector1BIA}`)
        //Creator Cancelling.

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, 0, 0, true)

        supportInfo = await escrowContract
            .connect(collector1)
            .getYourSupportInfo(collector1.address)
        collector1BIA = await assetKidNftContract.balanceOf(
            collector1.address,
            hexId
        )
        constractStat = await escrowContract
            .connect(collector1)
            .getContractStatus()
        // console.log(`post cancelling | Contract ${constractStat}`)
        // console.log(`post cancelling | Info ${supportInfo}`)
        // console.log(`post cancelling | BIA ${collector1BIA}`)

        // Collector Claiming SFT

        await galleryContract.connect(collector1).claimSFT(2)

        supportInfo = await escrowContract
            .connect(collector1)
            .getYourSupportInfo(collector1.address)
        collector1BIA = await assetKidNftContract.balanceOf(
            collector1.address,
            hexId
        )
        constractStat = await escrowContract
            .connect(collector1)
            .getContractStatus()
        // console.log(`post claiming | Contract ${constractStat}`)
        // console.log(`post claiming | Info ${supportInfo}`)
        // console.log(`post claiming | BIA ${collector1BIA}`)

        // Its not back to 1000.
        collector1BIA = await assetKidNftContract.balanceOf(
            collector1.address,
            hexId
        )
        assert.equal(collector1BIA, 1000)
    })
})

describe("Testing Collection Burning", function () {
    let galleryContract,
        assetKidNftContract,
        owner,
        collector1,
        creator1,
        creator2,
        lastCollector,
        galleryAdmin,
        biaWalletContract,
        gallery2Contract

    beforeEach(async () => {
        projectInfo = await deployProject()
        galleryContract = projectInfo.galleryContract
        assetKidNftContract = projectInfo.assetKidNftContract
        biaWalletContract = projectInfo.biaWalletContract
        creator = projectInfo.creator
        collector1 = projectInfo.collector1
        galleryAdmin = projectInfo.galleryAdmin
        owner = projectInfo.owner
        lastCollector = projectInfo.lastCollector
        creator1 = projectInfo.creator1
        creator2 = projectInfo.creator2
        libraries = projectInfo.libraries

        // CREATE SIMPLE COLLECTABLE BY CREATOR 1
        _quantity = [30, 6, 4, 0, 0, 0, 0, 0, 0, 0]
        _percentage = [10, 50, 100, 0, 0, 0, 0, 0, 0, 0]
        await galleryContract
            .connect(creator1)
            .createSimpleCollectable(_quantity, _percentage, hexArray)
        await assetKidNftContract
            .connect(creator1)
            .setApprovalForAll(galleryContract.address, true)

        // CREATE TIER COLLECTABLE BY CREATOR 2

        _baseTier = 10
        _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

        let hexArray2 = [
            "0x60499e86da3fd79d954e2fc75e1400107225cbd65d63521971da7a8bd21773c4",
            "0x67449445f9ebc59fc33411d52c5cd33dcfcfb3ba7a5f09f8ca2fbac255265a36",
            "0xc61c6eb831860a13676322e2dd86da29cfd298804852c8d4b5c652756b98e24b",
            "0xee4e7bf0a16570a84f7a9f3a309b42ae34a91493ff28696fc87e28bd1a64b236",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
        ]

        await galleryContract
            .connect(creator2)
            .createTierCollectable(_baseTier, _subsequentTier, hexArray2)
        await assetKidNftContract
            .connect(creator2)
            .setApprovalForAll(galleryContract.address, true)
        // Deploying GalleryContract2
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

        await assetKidNftContract
            .connect(creator1)
            .setApprovalForAll(gallery2Contract.address, true)

        await assetKidNftContract
            .connect(creator2)
            .setApprovalForAll(gallery2Contract.address, true)
    })

    it("Burning Simple Collectable", async function () {
        // otherTokeIds = await galleryContract.getOtherToken(2)
        // console.log(otherTokeIds)
        await gallery2Contract.connect(creator1).burnCollection(3)

        assert.equal(
            await assetKidNftContract.balanceOf(
                creator1.address,
                "0xa85ac9d365ca47ee0c7570f8979a4f78b4e3b16c9422db94864a6c25637c662e"
            ),
            0
        )
        assert.equal(
            await assetKidNftContract.balanceOf(
                creator1.address,
                "0x6c4d63bf70041bfeffe7c250447170c53a081569e4ad44c3034c5f5023b35678"
            ),
            0
        )
        assert.equal(
            await assetKidNftContract.balanceOf(
                creator1.address,
                "0x1d40787e76ef7570c8fc88a03ad293aa4d9949a5744c3cf16b24e68034cbc519"
            ),
            0
        )
    })

    it("Burning Simple Collectable - Checking tokenInfo", async function () {
        // otherTokeIds = await galleryContract.getOtherToken(2)
        // console.log(otherTokeIds)
        await gallery2Contract.connect(creator1).burnCollection(3)

        await expect(galleryContract.getTokenInfo(3)).to.be.reverted
    })

    it("Burning Tier Collectable", async function () {
        // otherTokeIds = await galleryContract.getOtherToken(2)
        // console.log(otherTokeIds)
        await gallery2Contract.connect(creator2).burnCollection(5)

        assert.equal(
            await assetKidNftContract.balanceOf(
                creator2.address,
                "0x60499e86da3fd79d954e2fc75e1400107225cbd65d63521971da7a8bd21773c4"
            ),
            0
        )
        assert.equal(
            await assetKidNftContract.balanceOf(
                creator2.address,
                "0x67449445f9ebc59fc33411d52c5cd33dcfcfb3ba7a5f09f8ca2fbac255265a36"
            ),
            0
        )
        assert.equal(
            await assetKidNftContract.balanceOf(
                creator2.address,
                "0xc61c6eb831860a13676322e2dd86da29cfd298804852c8d4b5c652756b98e24b"
            ),
            0
        )
    })

    it("Burning Tier Collectable - Checking tokenInfo", async function () {
        // otherTokeIds = await galleryContract.getOtherToken(2)
        // console.log(otherTokeIds)
        await gallery2Contract.connect(creator2).burnCollection(5)

        await expect(galleryContract.getTokenInfo(5)).to.be.reverted
    })
})
