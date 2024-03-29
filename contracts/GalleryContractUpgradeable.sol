// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// IMPORTS

import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "./EscrowContract.sol";
import "./AssemblerContract.sol";

// Error Codes
error GalleryContractV0__CollectionIdAlreadyApproved();
error GalleryContractV0__MismatchContractAddress();
error GalleryContractV0__AddressAlreadyApproved();
error GalleryContractV0__CollectionIdAlreadyExists();
error GalleryContractV0__CollectionIdDoesNotExists();
error GalleryContractV0__TokenIdDoesNotExist();
error GalleryContractV0__TooManyUnapprovedCollection();
error GalleryContractV0__MintingError();
error GalleryContractV0__AddressNotApproved();
error GalleryContractV0__SubmissionError();
error GalleryContractV0__CollectionIdNotApproved();
error GalleryContractV0__BidDoesNotExist();
error GalleryContractV0__AskDoesNotExist();
error GalleryContractV0__NotCreator();
error GalleryContractV0__NotCollector();
error GalleryContractV0__NotAdmin();
error GalleryContractV0__CannotLowLevelCallNftContract();

//Libraries
import "./library/deployEscrowContract.sol";
import "./library/deployAssemblerContract.sol";

contract GalleryContractUpgradeable is ERC1155HolderUpgradeable {
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

    // Mapping tokenId to tokenHex
    mapping(uint256 => uint256) internal tokenId2Hex;

    // State Variables

    uint256 public collectionIdCounter;
    uint256 public TOKEN_ID_COUNTER;
    address public ASSET_KID_NFT_ADDRESS;
    address GALLERY_2_ADDRESS;
    address GALLERY_ADMIN_ADDRESS;

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

    event collectionVerified(address creatorAddress, uint256 collectionId);

    event collectionCommercialized(
        address creatorAddress,
        uint256 collectionId
    );

    // Modifiers

    modifier onlyVerified(uint256 collectionId) {
        // Only allowing approved collectionId
        if (!collectionId2galleryApproval[collectionId]) {
            revert GalleryContractV0__CollectionIdNotApproved();
        }

        // // Only allowing Operator Approved Addresses.
        // if (!address2OperatorApproval[msg.sender])
        //     revert GalleryContractV0__AddressNotApproved();
        _;
    }

    modifier onlyGalleryAdmin() {
        if (msg.sender != GALLERY_ADMIN_ADDRESS) {
            revert GalleryContractV0__NotAdmin();
        }
        _;
    }

    // Function

    //// Initializer

    function initialize(
        address _galleryAdminAddress,
        uint256 _bia,
        uint256 _friendsAndFam
    ) public initializer {
        collectionIdCounter = 0;
        TOKEN_ID_COUNTER = 0;
        GALLERY_ADMIN_ADDRESS = _galleryAdminAddress;
        mapTokenIdsAndEscrow(
            collectionIdCounter,
            _bia,
            address(0),
            uint16(1000)
        );

        mapCollectionId(
            collectionIdCounter,
            address(0),
            COLLECTIONTYPE.BIA,
            address(this)
        );
        address2UnapprovedCollection[address(this)] -= 1;
        collectionId2galleryApproval[0] = true;

        mapTokenIdsAndEscrow(
            collectionIdCounter,
            _friendsAndFam,
            address(0),
            uint16(1000)
        );

        mapCollectionId(
            collectionIdCounter,
            address(0),
            COLLECTIONTYPE.FFT,
            address(this)
        );

        address2UnapprovedCollection[address(this)] -= 1;
        collectionId2galleryApproval[1] = true;
    }

    //// Receive
    //// Fallback

    //// External

    // function setApprovalForTrading(address _address) external {
    //     // This function will be called by the NFT contract and will allow address to access the trading functions of the escrow contract
    //     // Allow only the ERC1155 NFT contract to call

    //     if (msg.sender != ASSET_KID_NFT_ADDRESS)
    //         revert GalleryContractV0__MismatchContractAddress();
    //     else if (address2OperatorApproval[_address])
    //         revert GalleryContractV0__AddressAlreadyApproved();

    //     address2OperatorApproval[_address] = true;
    // }

    // FUND ADDRESS IS NOW IN THE NFT CONTRACT

    //// Public

    function approveCollectionId(uint256 _tokenId) public onlyGalleryAdmin {
        // This function will approve the collection Id after item is verified by the gallery.

        EscrowContract commercialEscrow;
        uint256 biaSupported;

        address creatorAddress = collectionId2CreatorAddress[
            tokenId2CollectionId[_tokenId]
        ];

        uint256[10] memory otherTokenIds = DeployEscrowContract
            .getOtherTokenInCollection(
                tokenId2CollectionId[_tokenId],
                _tokenId,
                TOKEN_ID_COUNTER,
                address(this)
            );

        for (uint256 i; i < 10; i++) {
            EscrowContract _escrowContract = EscrowContract(
                tokenId2EscrowContract[otherTokenIds[i]]
            );
            // Verfifying each contract
            _escrowContract.verifyCollection();
            // finding which contract is the commercial contract

            (, bool commercializable, , ) = _escrowContract.getContractStatus();
            // get biaSupported and commercial Escrow contract
            if (commercializable) {
                commercialEscrow = _escrowContract;
                (biaSupported, ) = _escrowContract.getYourSupportInfo(
                    creatorAddress
                );
                break;
            }

            if (otherTokenIds[i + 1] == 0) {
                break;
            }
        }
        collectionId2galleryApproval[tokenId2CollectionId[_tokenId]] = true;
        emit collectionVerified(creatorAddress, _tokenId);
    }

    function claimBIA(uint256 tokenId) public {
        address creatorAddress = collectionId2CreatorAddress[
            tokenId2CollectionId[tokenId]
        ];
        if (creatorAddress != msg.sender) {
            revert GalleryContractV0__NotCreator();
        }
        EscrowContract commercialEscrow = EscrowContract(
            tokenId2EscrowContract[tokenId]
        );
        (uint256 biaSupported, ) = commercialEscrow.getYourSupportInfo(
            creatorAddress
        );

        nftSafeTransfer(
            address(commercialEscrow),
            creatorAddress,
            tokenId2Hex[0],
            biaSupported
        );
    }

    function claimSFT(uint256 tokenId) public {
        (
            uint8 collectionState,
            uint256 collectionPrice,
            uint256 sftOwed,
            address escrowAddress
        ) = DeployEscrowContract.claimSftHelper(
                tokenId,
                address(this),
                msg.sender
            );

        nftSafeTransfer(
            escrowAddress,
            msg.sender,
            (collectionState == uint8(3))
                ? tokenId2Hex[tokenId]
                : tokenId2Hex[0],
            (collectionState == uint8(3)) ? sftOwed : sftOwed * collectionPrice
        );
    }

    function supportCollectionId(uint256 tokenId, uint256 sftAmount) public {
        if (
            msg.sender ==
            collectionId2CreatorAddress[tokenId2CollectionId[tokenId]]
        ) {
            revert GalleryContractV0__NotCollector();
        }
        EscrowContract escrow_contract = getEscrowContract(tokenId);
        (, , uint256 price, ) = escrow_contract.getContractStatus(); // price set by the creator
        uint256 biaAmount = price * sftAmount; // amount BIA to transfer = price set by creator * sftAmount support

        nftSafeTransfer(
            msg.sender,
            address(escrow_contract),
            tokenId2Hex[0],
            biaAmount
        );
        escrow_contract.support(msg.sender, sftAmount, false);
    }

    function withdrawSupport(uint256 tokenId) public {
        EscrowContract escrow_contract = getEscrowContract(tokenId);
        (, uint256 sftOwed) = escrow_contract.getYourSupportInfo(msg.sender);
        if (sftOwed == 0) {
            revert GalleryContractV0__NotCollector();
        }
        // transfer nft back
        (, , uint256 price, ) = escrow_contract.getContractStatus();
        uint256 biaOwed = sftOwed * price;

        nftSafeTransfer(
            address(escrow_contract),
            msg.sender,
            tokenId2Hex[0],
            biaOwed
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
            revert GalleryContractV0__NotCreator();
        }

        EscrowContract escrow_contract = getEscrowContract(tokenId);

        if (cancel) {
            nftTransferAll(
                address(escrow_contract),
                msg.sender,
                tokenId2Hex[tokenId]
            );
        } else {
            nftSafeTransfer(
                msg.sender,
                address(escrow_contract),
                tokenId2Hex[tokenId],
                amount
            );
        }

        //record in escrow
        escrow_contract.commercialize(msg.sender, amount, price, cancel);

        emit collectionCommercialized(
            collectionId2CreatorAddress[tokenId2CollectionId[tokenId]],
            tokenId2CollectionId[tokenId]
        );
    }

    function createSimpleCollectable(
        uint16[10] memory _quantity,
        uint16[10] memory _percentage,
        uint256[10] memory hexArray
    ) public {
        if (address2UnapprovedCollection[msg.sender] >= 5)
            revert GalleryContractV0__TooManyUnapprovedCollection();

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
            if (_quantity[i] >= 1000) revert GalleryContractV0__MintingError();
            running_tally += (_quantity[i] * _percentage[i]);
            (maxQuantity < _quantity[i])
                ? maxQuantity = _quantity[i]
                : maxQuantity = maxQuantity;
            (maxQuantity < _quantity[i])
                ? maxQuantIndex = i
                : maxQuantIndex = maxQuantIndex;
        }
        if (running_tally != 1000) revert GalleryContractV0__MintingError();

        for (uint8 i; i < 10; i++) {
            if (_quantity[i] > 0) {
                address escrowContractAddress = DeployEscrowContract
                    .deployContract(
                        ASSET_KID_NFT_ADDRESS,
                        address(this),
                        TOKEN_ID_COUNTER,
                        (i == maxQuantIndex) ? true : false
                    );
                nftMintToken(msg.sender, hexArray[i], _quantity[i]);
                tokenIdArray[i] = TOKEN_ID_COUNTER;
                mapTokenIdsAndEscrow(
                    collectionIdCounter,
                    hexArray[i],
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
        uint16[10] memory _subsequentTier,
        uint256[10] memory hexIdArray
    ) public {
        // the miniumum percentage is 0.1%
        // Variable -> 1 = 0.1%, 10 = 1%, 100 = 10%, 1000 = 100%.
        // base tier must be divide 1000(100%) with no remainder
        // Each subsequent tier must divide the previous with no remainder.

        if (address2UnapprovedCollection[msg.sender] >= 5)
            revert GalleryContractV0__TooManyUnapprovedCollection();
        else if (1000 % _baseTier != 0 || _baseTier >= 1000)
            revert GalleryContractV0__MintingError();

        for (uint8 i; i < 10; i++) {
            // Compare the first element of _subsequentTier to the _baseTier and make divisibility sure
            // Continue to the next iteration
            if (i == 0) {
                if (
                    _subsequentTier[0] % _baseTier != 0 ||
                    _subsequentTier[0] <= _baseTier ||
                    _subsequentTier[i + 1] % _subsequentTier[i] != 0
                ) revert GalleryContractV0__MintingError();
                continue;
            }

            if (1000 % _subsequentTier[i] != 0)
                revert GalleryContractV0__MintingError();

            //Break if the next tier doesnt exist
            if (_subsequentTier[i + 1] == 0) {
                break;
            }

            // Compare the next tier to this tier and make divisibility sure
            if (
                _subsequentTier[i + 1] <= _subsequentTier[i] ||
                _subsequentTier[i + 1] % _subsequentTier[i] != 0
            ) revert GalleryContractV0__MintingError();
        }

        uint256 collectionId = collectionIdCounter;
        address creator = msg.sender;

        uint256[] memory tokenIdArray = new uint256[](10);

        uint16 baseQuantity = 1000 / _baseTier; // Should be fine because line 172

        // create an escrow contract for the base tier
        address escrowContractAddress = DeployEscrowContract.deployContract(
            ASSET_KID_NFT_ADDRESS,
            address(this),
            TOKEN_ID_COUNTER,
            true
        );

        // minting base tier token
        nftMintToken(creator, hexIdArray[0], baseQuantity);
        address assemblerContractAddress = DeployAssemblerContract
            .deployContract(ASSET_KID_NFT_ADDRESS, address(this));

        tokenIdArray[0] = TOKEN_ID_COUNTER;
        mapTokenIdsAndEscrow(
            collectionIdCounter,
            hexIdArray[0],
            address(escrowContractAddress),
            uint16(_baseTier)
        );

        for (uint8 i; i < 10; i++) {
            uint16 quantity = 1000 / _subsequentTier[i];

            nftMintToken(assemblerContractAddress, hexIdArray[i + 1], quantity); // subsequent tier tokens are minted to the assembler contract.

            address subsequentEscrowContract = DeployEscrowContract
                .deployContract(
                    ASSET_KID_NFT_ADDRESS,
                    address(this),
                    TOKEN_ID_COUNTER,
                    false
                ); //creating new escrow for subsequent tokens
            tokenIdArray[i + 1] = TOKEN_ID_COUNTER;
            mapTokenIdsAndEscrow(
                collectionIdCounter,
                hexIdArray[i + 1],
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

        (
            uint16 submitToExchange,
            uint16 exchangeToSubmit
        ) = DeployEscrowContract.getExchangeRate(
                _tokenIdSubmit,
                _tokenIdExchange,
                address(this)
            );

        if (_tokenIdSubmitAmt % submitToExchange != 0)
            revert GalleryContractV0__SubmissionError(); //make sure that the submission amt is a multiple of the exchange rate

        uint256 amtMultiplier = _tokenIdSubmitAmt / submitToExchange;

        nftSafeTransfer(
            msg.sender,
            assembler_contract_address,
            tokenId2Hex[_tokenIdSubmit],
            _tokenIdSubmitAmt
        );

        nftSafeTransfer(
            assembler_contract_address,
            msg.sender,
            tokenId2Hex[_tokenIdExchange],
            exchangeToSubmit * amtMultiplier
        );

        emit tierExchange(
            _collectionId,
            _tokenIdSubmit,
            _tokenIdExchange,
            msg.sender
        );
    }

    function submitOfferHelper(
        address sender,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        bool bid
    ) internal {
        (
            uint8 counterIndex,
            address counterAddress,
            uint256 counterPrice,
            uint256 counterAmount,

        ) = DeployEscrowContract.getCounterPartyInfo(
                bid,
                tokenId2EscrowContract[tokenId]
            );

        EscrowContract escrow_contract = getEscrowContract(tokenId);

        nftMutualEscrowTransfer(
            sender, // sender
            counterAddress, // counterParty
            tokenId2Hex[tokenId], // tokenId
            (counterAmount >= amount) ? amount : counterAmount, // tokenAmount
            bid ? counterPrice : price, // askingPrice
            bid ? price : counterPrice, // bidingPrice
            bid, // bid or ask input
            address(escrow_contract) // escrow contract
        );

        escrow_contract.reconcileAmount(
            (counterAmount > amount) ? counterAmount - amount : 0,
            counterIndex,
            bid
        );
    }

    function submitOffer(
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        bool bid
    ) public onlyVerified(tokenId2CollectionId[tokenId]) {
        // This is required because STACK TOO DEEP error.

        // Check for previous submission ?

        while (amount > 0) {
            // get counter party if available.
            (
                ,
                ,
                uint256 counterPrice,
                uint256 counterAmount,
                bool counterFound
            ) = DeployEscrowContract.getCounterPartyInfo(
                    bid,
                    tokenId2EscrowContract[tokenId]
                );

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
                    bid // bid
                );

                break;
            }

            submitOfferHelper(msg.sender, tokenId, amount, price, bid);

            if (counterAmount > amount) {
                break;
            } else {
                amount -= counterAmount;
            }
        }
    }

    function cancelOffer(uint256 tokenId, bool bid)
        public
        onlyVerified(tokenId2CollectionId[tokenId])
    {
        EscrowContract escrow_contract = getEscrowContract(tokenId);
        for (uint8 i = 0; i < 50; i++) {
            (
                address refAddress,
                ,
                uint256 refundAmount,
                bool active
            ) = escrow_contract.getArrayInfo(i, bid);

            if (refAddress == msg.sender && active) {
                escrow_contract.recordBidAsk(msg.sender, 0, 0, true, i, bid);
                nftSafeTransfer(
                    address(escrow_contract),
                    msg.sender,
                    bid ? 0 : tokenId,
                    refundAmount
                );
                return;
                // refund the BIA / SFT
            }
        }

        revert GalleryContractV0__NotCollector();
    }

    //// Internal

    function mapCollectionId(
        uint256 _collectionId,
        address _assemblerContract,
        COLLECTIONTYPE _CollectionType,
        address _creatorAddress
    ) internal {
        if (collectionIdExist[_collectionId])
            revert GalleryContractV0__CollectionIdAlreadyExists();

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
        uint256 hexTokenId,
        address _escrowContract,
        uint16 _percentRep
    ) internal {
        tokenId2Hex[TOKEN_ID_COUNTER] = hexTokenId;
        tokenId2CollectionId[TOKEN_ID_COUNTER] = _collectionId;
        tokenIdExist[TOKEN_ID_COUNTER] = true;
        tokenId2EscrowContract[TOKEN_ID_COUNTER] = _escrowContract;
        tokenId2PercentRep[TOKEN_ID_COUNTER] = _percentRep;
        TOKEN_ID_COUNTER += 1;
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
        // pretty sure this can be moved to NFT contract
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
            nftSafeTransfer(
                address(escrow_contract),
                replacement_address,
                bid ? tokenId2Hex[0] : tokenId2Hex[_tokenId],
                replacementAmt
            );
        }

        nftSafeTransfer(
            _from,
            address(escrow_contract),
            bid ? tokenId2Hex[0] : tokenId2Hex[_tokenId],
            bid ? _tokenAmt * _tokenPrice : _tokenAmt
        );

        nftCollectGalleryFee(_from, _tokenAmt * _tokenPrice);
    }

    //// Private
    //// View/Pure

    function getAssetKidNftAddress() public view returns (address) {
        return (ASSET_KID_NFT_ADDRESS);
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

    function getHexId(uint256 tokenId) public view returns (uint256 hexId) {
        return tokenId2Hex[tokenId];
    }

    function getTokenInfo(uint256 _tokenId)
        public
        view
        returns (
            uint256 CollectionId,
            uint16 PercentRep,
            address EscrowContractAddress,
            address AssemblerContractAddress,
            uint8 CollectionType,
            address CreatorAddress
        )
    {
        if (!tokenIdExist[_tokenId])
            revert GalleryContractV0__TokenIdDoesNotExist();

        return (
            tokenId2CollectionId[_tokenId],
            tokenId2PercentRep[_tokenId],
            tokenId2EscrowContract[_tokenId],
            collectionId2AssemblerContract[tokenId2CollectionId[_tokenId]],
            uint8(collectionId2CollectType[tokenId2CollectionId[_tokenId]]),
            collectionId2CreatorAddress[tokenId2CollectionId[_tokenId]]
        );
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
            revert GalleryContractV0__CollectionIdDoesNotExists();
        return (collectionId2CreatorAddress[_collectionId]);
    }

    function burnTokenId(uint256 tokenId) external {
        if (msg.sender != GALLERY_2_ADDRESS) {
            revert GalleryContractV0__MismatchContractAddress();
        }
        tokenIdExist[tokenId] = false;
    }

    function burnCollectionId(uint256 collectionId) external {
        if (msg.sender != GALLERY_2_ADDRESS) {
            revert GalleryContractV0__MismatchContractAddress();
        }
        collectionIdExist[collectionId] = false;
    }

    function getTokenIdCounter() public view returns (uint256) {
        return TOKEN_ID_COUNTER;
    }

    function setGallery2Address(address gallery2Address)
        public
        onlyGalleryAdmin
    {
        GALLERY_2_ADDRESS = gallery2Address;
        (bool success, ) = ASSET_KID_NFT_ADDRESS.call(
            abi.encodeWithSignature(
                "setGallery2Address(address)",
                gallery2Address
            )
        );
        if (!success) {
            revert GalleryContractV0__CannotLowLevelCallNftContract();
        }
    }

    function setNftContractAddress(address nftContractAddress)
        public
        onlyGalleryAdmin
    {
        ASSET_KID_NFT_ADDRESS = nftContractAddress;
    }

    function nftSafeTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) internal {
        (bool success, ) = ASSET_KID_NFT_ADDRESS.call(
            abi.encodeWithSignature(
                "safeTransferFrom(address,address,uint256,uint256,bytes)",
                from,
                to,
                tokenId,
                amount,
                ""
            )
        );
        if (!success) {
            revert GalleryContractV0__CannotLowLevelCallNftContract();
        }
    }

    function nftMutualEscrowTransfer(
        address sender,
        address counterParty,
        uint256 tokenId,
        uint256 amount,
        uint256 askPrice,
        uint256 bidPrice,
        bool bid,
        address escrowAddress
    ) internal {
        (bool success, ) = ASSET_KID_NFT_ADDRESS.call(
            abi.encodeWithSignature(
                "mutualEscrowTransfer(address,address,uint256,uint256,uint256,uint256,bool,address)",
                sender,
                counterParty,
                tokenId,
                amount,
                askPrice,
                bidPrice,
                bid,
                escrowAddress
            )
        );
        if (!success) {
            revert GalleryContractV0__CannotLowLevelCallNftContract();
        }
    }

    function nftMintToken(
        address adr,
        uint256 tokenId,
        uint16 quantity
    ) internal {
        (bool success, ) = ASSET_KID_NFT_ADDRESS.call(
            abi.encodeWithSignature(
                "mintToken(address,uint256,uint16,uint256)",
                adr,
                tokenId,
                quantity,
                TOKEN_ID_COUNTER
            )
        );
        if (!success) {
            revert GalleryContractV0__CannotLowLevelCallNftContract();
        }
    }

    function nftCollectGalleryFee(address adr, uint256 txnAmount) internal {
        (bool success, ) = ASSET_KID_NFT_ADDRESS.call(
            abi.encodeWithSignature(
                "collectGalleryFee(address,uint256)",
                adr,
                txnAmount
            )
        );
        if (!success) {
            revert GalleryContractV0__CannotLowLevelCallNftContract();
        }
    }

    function nftTransferAll(
        address from,
        address to,
        uint256 tokenId
    ) internal {
        (bool success, ) = ASSET_KID_NFT_ADDRESS.call(
            abi.encodeWithSignature(
                "transferAll(address,address,uint256)",
                from,
                to,
                tokenId
            )
        );
        if (!success) {
            revert GalleryContractV0__CannotLowLevelCallNftContract();
        }
    }
}
