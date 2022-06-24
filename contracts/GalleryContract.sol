// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// IMPORTS
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./AssetKidNFT.sol";
import "./EscrowContract.sol";
import "./AssemblerContract.sol";

// Error Codes
error GalleryContract__CollectionIdAlreadyApproved();
error GalleryContract__MismatchNftContract();
error GalleryContract__AddressAlreadyApproved();
error GalleryContract__CollectionIdAlreadyExists();
error GalleryContract__CollectionIdDoesNotExists();
error GalleryContract__TokenIdDoesNotExist();
error GalleryContract__TooManyUnapprovedCollection();
error GalleryContract__MintingError();
error GalleryContract__AddressNotApproved();
error GalleryContract__SubmissionError();
error GalleryContract__CollectionIdNotApproved();
error GalleryContract__BidDoesNotExist();
error GalleryContract__AskDoesNotExist();
error GalleryContract__NotCreator();
error GalleryContract__NotCollector();

//Libraries
import "./library/deployAssetKidNFT.sol";
import "./library/deployEscrowContract.sol";
import "./library/deployAssemblerContract.sol";

/** @title A contract that governs the AssetKid's backend operations.
 *  @author Natha Dean Tansukawat
 *  @notice This contract is not yet finalized.
 *  @dev This contract will interact with the ERC1155, Assembler Contracts, and Escrow Contracts, on the user's behalf.
 */

contract GalleryContract is Ownable, ReentrancyGuard, ERC1155Holder {
    // Type Declaration

    enum COLLECTIONTYPE {
        UNASSIGNED,
        SIMPLE,
        TIER,
        PUZZLE,
        BIA,
        FFT
    }

    // Map collectionId existance
    mapping(uint256 => bool) internal collectionIdExist;

    //Map address to unapprovedCollection
    mapping(address => uint8) internal address2UnapprovedCollection;

    // Map collectionId to creator address
    mapping(uint256 => address) internal collectionId2CreatorAddress;

    // Map tokenId existance
    mapping(uint256 => bool) internal tokenIdExist;

    // Map collectionId to gallery approval
    mapping(uint256 => bool) internal collectionId2galleryApproval;

    // Map tokenIds to its collection Id.
    mapping(uint256 => uint256) internal tokenId2CollectionId;

    // Map tokenIds to its % representation of the collection.
    mapping(uint256 => uint16) internal tokenId2PercentRep;

    // Token Id to its associated escrow contract.
    mapping(uint256 => address) internal tokenId2EscrowContract;

    // Map collectionId to its collectable types
    mapping(uint256 => COLLECTIONTYPE) internal collectionId2CollectType;

    //Map collectionId to its assembler contract
    //If collect type is not tier, 0x000
    mapping(uint256 => address) internal collectionId2AssemblerContract;

    //Map address => operatorApproval
    mapping(address => bool) internal address2OperatorApproval;

    // State Variables

    uint256 public collectionIdCounter = 0;
    uint256 public tokenIdCounter = 0;
    address public immutable ASSET_KID_NFT_ADDRESS;
    AssetKidNFT public NFT_CONTRACT;

    // Events

    event simpleCollectableCreated(
        uint256 collectionId,
        uint256[] tokenIds,
        address creator
    );
    event tierCollectableCreated(
        uint256 collectionId,
        uint256[] tokenIds,
        address creator
    );
    event tierExchange(
        uint256 collectionId,
        uint256 exchangeFrom,
        uint256 exchangeTo,
        address exchanger
    );

    // Modifiers

    modifier onlyVerified(uint256 collectionId) {
        // Only allowing approved collectionId
        if (!collectionId2galleryApproval[collectionId]) {
            revert GalleryContract__CollectionIdNotApproved();
        }

        // Only allowing Operator Approved Addresses.
        if (!address2OperatorApproval[msg.sender])
            revert GalleryContract__AddressNotApproved();
        _;
    }

    // Function

    //// Constructor
    constructor() ReentrancyGuard() {
        address assetKidNftAddress = DeployAssetKidNFT.deployContract(
            address(this)
        ); //deploy nft_management contract right off the bat.
        ASSET_KID_NFT_ADDRESS = assetKidNftAddress;
        NFT_CONTRACT = AssetKidNFT(assetKidNftAddress);

        mapTokenIdsAndEscrow(
            collectionIdCounter,
            tokenIdCounter,
            address(0),
            uint16(1000)
        );

        mapCollectionId(
            collectionIdCounter,
            address(0),
            COLLECTIONTYPE.BIA,
            address(this)
        );
        approveCollectionId(uint256(0));

        mapTokenIdsAndEscrow(
            collectionIdCounter,
            tokenIdCounter,
            address(0),
            uint16(1000)
        );

        mapCollectionId(
            collectionIdCounter,
            address(0),
            COLLECTIONTYPE.FFT,
            address(this)
        );

        approveCollectionId(uint256(1));
    }

    //// Receive
    //// Fallback

    //// External

    function setApprovalForTrading(address _address) external {
        // This function will be called by the NFT contract and will allow address to access the trading functions of the escrow contract
        // Allow only the ERC1155 NFT contract to call

        if (msg.sender != ASSET_KID_NFT_ADDRESS)
            revert GalleryContract__MismatchNftContract();
        else if (address2OperatorApproval[_address])
            revert GalleryContract__AddressAlreadyApproved();

        address2OperatorApproval[_address] = true;
    }

    function transferBetween(
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _amt
    ) external onlyOwner {
        NFT_CONTRACT.safeTransferFrom(_from, _to, _tokenId, _amt, "");
    }

    //// Public

    function approveCollectionId(uint256 _tokenId) public onlyOwner {
        // This function will approve the collection Id after item is verified by the gallery.

        uint256[10] memory otherTokenIds = getOtherTokenInCollection(
            tokenId2CollectionId[_tokenId]
        );

        address creatorAddress = collectionId2CreatorAddress[
            tokenId2CollectionId[_tokenId]
        ];

        EscrowContract escrowContract;
        uint256 biaSupported;
        //Checking condition for each Id
        for (uint256 i = 0; i < 10; i++) {
            // Check condition for each Id
            if (
                collectionId2galleryApproval[
                    tokenId2CollectionId[otherTokenIds[i]]
                ] &&
                tokenId2CollectionId[_tokenId] ==
                tokenId2CollectionId[otherTokenIds[i]]
            ) {
                revert GalleryContract__CollectionIdAlreadyApproved();
            }

            // Approving each escrow contract

            EscrowContract _escrowContract = EscrowContract(
                tokenId2EscrowContract[otherTokenIds[i]]
            );

            if (address(_escrowContract) != address(0)) {
                // Transfer supported BIA from escrow contract if NOT zero address
                escrowContract = _escrowContract;
                escrowContract.verifyCollection();
                (biaSupported, ) = escrowContract.getYourSupportInfo(
                    creatorAddress
                ); // this [inside may not work] works.
                // this is 200.
                // Cannot be called when 0th address is inputted. THIS ONLY HAS TO BE CALLED ONCE
                
            }
        }

        if (address(escrowContract) != address(0)) {
            NFT_CONTRACT.safeTransferFrom(
                address(escrowContract),
                creatorAddress,
                0,
                biaSupported,
                ""
            );
        }

        // Approving the collection Id ONCE.
        address2UnapprovedCollection[creatorAddress] -= 1;
        collectionId2galleryApproval[
            tokenId2CollectionId[otherTokenIds[0]]
        ] = true;
    }

    function claimSFT(uint256 tokenId) public {
        EscrowContract escrow_contract = getEscrowContract(tokenId);
        (uint8 collectionState, , uint256 collectionPrice , ) = escrow_contract.getContractStatus();
        // collection state 3 = verified : collector calling will be transferred sft
        // colelction state 2 = SUPPORT-Cancelled : collector calling will be refunded NFT that is owed
        if (collectionState == 0 || collectionState == 1) {
            revert GalleryContract__CollectionIdNotApproved();
        }
        bool verifiedState = (collectionState == uint8(3)) ? true : false;
        (, uint256 sftOwed) = escrow_contract.getYourSupportInfo(msg.sender);

        // it is not transfering the bia back to collector 

        NFT_CONTRACT.safeTransferFrom(
            address(escrow_contract),
            msg.sender,
            verifiedState ? tokenId : 0,
            verifiedState ? sftOwed : sftOwed * collectionPrice, 
            ""
        );

        escrow_contract.claimedSupport(msg.sender);
        // cancel functions
    }

    function supportCollectionId(uint256 tokenId, uint256 sftAmount) public {
        if (
            msg.sender ==
            collectionId2CreatorAddress[tokenId2CollectionId[tokenId]]
        ) {
            revert GalleryContract__NotCollector();
        }
        EscrowContract escrow_contract = getEscrowContract(tokenId);
        (, , uint256 price, ) = escrow_contract.getContractStatus(); // price set by the creator
        uint256 biaAmount = price * sftAmount; // amount BIA to transfer = price set by creator * sftAmount support
        NFT_CONTRACT.safeTransferFrom(
            msg.sender,
            address(escrow_contract),
            0,
            biaAmount,
            ""
        );
        escrow_contract.support(msg.sender, sftAmount, false);
    }

    function withdrawSupport(uint256 tokenId) public {
        EscrowContract escrow_contract = getEscrowContract(tokenId);
        (, uint256 sftOwed) = escrow_contract.getYourSupportInfo(msg.sender);
        if (sftOwed == 0) {
            revert GalleryContract__NotCollector();
        }
        // transfer nft back
        (, , uint256 price, ) = escrow_contract.getContractStatus();
        uint256 biaOwed = sftOwed * price;
        NFT_CONTRACT.safeTransferFrom(
            address(escrow_contract),
            msg.sender,
            0,
            biaOwed,
            ""
        );
        // cancel record
        escrow_contract.support(msg.sender, sftOwed, true);
    }

    function commercializeCollectionId(
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        bool cancel
    ) public {
        if (
            msg.sender !=
            collectionId2CreatorAddress[tokenId2CollectionId[tokenId]]
        ) {
            revert GalleryContract__NotCreator();
        }

        EscrowContract escrow_contract = getEscrowContract(tokenId);
        //transfer the sft to the escrow contract (cancel: transfer the sft back to creator)
        NFT_CONTRACT.safeTransferFrom(
            cancel ? address(escrow_contract) : msg.sender,
            cancel ? msg.sender : address(escrow_contract),
            tokenId,
            cancel ? NFT_CONTRACT.balanceOf(address(escrow_contract), tokenId) :  amount,
            ""
        );

        //record in escrow
        escrow_contract.commercialize(msg.sender, amount, price, cancel);
    }

    function createSimpleCollectable(
        uint16[10] memory _quantity,
        uint16[10] memory _percentage
    ) public nonReentrant {
        if (address2UnapprovedCollection[msg.sender] >= 5)
            revert GalleryContract__TooManyUnapprovedCollection();

        // The minimum percentage equals 0.1%.
        // The maximum amount of token per collection equals 1000;
        // Percentage variable -> 1 = 0.1%, 10 = 1%, 100 = 10%, 1000 = 100%.

        address creator = msg.sender;
        uint16 running_tally = 0;
        uint256[] memory tokenIdArray = new uint256[](10);
        uint256 collectionId = collectionIdCounter;
        uint256 maxQuantity = 0;
        uint8 maxQuantIndex;

        for (uint8 i; i < 10; i++) {
            if (_quantity[i] >= 1000) revert GalleryContract__MintingError();
            running_tally += (_quantity[i] * _percentage[i]);
            (maxQuantity < _quantity[i])
                ? maxQuantity = _quantity[i]
                : maxQuantity = maxQuantity;
            (maxQuantity < _quantity[i])
                ? maxQuantIndex = i
                : maxQuantIndex = maxQuantIndex;
        }
        if (running_tally != 1000) revert GalleryContract__MintingError();

        for (uint8 i; i < 10; i++) {
            if (_quantity[i] > 0) {
                address escrowContractAddress = DeployEscrowContract
                    .deployContract(
                        ASSET_KID_NFT_ADDRESS,
                        tokenIdCounter,
                        (i == maxQuantIndex) ? true : false
                    );
                NFT_CONTRACT.mintToken(
                    msg.sender,
                    tokenIdCounter,
                    _quantity[i]
                );
                tokenIdArray[i] = tokenIdCounter;
                mapTokenIdsAndEscrow(
                    collectionIdCounter,
                    tokenIdCounter,
                    escrowContractAddress,
                    uint16(_percentage[i])
                );
            }
        }

        mapCollectionId(
            collectionIdCounter,
            address(0),
            COLLECTIONTYPE.SIMPLE,
            creator
        );

        emit simpleCollectableCreated(collectionId, tokenIdArray, creator);
    }

    function createTierCollectable(
        uint16 _baseTier,
        uint16[10] memory _subsequentTier
    ) public nonReentrant {
        // the miniumum percentage is 0.1%
        // Variable -> 1 = 0.1%, 10 = 1%, 100 = 10%, 1000 = 100%.
        // base tier must be divide 1000(100%) with no remainder
        // Each subsequent tier must divide the previous with no remainder.

        if (address2UnapprovedCollection[msg.sender] >= 5)
            revert GalleryContract__TooManyUnapprovedCollection();
        else if (1000 % _baseTier != 0 || _baseTier >= 1000)
            revert GalleryContract__MintingError();

        for (uint8 i; i < 10; i++) {
            // Compare the first element of _subsequentTier to the _baseTier and make divisibility sure
            // Continue to the next iteration
            if (i == 0) {
                if (
                    _subsequentTier[0] % _baseTier != 0 ||
                    _subsequentTier[0] <= _baseTier ||
                    _subsequentTier[i + 1] % _subsequentTier[i] != 0
                ) revert GalleryContract__MintingError();
                continue;
            }

            if (1000 % _subsequentTier[i] != 0)
                revert GalleryContract__MintingError();

            //Break if the next tier doesnt exist
            if (_subsequentTier[i + 1] == 0) {
                break;
            }

            // Compare the next tier to this tier and make divisibility sure
            if (
                _subsequentTier[i + 1] <= _subsequentTier[i] ||
                _subsequentTier[i + 1] % _subsequentTier[i] != 0
            ) revert GalleryContract__MintingError();
        }

        uint256 collectionId = collectionIdCounter;
        address creator = msg.sender;

        uint256[] memory tokenIdArray = new uint256[](10);

        uint16 baseQuantity = 1000 / _baseTier; // Should be fine because line 172

        address escrowContractAddress = DeployEscrowContract.deployContract(
            ASSET_KID_NFT_ADDRESS,
            tokenIdCounter,
            true
        ); //create an escrow contract for the base tier
        NFT_CONTRACT.mintToken(creator, tokenIdCounter, baseQuantity);
        address assemblerContractAddress = DeployAssemblerContract
            .deployContract(ASSET_KID_NFT_ADDRESS);

        tokenIdArray[0] = tokenIdCounter;
        mapTokenIdsAndEscrow(
            collectionIdCounter,
            tokenIdCounter,
            address(escrowContractAddress),
            uint16(_baseTier)
        );

        for (uint8 i; i < 10; i++) {
            uint16 quantity = 1000 / _subsequentTier[i];
            NFT_CONTRACT.mintToken(
                assemblerContractAddress,
                tokenIdCounter,
                quantity
            ); // subsequent tier tokens are minted to the assembler contract.

            address subsequentEscrowContract = DeployEscrowContract
                .deployContract(ASSET_KID_NFT_ADDRESS, tokenIdCounter, false); //creating new escrow for subsequent tokens
            tokenIdArray[i + 1] = tokenIdCounter;
            mapTokenIdsAndEscrow(
                collectionIdCounter,
                tokenIdCounter,
                address(subsequentEscrowContract),
                uint16(_subsequentTier[i])
            );
            if (_subsequentTier[i + 1] == 0) {
                break;
            }
        }

        mapCollectionId(
            collectionIdCounter,
            assemblerContractAddress,
            COLLECTIONTYPE.TIER,
            creator
        );
        emit tierCollectableCreated(collectionId, tokenIdArray, creator);
    }

    function exchangeTierToken(
        uint256 _collectionId,
        uint256 _tokenIdSubmit,
        uint16 _tokenIdSubmitAmt,
        uint256 _tokenIdExchange
    ) public onlyVerified(_collectionId) {
        address assembler_contract_address = collectionId2AssemblerContract[
            _collectionId
        ];

        (uint16 submitToExchange, uint16 exchangeToSubmit) = getExchangeRate(
            _tokenIdSubmit,
            _tokenIdExchange
        );
        if (_tokenIdSubmitAmt % submitToExchange != 0)
            revert GalleryContract__SubmissionError(); //make sure that the submission amt is a multiple of the exchange rate

        uint256 amtMultiplier = _tokenIdSubmitAmt / submitToExchange;

        NFT_CONTRACT.safeTransferFrom(
            msg.sender,
            assembler_contract_address,
            _tokenIdSubmit,
            _tokenIdSubmitAmt,
            ""
        );

        NFT_CONTRACT.safeTransferFrom(
            assembler_contract_address,
            msg.sender,
            _tokenIdExchange,
            exchangeToSubmit * amtMultiplier,
            ""
        );

        emit tierExchange(
            _collectionId,
            _tokenIdSubmit,
            _tokenIdExchange,
            msg.sender
        );
    }

    function submitOffer(
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        bool bid
    ) public onlyVerified(tokenId2CollectionId[tokenId]) {
        // This is required because STACK TOO DEEP error.
        EscrowContract escrow_contract = getEscrowContract(tokenId);
        // Check for previous submission ?
        if (!escrow_contract.check4Submission(msg.sender, bid)) {
            return;
        }
        while (amount > 0) {
            // get counter party if available.
            (
                uint8 counterIndex,
                address counterAddress,
                uint256 counterPrice,
                uint256 counterAmount,
                bool counterFound
            ) = getCounterPartyInfo(bid, tokenId);

            // if counter party not available (no highest bid or lowest ask) -> transfer asset to escrow and break
            if (
                !counterFound ||
                (bid ? counterPrice > price : price > counterPrice)
            ) {
                // transfer asset to escrow
                assetToEscrowTransfer(
                    msg.sender, //_from from bidder or from asker
                    tokenId, //_tokenId
                    amount, //_tokenAmt bidAmount / askAmount
                    price, // _tokenPrice bidPrice / askPrice
                    false, // cancel
                    0, // cancelIndex
                    bid ? true : false // bid
                );

                break;
            }

            // COUNTER PART AVAILABLE
            // Transfer the smallest amt (amount vs counterAmount) to their respective owner
            // Only run when askPrice > bidPrice.
            NFT_CONTRACT.mutualEscrowTransfer(
                bid ? msg.sender : counterAddress, // bidderAddress
                bid ? counterAddress : msg.sender, // askerAddress
                tokenId, // tokenId
                (counterAmount >= amount) ? amount : counterAmount, // tokenAmount
                bid ? counterPrice : price, // askingPrice
                bid ? price : counterPrice, // bidingPrice
                bid ? true : false, // bid or ask input
                address(escrow_contract) // escrow contract
            );

            if (counterAmount > amount) {
                // if amount is less than counterAmount, already transfer, just reconcile
                uint256 newCounterAmt = counterAmount - amount;
                escrow_contract.reconcileAmount(newCounterAmt, counterIndex, bid);
                break;
            }
            // amount more than counterAtmount, reconcile 0 for counterAmt
            escrow_contract.reconcileAmount(0, counterIndex, bid);
            amount -= counterAmount;
        }
    }

    function cancelOffer(uint256 tokenId, bool bid)
        public
        onlyVerified(tokenId2CollectionId[tokenId])
    {
        EscrowContract escrow_contract = getEscrowContract(tokenId);
        for (uint8 i = 0; i < 50; i++) {
            (address refAddress, , uint256 refundAmount, bool active) = bid
                ? escrow_contract.getBidArrayInfo(i)
                : escrow_contract.getAskArrayInfo(i);

            if (refAddress == msg.sender && active) {
                escrow_contract.recordBidAsk(msg.sender, 0, 0, true, i, bid);
                NFT_CONTRACT.safeTransferFrom(
                    address(escrow_contract),
                    msg.sender,
                    bid ? 0 : tokenId,
                    refundAmount,
                    ""
                );
                return;
                // refund the BIA / SFT
            }
        }

        revert GalleryContract__NotCollector();
    }

    //// Internal

    function mapCollectionId(
        uint256 _collectionId,
        address _assemblerContract,
        COLLECTIONTYPE _CollectionType,
        address _creatorAddress
    ) internal {
        if (collectionIdExist[_collectionId])
            revert GalleryContract__CollectionIdAlreadyExists();

        // Mapping
        collectionIdExist[_collectionId] = true;
        collectionId2AssemblerContract[_collectionId] = _assemblerContract;
        collectionId2CollectType[_collectionId] = _CollectionType;
        collectionId2CreatorAddress[_collectionId] = _creatorAddress;

        // Increasing tracking params.
        collectionIdCounter += 1;
        address2UnapprovedCollection[_creatorAddress] += 1;
    }

    function mapTokenIdsAndEscrow(
        uint256 _collectionId,
        uint256 _tokenId,
        address _escrowContract,
        uint16 _percentRep
    ) internal {
        tokenId2CollectionId[_tokenId] = _collectionId;
        tokenIdExist[_tokenId] = true;
        tokenId2EscrowContract[_tokenId] = _escrowContract;
        tokenId2PercentRep[_tokenId] = _percentRep;
        tokenIdCounter += 1;
    }

    function assetToEscrowTransfer(
        address _from,
        uint256 _tokenId,
        uint256 _tokenAmt,
        uint256 _tokenPrice,
        bool cancel,
        uint8 cancelIndex,
        bool bid
    ) internal {
        EscrowContract escrow_contract = getEscrowContract(_tokenId);

        (
            bool replacement,
            address replacement_address,
            uint256 replacementAmt
        ) = escrow_contract.recordBidAsk(
                _from,
                _tokenPrice,
                _tokenAmt,
                cancel,
                cancelIndex,
                bid
            );

        if (replacement) {
            // refunding the lowest bidder
            NFT_CONTRACT.safeTransferFrom(
                address(escrow_contract),
                replacement_address,
                bid ? 0 : _tokenId,
                replacementAmt,
                ""
            );
        }
        // transfering to escrow
        NFT_CONTRACT.safeTransferFrom(
            _from,
            address(escrow_contract),
            bid ? 0 : _tokenId,
            bid ? _tokenAmt * _tokenPrice : _tokenAmt,
            ""
        );
    }

    //// Private
    //// View/Pure

    function getAssetKidNftAddress() public view returns (address) {
        return (ASSET_KID_NFT_ADDRESS);
    }

    function getCounterPartyInfo(bool bid, uint256 tokenId)
        internal
        view
        returns (
            uint8 counterIndex,
            address counterAddress,
            uint256 counterPrice,
            uint256 counterAmount,
            bool counterFound
        )
    {
        // thid function finds lowest ask and highest bid then returns the information
        EscrowContract escrow_contract = getEscrowContract(tokenId);
        (counterIndex, counterFound) = escrow_contract.findHighestBidLowestAsk(bid ? false : true);
        if (counterFound) {
            (counterAddress, counterPrice, counterAmount, ) = bid
                ? escrow_contract.getAskArrayInfo(counterIndex)
                : escrow_contract.getBidArrayInfo(counterIndex);
        }

        return (
            counterIndex,
            counterAddress,
            counterPrice,
            counterAmount,
            counterFound
        );
    }

    function getGalleryContractAddress()
        public
        view
        returns (address galleryContractAddress)
    {
        return (address(this));
    }

    function getAmountOfUnapprovedCollections()
        public
        view
        returns (uint8 numberOfCollections)
    {
        return (address2UnapprovedCollection[msg.sender]);
    }

    function getTokenInfo(uint256 _tokenId)
        public
        view
        returns (
            uint256 CollectionId,
            uint16 PercentRep,
            address EscrowContractAddress,
            address AssemblerContractAddress,
            COLLECTIONTYPE CollectionType,
            address CreatorAddress
        )
    {
        if (!tokenIdExist[_tokenId])
            revert GalleryContract__TokenIdDoesNotExist();

        return (
            tokenId2CollectionId[_tokenId],
            tokenId2PercentRep[_tokenId],
            tokenId2EscrowContract[_tokenId],
            collectionId2AssemblerContract[tokenId2CollectionId[_tokenId]],
            collectionId2CollectType[tokenId2CollectionId[_tokenId]],
            collectionId2CreatorAddress[tokenId2CollectionId[_tokenId]]
        );
    }

    function getOtherTokenInCollection(uint256 _tokenId)
        public
        view
        returns (uint256[10] memory otherTokenIds)
    {
        // Both create token functions create token consecutively -> query
        uint8 indexReturn;
        uint256 guessedTokenId;
        for (int256 i = -10; i < 10; i++) {
            if ((int256(_tokenId) + i) < 0) {
                // if any calculated tokenId <0; just ignore it.
                continue;
            }
            guessedTokenId = uint256(int256(_tokenId) + i);

            if (guessedTokenId >= tokenIdCounter) {
                break;
            }

            (uint256 CollectionId, , , , , ) = getTokenInfo(
                uint256(guessedTokenId)
            );

            // tokenId + 1 does not exist -> revert

            if (CollectionId == tokenId2CollectionId[_tokenId]) {
                otherTokenIds[indexReturn] = _tokenId;
                indexReturn += 1;
            }
        }

        return (otherTokenIds);
    }

    function getEscrowContract(uint256 _tokenId)
        public
        view
        returns (EscrowContract)
    {
        EscrowContract escrow_contract = EscrowContract(
            tokenId2EscrowContract[_tokenId]
        );

        return (escrow_contract);
    }

    function getCollectionOwner(uint256 _collectionId)
        public
        view
        returns (address)
    {
        if (!collectionIdExist[_collectionId])
            revert GalleryContract__CollectionIdDoesNotExists();
        return (collectionId2CreatorAddress[_collectionId]);
    }

    function getTokenBalance(address _address, uint256 tokenId)
        public
        view
        returns (uint256)
    {
        return (NFT_CONTRACT.balanceOf(_address, tokenId));
    }

    function getExchangeRate(uint256 _tokenIdSubmit, uint256 _tokenIdExchange)
        internal
        view
        returns (uint16 submitToExchange, uint16 exchangeToSubmit)
    {
        (
            uint256 submittedCollectionId,
            uint16 submittedPercent,
            ,
            ,
            ,

        ) = getTokenInfo(_tokenIdSubmit);
        (
            uint256 exchangedCollectionId,
            uint16 exchangedPercent,
            ,
            ,
            ,

        ) = getTokenInfo(_tokenIdExchange);

        if (submittedCollectionId != exchangedCollectionId)
            revert GalleryContract__SubmissionError();

        if (_tokenIdSubmit < _tokenIdExchange) {
            //Exchange up

            submitToExchange = exchangedPercent / submittedPercent;
            exchangeToSubmit = 1;
        } else if (_tokenIdSubmit > _tokenIdExchange) {
            //Exchange down

            exchangeToSubmit = submittedPercent / exchangedPercent;
            submitToExchange = 1;
        }

        return (submitToExchange, exchangeToSubmit);
    }
}
