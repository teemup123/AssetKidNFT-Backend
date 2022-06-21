const { assert, expect } = require("chai")
const { Contract } = require("ethers")
const { network, deployments, ethers } = require("hardhat")
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config")
const { deployLib } = require("../../scripts/helpful-scripts")

describe("Testing Gallery Contract Features", function () {
    let galleryContractFactory,
        galleryContract,
        galleryContractAddress,
        assetKidNftAddress,
        assetKidNftContract,
        biaTokenInfo,
        fftTokenInfo

    beforeEach(async () => {
        libraries = await deployLib()
        galleryContractFactory = await ethers.getContractFactory(
            "GalleryContract",
            {
                libraries: {
                    DeployAssemblerContract: String(
                        libraries.assemblerLibContract.address
                    ),
                    DeployAssetKidNFT: String(libraries.assetKidNFTLib.address),
                    DeployEscrowContract: String(libraries.escrowLib.address),
                },
            }
        )
        galleryContract = await galleryContractFactory.deploy()

        await galleryContract.deployed()
        galleryContractAddress = await galleryContract.address

        assetKidNftAddress = await galleryContract.getAssetKidNftAddress()
        assetKidNftContract = await ethers.getContractAt(
            "AssetKidNFT",
            assetKidNftAddress
        )

        biaTokenInfo = await galleryContract.getTokenInfo(0)
        fftTokenInfo = await galleryContract.getTokenInfo(1)
    })

    describe("Initial Deployment", function () {
        it("Checking gallery BIA = 10^9", async function () {
            const currentValue = await assetKidNftContract.balanceOf(
                galleryContractAddress,
                "0"
            )
            const expectedValue = String(10 ** 9)
            assert.equal(currentValue.toString(), expectedValue)
        })

        it("Checking gallery FFT = 50", async function () {
            const currentValue = await assetKidNftContract.balanceOf(
                galleryContractAddress,
                "1"
            )
            const expectedValue = String(50)
            assert.equal(currentValue.toString(), expectedValue)
        })

        it("BIA & FFT assembler contracts are zero address", async function () {
            const zero_address = "0x0000000000000000000000000000000000000000"
            assert.equal(biaTokenInfo[3], zero_address)
            assert.equal(fftTokenInfo[3], zero_address)
        })

        it("BIA & FFT escrow contracts are zero address", async function () {
            const zero_address = "0x0000000000000000000000000000000000000000"
            assert.equal(biaTokenInfo[2], zero_address)
            assert.equal(fftTokenInfo[2], zero_address)
        })

        it("BIA & FFT percent rep. = 100%", async function () {
            assert.equal(biaTokenInfo[1], "1000")
            assert.equal(fftTokenInfo[1], "1000")
        })

        it("BIA & FFT collection type is correct", async function () {
            assert.equal(biaTokenInfo[4], "4")
            assert.equal(fftTokenInfo[4], "5")
        })

        it("Correct creator address", async function () {
            assert.equal(biaTokenInfo[5], galleryContractAddress)
            assert.equal(fftTokenInfo[5], galleryContractAddress)
        })
    })

    describe("Public getter functions", function () {
        it("Get Gallery Contract's address", async function () {
            assert.equal(
                await galleryContract.getGalleryContractAddress(),
                galleryContractAddress
            )
        })
        it("Get Collection Owner's address", async function () {
            assert.equal(
                await galleryContract.getCollectionOwner("0"),
                galleryContractAddress
            )
        })
        it("Get Token Bal.", async function () {
            assert.equal(
                await String(
                    galleryContract.getTokenBalance(galleryContractAddress, "0")
                ),
                await String(
                    assetKidNftContract.balanceOf(galleryContractAddress, "0")
                )
            )
        })
        it("Get unapproved collections amount", async function () {
            assert.equal(
                await galleryContract
                    .connect(galleryContractAddress)
                    .getAmountOfUnapprovedCollections(),
                "0"
            )
        })
    })

    describe("Create Simple Collectable", function () {
        it("Create simple: 30(1%) + 6(5%) + 4(10%) = 1(100%) collection & correctly assigning ownership", async function () {
            ;[ownerAddress, creator] = await ethers.getSigners()
            _quantity = [30, 6, 4, 0, 0, 0, 0, 0, 0, 0]
            _percentage = [10, 50, 100, 0, 0, 0, 0, 0, 0, 0]
            await galleryContract
                .connect(creator)
                .createSimpleCollectable(_quantity, _percentage)
            creatorAddress = creator.address
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "2"),
                30
            )
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "3"),
                6
            )
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "4"),
                4
            )
        })

        it("Create half-percent collection: 30(1.5%)+7(5%)+1(20%) = 1(100%) collection", async function () {
            ;[ownerAddress, creator] = await ethers.getSigners()
            _quantity = [30, 7, 1, 0, 0, 0, 0, 0, 0, 0]
            _percentage = [15, 50, 200, 0, 0, 0, 0, 0, 0, 0]
            await galleryContract
                .connect(creator)
                .createSimpleCollectable(_quantity, _percentage)
            creatorAddress = creator.address
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "2"),
                30
            )
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "3"),
                7
            )
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "4"),
                1
            )
        })

        it("Cannot create collection >100%: 30(1%)+7(5%)+4(10%) = 1(105%) collection", async function () {
            ;[ownerAddress, creator] = await ethers.getSigners()
            _quantity = [30, 7, 4, 0, 0, 0, 0, 0, 0, 0]
            _percentage = [10, 50, 100, 0, 0, 0, 0, 0, 0, 0]
            await expect(
                galleryContract
                    .connect(creator)
                    .createSimpleCollectable(_quantity, _percentage)
            ).to.be.reverted
        })

        it("Cannot create half quantity: 1(0.5%)+29.5(1%)+6(5%)+4(10%) = 1(100%) collection", async function () {
            ;[ownerAddress, creator] = await ethers.getSigners()
            _quantity = [1, 29.5, 6, 4, 0, 0, 0, 0, 0, 0]
            _percentage = [5, 10, 50, 100, 0, 0, 0, 0, 0, 0]
            await expect(
                galleryContract
                    .connect(creator)
                    .createSimpleCollectable(_quantity, _percentage)
            ).to.be.reverted
        })
    })

    describe("Collectable creation events", function () {
        it("Simple Collectable Event", async function () {
            ;[ownerAddress, creator] = await ethers.getSigners()
            _quantity = [30, 6, 4, 0, 0, 0, 0, 0, 0, 0]
            _percentage = [10, 50, 100, 0, 0, 0, 0, 0, 0, 0]
            // const txn = await galleryContract
            //     .connect(creator)
            //     .createSimpleCollectable(_quantity, _percentage)

            // const receipt = await txn.wait()
            // console.log(receipt)

            await expect(
                galleryContract
                    .connect(creator)
                    .createSimpleCollectable(_quantity, _percentage)
            )
                .to.emit(galleryContract, "simpleCollectableCreated")
                .withArgs(2, [2, 3, 4, 0, 0, 0, 0, 0, 0, 0], creator.address)
        })

        it("Tier Collectable Event", async function () {
            ;[ownerAddress, creator] = await ethers.getSigners()
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await expect(
                galleryContract
                    .connect(creator)
                    .createTierCollectable(_baseTier, _subsequentTier)
            )
                .to.emit(galleryContract, "tierCollectableCreated")
                .withArgs(2, [2, 3, 4, 5, 0, 0, 0, 0, 0, 0], creator.address)
        })

        it("Tier Exchange Event", async function () {
            ;[owner, creator] = await ethers.getSigners()
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier)

            await galleryContract.connect(owner).approveCollectionId(2)

            await assetKidNftContract.connect(creator).setApproval4Gallery()

            await expect(
                galleryContract.connect(creator).exchangeTierToken(
                    2, // CollectionId
                    2, // TokenId submit (1%)
                    25, // amount
                    4 // TokenId exchange (25%)
                )
            )
                .to.emit(galleryContract, "tierExchange")
                .withArgs(2, 2, 4, creator.address)
        })
    })

    describe("Create Tier Collectable", function () {
        it("Create tier: [1%, 5%, 25%, 50%] collection & correctly assigning ownership to minter and assembler address", async function () {
            ;[ownerAddress, creator] = await ethers.getSigners()
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier)

            tokenInfo = await galleryContract.getTokenInfo(2)
            assemblerAddress = await tokenInfo[3]

            creatorAddress = await creator.address
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "2"),
                1000 / _baseTier
            )
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "3"),
                0
            )
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "4"),
                0
            )
            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "5"),
                0
            )
            assert.equal(
                await assetKidNftContract.balanceOf(assemblerAddress, "2"),
                0
            )
            assert.equal(
                await assetKidNftContract.balanceOf(assemblerAddress, "3"),
                1000 / _subsequentTier[0]
            )
            assert.equal(
                await assetKidNftContract.balanceOf(assemblerAddress, "4"),
                1000 / _subsequentTier[1]
            )
            assert.equal(
                await assetKidNftContract.balanceOf(assemblerAddress, "5"),
                1000 / _subsequentTier[2]
            )
        })

        it("Cannot create tier: [1%, 10%, 25%, 50%] collection -> 2.5x10% = 25%", async function () {
            ;[ownerAddress, creator] = await ethers.getSigners()
            _baseTier = 10
            _subsequentTier = [100, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await expect(
                galleryContract
                    .connect(creator)
                    .createTierCollectable(_baseTier, _subsequentTier)
            ).to.be.reverted
        })

        it("Cannot create tier: [1%, 10%, 60%] collection ->  60% x 1.67 =100%", async function () {
            ;[ownerAddress, creator] = await ethers.getSigners()
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
            ;[owner, creator, collector1] = await ethers.getSigners()
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await expect(
                galleryContract
                    .connect(creator)
                    .exchangeTierToken(_baseTier, _subsequentTier)
            ).to.be.reverted
        })

        it("Exchanging up 25(1%) -> 1(25%)", async function () {
            ;[owner, creator, collector1] = await ethers.getSigners()
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await assetKidNftContract.connect(creator).setApproval4Gallery()

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier)

            await galleryContract.connect(owner).approveCollectionId(2)

            tokenInfo = await galleryContract.getTokenInfo(2)
            assemblerAddress = await tokenInfo[3]
            creatorAddress = await creator.address
            creatorToken2InitAmount = 1000 / _baseTier

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "2"),
                creatorToken2InitAmount
            )

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                2, // TokenId submit (1%)
                25, // amount
                4 // TokenId exchange (25%)
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "2"),
                creatorToken2InitAmount - 25
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "4"),
                1
            )
        })

        it("Exchanging up 50(1%) -> 1(50%)", async function () {
            ;[owner, creator, collector1] = await ethers.getSigners()
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await assetKidNftContract.connect(creator).setApproval4Gallery()

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier)

            await galleryContract.connect(owner).approveCollectionId(2)

            tokenInfo = await galleryContract.getTokenInfo(2)
            assemblerAddress = await tokenInfo[3]
            creatorAddress = await creator.address
            creatorToken2InitAmount = 1000 / _baseTier

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "2"),
                creatorToken2InitAmount
            )

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                2, // TokenId submit (1%)
                50, // amount
                5 // TokenId exchange (50%)
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "2"),
                creatorToken2InitAmount - 50
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "5"),
                1
            )
        })

        it("Exchanging up 100(1%) -> 2(50%)", async function () {
            ;[owner, creator, collector1] = await ethers.getSigners()
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await assetKidNftContract.connect(creator).setApproval4Gallery()

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier)

            await galleryContract.connect(owner).approveCollectionId(2)

            tokenInfo = await galleryContract.getTokenInfo(2)
            assemblerAddress = await tokenInfo[3]
            creatorAddress = await creator.address
            creatorToken2InitAmount = 1000 / _baseTier

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "2"),
                creatorToken2InitAmount
            )

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                2, // TokenId submit (1%)
                100, // amount
                5 // TokenId exchange (50%)
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "2"),
                creatorToken2InitAmount - 100
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "5"),
                2
            )
        })

        it("Exchanging up 100(1%) -> 1(100%)", async function () {
            ;[owner, creator, collector1] = await ethers.getSigners()
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

            await assetKidNftContract.connect(creator).setApproval4Gallery()

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier)

            await galleryContract.connect(owner).approveCollectionId(2)

            tokenInfo = await galleryContract.getTokenInfo(2)
            assemblerAddress = await tokenInfo[3]
            creatorAddress = await creator.address
            creatorToken2InitAmount = 1000 / _baseTier

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "2"),
                creatorToken2InitAmount
            )

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                2, // TokenId submit (1%)
                100, // amount
                6 // TokenId exchange (50%)
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "2"),
                creatorToken2InitAmount - 100
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "6"),
                1
            )
        })

        it("Exchanging down 1(50%) -> 50(1%)", async function () {
            ;[owner, creator, collector1] = await ethers.getSigners()
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 0, 0, 0, 0, 0, 0, 0]

            await assetKidNftContract.connect(creator).setApproval4Gallery()

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier)

            await galleryContract.connect(owner).approveCollectionId(2)

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

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "2"),
                creatorToken2InitAmount - 100 + 50
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "5"),
                0 + 2 - 1
            )
        })

        it("Exchanging down 1(100%) -> 100(1%)", async function () {
            ;[owner, creator, collector1] = await ethers.getSigners()
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

            await assetKidNftContract.connect(creator).setApproval4Gallery()

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier)

            await galleryContract.connect(owner).approveCollectionId(2)

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

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "2"),
                creatorToken2InitAmount - 100 + 100
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "6"),
                0 + 1 - 1
            )
        })

        it("Exchanging down 1(100%) -> 4(25%)", async function () {
            ;[owner, creator, collector1] = await ethers.getSigners()
            _baseTier = 10
            _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

            await assetKidNftContract.connect(creator).setApproval4Gallery()

            await galleryContract
                .connect(creator)
                .createTierCollectable(_baseTier, _subsequentTier)

            await galleryContract.connect(owner).approveCollectionId(2)

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

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "6"),
                "1"
            )

            await galleryContract.connect(creator).exchangeTierToken(
                2, // CollectionId
                6, // TokenId submit (100%)
                1, // amount
                4 // TokenId exchange (25%)
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "2"),
                creatorToken2InitAmount - 100
            )

            assert.equal(
                await assetKidNftContract.balanceOf(creatorAddress, "4"),
                0 + 4
            )
        })
    })
})

describe("Testing Escrow Features", function () {
    let galleryContractFactory,
        galleryContract,
        galleryContractAddress,
        assetKidNftAddress,
        assetKidNftContract,
        escrowContract,
        owner,
        collector1,
        creator

    beforeEach(async () => {
        // Grab owner, creator, and collector
        ;[owner, creator, collector1] = await ethers.getSigners()

        // Deploy the contract and its preq. libraries.

        libraries = await deployLib()
        galleryContractFactory = await ethers.getContractFactory(
            "GalleryContract",
            {
                libraries: {
                    DeployAssemblerContract: String(
                        libraries.assemblerLibContract.address
                    ),
                    DeployAssetKidNFT: String(libraries.assetKidNFTLib.address),
                    DeployEscrowContract: String(libraries.escrowLib.address),
                },
            }
        )
        galleryContract = await galleryContractFactory.connect(owner).deploy()

        await galleryContract.deployed()
        galleryContractAddress = await galleryContract.address

        // Get the assetKidNft address

        assetKidNftAddress = await galleryContract.getAssetKidNftAddress()
        assetKidNftContract = await ethers.getContractAt(
            "AssetKidNFT",
            assetKidNftAddress
        )

        // Deploy tier token
        _baseTier = 10
        _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

        await assetKidNftContract.connect(creator).setApproval4Gallery()

        await galleryContract
            .connect(creator)
            .createTierCollectable(_baseTier, _subsequentTier)

        testCollectionInfo = await galleryContract.getTokenInfo(2)

        // Get escrow contract and test.
        escrowAddress = testCollectionInfo[2]
        escrowContract = await ethers.getContractAt(
            "EscrowContract",
            escrowAddress
        )

        await galleryContract.connect(owner).approveCollectionId(2)
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

            await assetKidNftContract.connect(collector1).setApproval4Gallery()

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

            await assetKidNftContract.connect(collector1).setApproval4Gallery()

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

            await assetKidNftContract.connect(collector1).setApproval4Gallery()
            await galleryContract
                .connect(owner)
                .transferBetween(
                    galleryContractAddress,
                    collector1.address,
                    0,
                    10000
                )

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            let bidInfo = await escrowContract.getBidArrayInfo(0)
            assert.equal(bidInfo.bidderAddress, collector1.address)
        })

        it("Offer submission approve with enough SFT and approval", async function () {
            let tokenId, bid_amount, bid_price
            tokenId = 2
            ask_amount = 10
            ask_price = 5

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, ask_amount, ask_price, false)

            let askInfo = await escrowContract.getAskArrayInfo(0)
            assert.equal(askInfo.askerAddress, creator.address)
        })

        it("Escrow contract accurately records bid information", async function () {
            let tokenId, bid_amount, bid_price
            tokenId = 2
            bid_amount = 10
            bid_price = 5

            await assetKidNftContract.connect(collector1).setApproval4Gallery()
            await galleryContract
                .connect(owner)
                .transferBetween(
                    galleryContractAddress,
                    collector1.address,
                    0,
                    10000
                )

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            let bidInfo = await escrowContract.getBidArrayInfo(0)
            assert.equal(bidInfo.bidderAddress, collector1.address)
            assert.equal(bidInfo.bidPrice, bid_price)
            assert.equal(bidInfo.bidAmount, bid_amount)
            assert.equal(bidInfo.active, true)
        })

        it("Escrow contract accurately records offer information", async function () {
            let tokenId, bid_amount, bid_price
            tokenId = 2
            bid_amount = 10
            bid_price = 5

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, bid_amount, bid_price, false)

            let askInfo = await escrowContract.getAskArrayInfo(0)
            assert.equal(askInfo.askerAddress, creator.address)
            assert.equal(askInfo.askPrice, ask_price)
            assert.equal(askInfo.askAmount, ask_amount)
            assert.equal(askInfo.active, true)
        })
    })

    describe("Exchange features", function () {
        it("Multiple bid submission FAILS", async function () {
            let tokenId, bid_amount, bid_price
            tokenId = 2
            bid_amount = 10
            bid_price = 5

            await assetKidNftContract.connect(collector1).setApproval4Gallery()
            await galleryContract
                .connect(owner)
                .transferBetween(
                    galleryContractAddress,
                    collector1.address,
                    0,
                    10000
                )

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
            await assetKidNftContract.connect(collector1).setApproval4Gallery()
            await galleryContract
                .connect(owner)
                .transferBetween(
                    galleryContractAddress,
                    collector1.address,
                    0,
                    10000
                )

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            offer_amount = 10
            offer_price = 5

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)

            assert.equal(
                await assetKidNftContract.balanceOf(collector1.address, 0),
                10000 - bid_amount * bid_price
            )
            assert.equal(
                await assetKidNftContract.balanceOf(collector1.address, 2),
                bid_amount
            )
        })

        it("Offer taking bid: bidAmt = offerAmt, bidPrice = offerPrice: Offerers get their BIA", async function () {
            let tokenId, bid_amount, bid_price, offer_amount, offer_price

            tokenId = 2
            bid_amount = 10
            bid_price = 5

            //fund the collector
            await assetKidNftContract.connect(collector1).setApproval4Gallery()
            await galleryContract
                .connect(owner)
                .transferBetween(
                    galleryContractAddress,
                    collector1.address,
                    0,
                    10000
                )

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            offer_amount = 10
            offer_price = 5

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)

            assert.equal(
                await assetKidNftContract.balanceOf(creator.address, 0),
                bid_amount * bid_price
            )
            assert.equal(
                await assetKidNftContract.balanceOf(creator.address, 2),
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
            await assetKidNftContract.connect(collector1).setApproval4Gallery()
            await galleryContract
                .connect(owner)
                .transferBetween(
                    galleryContractAddress,
                    collector1.address,
                    0,
                    10000
                )

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            assert.equal(
                await assetKidNftContract.balanceOf(collector1.address, 0),
                10000 - bid_amount * bid_price
            )
            assert.equal(
                await assetKidNftContract.balanceOf(collector1.address, 2),
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
            await assetKidNftContract.connect(collector1).setApproval4Gallery()
            await galleryContract
                .connect(owner)
                .transferBetween(
                    galleryContractAddress,
                    collector1.address,
                    0,
                    10000
                )

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            assert.equal(
                await assetKidNftContract.balanceOf(creator.address, 0),
                bid_amount * bid_price
            )
            assert.equal(
                await assetKidNftContract.balanceOf(creator.address, 2),
                100 - 10
            )
        })

        it("Offer taking bid: bidAmt > offerAmt: bidPrice = offerPrice: escrow holds onto the bid difference", async function () {
            tokenId = 2
            bid_amount = 20
            bid_price = 5

            //fund the collector
            await assetKidNftContract.connect(collector1).setApproval4Gallery()
            await galleryContract
                .connect(owner)
                .transferBetween(
                    galleryContractAddress,
                    collector1.address,
                    0,
                    10000
                )

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            offer_amount = 10
            offer_price = 5

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)

            //bid difference = 5BIA/SFT * (20-10)SFT = 50 BIA

            assert.equal(
                await assetKidNftContract.balanceOf(escrowContract.address, 0),
                50
            )
            assert.equal(
                await assetKidNftContract.balanceOf(collector1.address, 2),
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
            await assetKidNftContract.connect(collector1).setApproval4Gallery()
            await galleryContract
                .connect(owner)
                .transferBetween(
                    galleryContractAddress,
                    collector1.address,
                    0,
                    10000
                )
            bid_amount = 20 // SFT
            bid_price = 5 // BIA/SFT

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            //bid difference = 5BIA/SFT * (20-10)SFT = 50 BIA

            assert.equal(
                await assetKidNftContract.balanceOf(escrowContract.address, 0),
                50
            )
            assert.equal(
                await assetKidNftContract.balanceOf(collector1.address, 2),
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
            await assetKidNftContract.connect(collector1).setApproval4Gallery()
            await galleryContract
                .connect(owner)
                .transferBetween(
                    galleryContractAddress,
                    collector1.address,
                    0,
                    10000
                )

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            //bid difference = 5BIA/SFT * (20-10)SFT = 50 BIA

            assert.equal(
                await assetKidNftContract.balanceOf(escrowContract.address, 0),
                0
            )
            assert.equal(
                await assetKidNftContract.balanceOf(escrowContract.address, 2),
                10
            )
        })

        it("Bid taking offer: bidAmt < offerAmt: bidPrice > offerPrice: escrow holds onto the offer difference AND gallery paid difference", async function () {
            offer_amount = 20
            offer_price = 5
            tokenId = 2

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)

            bid_amount = 10
            bid_price = 10

            //fund the collector
            await assetKidNftContract.connect(collector1).setApproval4Gallery()
            await galleryContract
                .connect(owner)
                .transferBetween(
                    galleryContractAddress,
                    collector1.address,
                    0,
                    10000
                )

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            //bid difference = 5BIA/SFT * (20-10)SFT = 50 BIA
            assert.equal(
                await assetKidNftContract.balanceOf(galleryContract.address, 0),
                10 ** 9 - 10000 + (20 - 10) * 5
            )
            assert.equal(
                await assetKidNftContract.balanceOf(escrowContract.address, 2),
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
            await assetKidNftContract.connect(collector1).setApproval4Gallery()
            await galleryContract
                .connect(owner)
                .transferBetween(
                    galleryContractAddress,
                    collector1.address,
                    0,
                    10000
                )

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            //bid difference = 5BIA/SFT * (20-10)SFT = 50 BIA

            offerInfo = await escrowContract.getAskArrayInfo(0)

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
            await assetKidNftContract.connect(collector1).setApproval4Gallery()
            await galleryContract
                .connect(owner)
                .transferBetween(
                    galleryContractAddress,
                    collector1.address,
                    0,
                    10000
                )

            await galleryContract
                .connect(collector1)
                .submitOffer(tokenId, bid_amount, bid_price, true)

            offer_amount = 10
            offer_price = 4

            await galleryContract
                .connect(creator)
                .submitOffer(tokenId, offer_amount, offer_price, false)

            //bid difference = 5BIA/SFT * (20-10)SFT = 50 BIA

            bidInfo = await escrowContract.getBidArrayInfo(0)

            assert.equal(bidInfo[0], collector1.address)
            assert.equal(bidInfo[1], bid_price)
            assert.equal(bidInfo[2], bid_amount - offer_amount)
            assert.equal(bidInfo[3], true)
        })
    })
})

describe("Bid Array Overflow", function () {
    let galleryContractFactory,
        galleryContract,
        galleryContractAddress,
        assetKidNftAddress,
        assetKidNftContract,
        escrowContract,
        owner,
        collector1,
        creator,
        lastCollector

    beforeEach(async () => {
        // Grab owner, creator, and collector
        ;[owner, creator, collector1, lastCollector] = await ethers.getSigners()

        // Deploy the contract and its preq. libraries.

        libraries = await deployLib()
        galleryContractFactory = await ethers.getContractFactory(
            "GalleryContract",
            {
                libraries: {
                    DeployAssemblerContract: String(
                        libraries.assemblerLibContract.address
                    ),
                    DeployAssetKidNFT: String(libraries.assetKidNFTLib.address),
                    DeployEscrowContract: String(libraries.escrowLib.address),
                },
            }
        )
        galleryContract = await galleryContractFactory.connect(owner).deploy()

        await galleryContract.deployed()
        galleryContractAddress = await galleryContract.address

        // Get the assetKidNft address

        assetKidNftAddress = await galleryContract.getAssetKidNftAddress()
        assetKidNftContract = await ethers.getContractAt(
            "AssetKidNFT",
            assetKidNftAddress
        )

        // Deploy tier token
        _baseTier = 10
        _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

        await assetKidNftContract.connect(creator).setApproval4Gallery()

        await galleryContract
            .connect(creator)
            .createTierCollectable(_baseTier, _subsequentTier)

        testCollectionInfo = await galleryContract.getTokenInfo(2)

        // Get escrow contract.
        escrowAddress = testCollectionInfo[2]
        escrowContract = await ethers.getContractAt(
            "EscrowContract",
            escrowAddress
        )

        // Approve collection
        await galleryContract.connect(owner).approveCollectionId(2)

        // Saturating bid loop.
        for (let i = 0; i < 50; i++) {
            if (i == 49) {
                await galleryContract
                    .connect(owner)
                    .transferBetween(
                        galleryContractAddress,
                        lastCollector.address,
                        0,
                        1000
                    )
                // Wallet submit Bid

                await assetKidNftContract
                    .connect(lastCollector)
                    .setApproval4Gallery()

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
            // Fund wallet by the owner
            await galleryContract
                .connect(owner)
                .transferBetween(
                    galleryContractAddress,
                    account.address,
                    0,
                    1000
                )

            // Send some eth so they can interact with the system
            await owner.sendTransaction({
                to: account.address,
                value: ethers.utils.parseEther("10"),
            })

            // set approval
            await assetKidNftContract.connect(account).setApproval4Gallery()

            // Saturate bid and offer array
            await galleryContract
                .connect(account)
                .submitOffer(2, 10, 60 - i, true)
        }
    })

    it("Submitting Higher Bid PASSES and refunded", async function () {
        await galleryContract
            .connect(owner)
            .transferBetween(galleryContractAddress, collector1.address, 0, 100)

        await assetKidNftContract.connect(collector1).setApproval4Gallery()
        collector1Price = 12
        collctor1Amount = 1

        await galleryContract
            .connect(collector1)
            .submitOffer(2, collctor1Amount, collector1Price, true)
        bidArray49 = await escrowContract.getBidArrayInfo(49)

        // escrow recorded accurately
        assert.equal(bidArray49[0], collector1.address)
        assert.equal(bidArray49[1], collector1Price)
        assert.equal(bidArray49[2], collctor1Amount)
        // NFT is refunded to last collector
        assert.equal(
            await assetKidNftContract.balanceOf(lastCollector.address, "0"),
            1000
        )
    })

    it("Submitting Lower Bid Fails", async function () {
        await galleryContract
            .connect(owner)
            .transferBetween(galleryContractAddress, collector1.address, 0, 100)

        await assetKidNftContract.connect(collector1).setApproval4Gallery()
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
    let galleryContractFactory,
        galleryContract,
        galleryContractAddress,
        assetKidNftAddress,
        assetKidNftContract,
        escrowContract,
        owner,
        collector1,
        creator,
        lastCollector

    beforeEach(async () => {
        // Grab owner, creator, and collector
        ;[owner, creator, collector1, lastCollector] = await ethers.getSigners()

        // Deploy the contract and its preq. libraries.

        libraries = await deployLib()
        galleryContractFactory = await ethers.getContractFactory(
            "GalleryContract",
            {
                libraries: {
                    DeployAssemblerContract: String(
                        libraries.assemblerLibContract.address
                    ),
                    DeployAssetKidNFT: String(libraries.assetKidNFTLib.address),
                    DeployEscrowContract: String(libraries.escrowLib.address),
                },
            }
        )
        galleryContract = await galleryContractFactory.connect(owner).deploy()

        await galleryContract.deployed()
        galleryContractAddress = await galleryContract.address

        // Get the assetKidNft address

        assetKidNftAddress = await galleryContract.getAssetKidNftAddress()
        assetKidNftContract = await ethers.getContractAt(
            "AssetKidNFT",
            assetKidNftAddress
        )

        // Deploy tier token
        _baseTier = 10
        _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

        await assetKidNftContract.connect(creator).setApproval4Gallery()

        await galleryContract
            .connect(creator)
            .createTierCollectable(_baseTier, _subsequentTier)

        testCollectionInfo = await galleryContract.getTokenInfo(2)

        // Get escrow contract.
        escrowAddress = testCollectionInfo[2]
        escrowContract = await ethers.getContractAt(
            "EscrowContract",
            escrowAddress
        )

        // Approve collection
        await galleryContract.connect(owner).approveCollectionId(2)

        // Saturating ask loop.
        for (let i = 0; i < 50; i++) {
            if (i == 49) {
                await galleryContract
                    .connect(owner)
                    .transferBetween(
                        creator.address,
                        lastCollector.address,
                        2,
                        1
                    )
                // Wallet submit Bid

                await assetKidNftContract
                    .connect(lastCollector)
                    .setApproval4Gallery()

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
            await galleryContract
                .connect(owner)
                .transferBetween(creator.address, account.address, 2, 1)

            // Send some eth so they can interact with the system
            await owner.sendTransaction({
                to: account.address,
                value: ethers.utils.parseEther("10"),
            })

            // set approval
            await assetKidNftContract.connect(account).setApproval4Gallery()

            // Saturate ask and offer array
            await galleryContract
                .connect(account)
                .submitOffer(2, 1, 60 + i, false)
        }
    })

    it("Submitting Lower Ask Passes", async function () {
        await galleryContract
            .connect(owner)
            .transferBetween(creator.address, collector1.address, 2, 1)

        await assetKidNftContract.connect(collector1).setApproval4Gallery()
        collector1Price = 10
        collctor1Amount = 1

        await galleryContract
            .connect(collector1)
            .submitOffer(2, collctor1Amount, collector1Price, false)
        bidArray49 = await escrowContract.getAskArrayInfo(49)

        // escrow recorded accurately
        assert.equal(bidArray49[0], collector1.address)
        assert.equal(bidArray49[1], collector1Price)
        assert.equal(bidArray49[2], collctor1Amount)
        // SFT is refunded to last collector
        assert.equal(
            await assetKidNftContract.balanceOf(lastCollector.address, "2"),
            1
        )
    })

    it("Submitting Higher Ask Fails", async function () {
        await galleryContract
            .connect(owner)
            .transferBetween(creator.address, collector1.address, 2, 1)

        await assetKidNftContract.connect(collector1).setApproval4Gallery()
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
    let galleryContractFactory,
        galleryContract,
        galleryContractAddress,
        assetKidNftAddress,
        assetKidNftContract,
        escrowContract,
        owner,
        collector1,
        creator
    beforeEach(async () => {
        // Grab owner, creator, and collector
        ;[owner, creator, collector1, lastCollector] = await ethers.getSigners()
        // Deploy the contract and its preq. libraries.

        libraries = await deployLib()
        galleryContractFactory = await ethers.getContractFactory(
            "GalleryContract",
            {
                libraries: {
                    DeployAssemblerContract: String(
                        libraries.assemblerLibContract.address
                    ),
                    DeployAssetKidNFT: String(libraries.assetKidNFTLib.address),
                    DeployEscrowContract: String(libraries.escrowLib.address),
                },
            }
        )
        galleryContract = await galleryContractFactory.connect(owner).deploy()

        await galleryContract.deployed()
        galleryContractAddress = await galleryContract.address

        // Get the assetKidNft address

        assetKidNftAddress = await galleryContract.getAssetKidNftAddress()
        assetKidNftContract = await ethers.getContractAt(
            "AssetKidNFT",
            assetKidNftAddress
        )

        await galleryContract
            .connect(owner)
            .transferBetween(
                galleryContract.address,
                collector1.address,
                0,
                1000
            )

        await assetKidNftContract.connect(collector1).setApproval4Gallery()

        // Deploy tier token
        _baseTier = 10
        _subsequentTier = [50, 250, 500, 1000, 0, 0, 0, 0, 0, 0]

        await assetKidNftContract.connect(creator).setApproval4Gallery()

        await galleryContract
            .connect(creator)
            .createTierCollectable(_baseTier, _subsequentTier)

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
            .commercializeCollectionId(2, initAmt, initPrice)

        // NFT is transferred to escrow
        tokenBal = await assetKidNftContract
            .connect(creator)
            .balanceOf(creator.address, "2")
        assert.equal(tokenBal, 100 - initAmt)

        escrowTokenBal = await assetKidNftContract
            .connect(creator)
            .balanceOf(escrowContract.address, "2")
        assert.equal(escrowTokenBal, initAmt)
    })

    it("Creator create support: escrow state updates", async function () {
        initAmt = 50
        initPrice = 100

        contractStatus = await escrowContract
            .connect(creator)
            .getContractStatus()

        assert.equal(contractStatus[1], true)
        assert.equal(contractStatus[2], false)

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, initAmt, initPrice)

        contractStatus = await escrowContract
            .connect(creator)
            .getContractStatus()

        assert.equal(contractStatus[1], false)
        assert.equal(contractStatus[2], true)
    })

    it("Collector support project: escrow receive and record", async function () {
        initAmt = 50
        initPrice = 100

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, initAmt, initPrice)

        supportAmt =2

        await galleryContract.connect(collector1).supportCollectionId(2, supportAmt)
        supportInfo = await escrowContract.connect(collector1).getYourSupportInfo(collector1.address)

        tokenBal = await assetKidNftContract
            .connect(collector1)
            .balanceOf(collector1.address, 0)
        assert.equal(tokenBal, 1000 - initPrice*supportAmt)

        escrowTokenBal = await assetKidNftContract
            .connect(collector1)
            .balanceOf(escrowContract.address, 0)
        assert.equal(escrowTokenBal, initPrice*supportAmt)


        assert.equal(supportInfo[1], supportAmt)
    })

    it("Gallery Approves: BIA transfers", async function () {
        initAmt = 50
        initPrice = 100

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, initAmt, initPrice)

        supportAmt =2
        await galleryContract.connect(collector1).supportCollectionId(2, supportAmt)
        
        supportInfo = await escrowContract.connect(creator).getYourSupportInfo(creator.address)
        //console.log(`Creator Bia Owed ${supportInfo}`)

        biaInEscrow = await assetKidNftContract.connect(owner).balanceOf(escrowContract.address, "0")
        //console.log(`bia in escrow ${biaInEscrow}`)

        await galleryContract.connect(owner).approveCollectionId(2)
        // 
        creatorBia = await assetKidNftContract.connect(creator).balanceOf(creator.address, "0")
        //console.log(`Creator Bia ${creatorBia}`)
        biaInEscrow = await assetKidNftContract.connect(owner).balanceOf(escrowContract.address, "0")
        //console.log(`bia in escrow after collection approves ${biaInEscrow}`)
        // supportInfo = await escrowContract.connect(creator).getYourSupportInfo(creator.address)
        // escrowStatus = await escrowContract.connect(creator).getContractStatus()
        // console.log(`support info ${supportInfo}`)
        // console.log(`escrow status ${escrowStatus}`)

        // collector doest get until claim. 
        assert.equal(creatorBia, supportAmt*initPrice)
    })

    it("Gallery Approves: SFT transfers", async function () {

        initAmt = 50
        initPrice = 100

        await galleryContract
            .connect(creator)
            .commercializeCollectionId(2, initAmt, initPrice)

        supportAmt =2
        await galleryContract.connect(collector1).supportCollectionId(2, supportAmt)
        
        supportInfo = await escrowContract.connect(creator).getYourSupportInfo(creator.address)
        //console.log(`Creator Bia Owed ${supportInfo}`)

        biaInEscrow = await assetKidNftContract.connect(owner).balanceOf(escrowContract.address, "0")
        //console.log(`bia in escrow ${biaInEscrow}`)

        await galleryContract.connect(owner).approveCollectionId(2)
        // 
        collectorSFT = await assetKidNftContract.connect(creator).balanceOf(collector1.address, "2")
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

        collectorSFT = await assetKidNftContract.connect(creator).balanceOf(collector1.address, "2")
        assert.equal(collectorSFT, 2)
        
    })

    // it("Gallery Approves: SFT recorded", async function(){

    // })

    // it("Gallery Approves: BIA recorded", async function(){
        
    // })
})
