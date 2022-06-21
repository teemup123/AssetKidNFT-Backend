// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./AssetKidNFT.sol";

error EscrowContract__ArrayFull();
error EscrowContract__ContractLocked();
error EscrowContract__CannotCommercialize();
error EscrowContract__CannotSupport();
error EscrowContract__AlreadySubmit();

contract EscrowContract is ERC1155Holder, Ownable {
    // This contract will facillitate the trade of a specific tokenId token belonging to the AssetKidNft collection

    bool public COLLECTION_STATE; // is this collection verified by the gallery
    bool public COMMERCIALIZABLE; // whether this escrow is baseTier or maxQuant token or not available for support
    bool public SUPPORT_STATE; // Is creator seeking support
    uint256 public SUPPORT_PRICE;
    uint256 public SUPPORT_AMOUNT;

    mapping(address => uint256) public address2BiaOwed;
    mapping(address => uint256) public address2SftAmtOwed;

    struct Ask {
        address askerAddress;
        uint256 askPrice;
        uint256 askAmount; // total SFT locked
        bool active;
    }

    struct Bid {
        address bidderAddress;
        uint256 bidPrice; // amount of BIA bid
        uint256 bidAmount; // amount of SFT  // total BIA locked = bidPrice*bidAmount
        bool active;
    }

    modifier verifiedCollection() {
        if (!COLLECTION_STATE) {
            revert EscrowContract__ContractLocked();
        }
        _;
    }

    Bid[50] bid_array; //highest bid will be stored in the 49th place
    Ask[50] ask_array; //lowest ask
    uint256 immutable tokenId;
    bool immutable commercialTier;
    address CREATOR_ADDRESS;

    constructor(
        address _nftAddress,
        uint256 _nativeTokenId,
        bool _commercialTier
    ) {
        address collectionAddress = _nftAddress;
        AssetKidNFT nft_contract = AssetKidNFT(collectionAddress);
        nft_contract.setApproval4Gallery(); // when created, this contract will approve gallery to manage their tokens.
        tokenId = _nativeTokenId;
        commercialTier = _commercialTier;
        COMMERCIALIZABLE = _commercialTier ? true : false;
    }

    function commercialize(address creatorAddress, uint256 amount, uint256 price) public onlyOwner {
        if (!COMMERCIALIZABLE || amount * price < 5000) {
            // Make sure it is the commercial tier token of the collection and amount * price exceeds 5000 BIA.
            revert EscrowContract__CannotCommercialize();
        }

        SUPPORT_STATE = true;
        COMMERCIALIZABLE = false;
        SUPPORT_PRICE = price;
        // need to log creator address to support bia. 
        address2BiaOwed[creatorAddress] = amount * SUPPORT_PRICE;
        CREATOR_ADDRESS = creatorAddress;

    }

    function support(address supporterAddress, uint256 amount, bool cancel) // sftAmount that user supports
        public
        onlyOwner
    {
        if (!SUPPORT_STATE) {
            revert EscrowContract__CannotSupport();
        }
        cancel ? address2SftAmtOwed[supporterAddress] = 0 : address2SftAmtOwed[supporterAddress] = amount;
        cancel ? SUPPORT_AMOUNT -= amount : SUPPORT_AMOUNT += amount; // sft SUPPORT_AMOUNT increases by the user submitted amount
        address2BiaOwed[CREATOR_ADDRESS] = SUPPORT_AMOUNT * SUPPORT_PRICE; // amount submit by collector x price set by creator.
        
    }

    function recordBidAsk(
        address adr,
        uint256 price,
        uint256 amount,
        bool cancel,
        uint8 cancelIndex,
        bool bid
    )
        external
        onlyOwner
        verifiedCollection
        returns (
            bool _replacement,
            address _replacementAddress,
            uint256 _repleacementAmt
        )
    {
        if (cancel && bid) {
            bid_array[cancelIndex] = Bid(adr, price, amount, true);
            return (false, address(0), 0);
        }

        if (cancel && !bid) {
            ask_array[cancelIndex] = Ask(adr, price, amount, true);
            return (false, address(0), 0);
        }

        (
            uint8 index,
            bool foundPlace,
            bool replacement,
            address replace_address,
            uint256 replace_amt
        ) = bid ? findIndexForBid(adr, price) : findIndexForAsk(adr, price);

        // found lowest empty place in the array.
        if (foundPlace && !replacement) {
            if (bid) {
                bid_array[index] = Bid(adr, price, amount, true);
            } else {
                ask_array[index] = Ask(adr, price, amount, true);
            }

            return (false, replace_address, replace_amt);
        }
        // found lower bid to replace.
        else if (foundPlace && replacement) {
            if (bid) {
                bid_array[index] = Bid(adr, price, amount, true);
            } else {
                ask_array[index] = Ask(adr, price, amount, true);
            }
            return (true, replace_address, replace_amt);
        }
        // did not find lower bid or empty place.
        else {
            revert EscrowContract__ArrayFull();
        }
    }

    function check4Submission(address adr, bool bid) public view returns(bool proceed){
        // if bid or ask already exist, revert
        for (uint8 i=0; i<50;i++){
            if (bid && bid_array[i].bidderAddress == adr ){
                revert EscrowContract__AlreadySubmit();
            }
            else if  (!bid && ask_array[i].askerAddress == adr ) {revert EscrowContract__AlreadySubmit();}
        }

        return true;
    }

    function getContractStatus()
        public
        view
        returns (
            bool,
            bool,
            bool,
            uint256,
            uint256
        )
    {
        return (
            COLLECTION_STATE,
            COMMERCIALIZABLE,
            SUPPORT_STATE,
            SUPPORT_PRICE,
            SUPPORT_AMOUNT
        );
    }

    function getYourSupportInfo(address claimer) public view returns(uint256 biaSupported, uint256 sftOwed){
        return (address2BiaOwed[claimer], address2SftAmtOwed[claimer]);
    }

    function claimedSupport(address claimer) external onlyOwner {
        address2BiaOwed[claimer] = 0;
        address2SftAmtOwed[claimer] = 0;

    }

    // CALL THIS FUNCTION BEFORE RECORD BID/ RECORD ASk

    function findHighestBid()
        public
        view
        verifiedCollection
        returns (uint8 _index, bool _submissionExists)
    {
        uint256 highest_bid = 0;
        for (uint8 i; i < 50; i++) {
            if (bid_array[i].active && bid_array[i].bidPrice > highest_bid) {
                highest_bid = bid_array[i].bidPrice;
                _index = i;
                _submissionExists = true;
            }
        }

        return (_index, _submissionExists);
    }

    function findIndexForBid(address _address, uint256 _submittedBidPrice)
        internal
        view
        verifiedCollection
        returns (
            uint8 lowest_bid_index,
            bool found_lower_bid,
            bool bid_replacement,
            address replacement_address,
            uint256 bid_refund_amt
        )
    {
        /// this function is called to find the lowest bid offer and replacement index.

        uint256 lowest_bid_price = (2**256 - 1);

        for (uint8 i; i < 50; i++) {
            require(
                _address != bid_array[i].bidderAddress,
                "You have already submitted a bid for this token."
            );

            // If position is available, no need to replace.

            if (bid_array[i].active == false) {
                // if the position is available, no need to replace.
                lowest_bid_index = i;
                found_lower_bid = true;
                bid_replacement = false;
                replacement_address = address(0);
                return (
                    lowest_bid_index,
                    found_lower_bid,
                    bid_replacement,
                    replacement_address,
                    bid_refund_amt
                );
            } else if (
                bid_array[i].active && bid_array[i].bidPrice <= lowest_bid_price
            ) {
                lowest_bid_price = bid_array[i].bidPrice;
                lowest_bid_index = i;
            }
        }

        //

        if (_submittedBidPrice > bid_array[lowest_bid_index].bidPrice) {
            found_lower_bid = true;
            bid_replacement = true;
            bid_refund_amt =
                bid_array[lowest_bid_index].bidPrice *
                bid_array[lowest_bid_index].bidAmount;
            replacement_address = bid_array[lowest_bid_index].bidderAddress;
        } else {
            found_lower_bid = false;
            bid_replacement = false;
        }

        return (
            lowest_bid_index,
            found_lower_bid,
            bid_replacement,
            replacement_address,
            bid_refund_amt
        );
    }

    function findIndexForAsk(address adr, uint256 _submittedAskPrice)
        internal
        view
        verifiedCollection
        returns (
            uint8 highest_ask_index,
            bool found_higher_ask,
            bool ask_replacement,
            address replacement_address,
            uint256 ask_replacement_amt
        )
    {
        
        uint256 highest_ask_price = 0;

        for (uint8 i; i < 50; i++) {
            require(
                adr != ask_array[i].askerAddress,
                "You have already submitted a bid for this token."
            );

            if (ask_array[i].active == false) {
                // if the position is available, no need to replace.
                highest_ask_index = i;
                found_higher_ask = true;
                ask_replacement = false;
                replacement_address = address(0);
                return (
                    highest_ask_index,
                    found_higher_ask,
                    ask_replacement,
                    replacement_address,
                    ask_replacement_amt
                );
            } else if (
                ask_array[i].active &&
                ask_array[i].askPrice >= highest_ask_price
            ) {
                highest_ask_price = ask_array[i].askPrice;
                highest_ask_index = i;
            }
        }

        if (_submittedAskPrice < ask_array[highest_ask_index].askPrice) {
            found_higher_ask = true;
            ask_replacement = true;
            ask_replacement_amt = ask_array[highest_ask_index].askAmount;
            replacement_address = ask_array[highest_ask_index].askerAddress;
        } else {
            found_higher_ask = false;
            ask_replacement = false;
        }

        return (
            highest_ask_index,
            found_higher_ask,
            ask_replacement,
            replacement_address,
            ask_replacement_amt
        );
    }

    function findLowestAsk()
        public
        view
        verifiedCollection
        returns (uint8 _index, bool _submissionExists)
    {
        uint256 lowest_ask = (2**256 - 1);
        _submissionExists = false;
        _index = 0;

        for (uint8 i; i < 50; i++) {
            if (ask_array[i].active && ask_array[i].askPrice < lowest_ask) {
                lowest_ask = ask_array[i].askPrice;
                _index = i;
                _submissionExists = true;
            }
        }

        return (_index, _submissionExists);
    }

    //

    function reconcileAsk(uint256 _newAskAmt, uint8 _index)
        external
        onlyOwner
        verifiedCollection
    {
        if (_newAskAmt == 0) {
            ask_array[_index].active = false;
        } else (ask_array[_index].askAmount = _newAskAmt);
    }

    function reconcileBid(uint256 _newBidAmt, uint8 _index)
        external
        onlyOwner
        verifiedCollection
    {
        if (_newBidAmt == 0) {
            bid_array[_index].active = false;
        } else (bid_array[_index].bidAmount = _newBidAmt);
    }

    //
    function getAskArrayInfo(uint8 _index)
        public
        view
        verifiedCollection
        returns (
            address askerAddress,
            uint256 askPrice,
            uint256 askAmount,
            bool active
        )
    {
        askerAddress = ask_array[_index].askerAddress;
        askPrice = ask_array[_index].askPrice;
        askAmount = ask_array[_index].askAmount;
        active = ask_array[_index].active;
        return (askerAddress, askPrice, askAmount, active);
    }

    function getBidArrayInfo(uint8 _index)
        public
        view
        verifiedCollection
        returns (
            address bidderAddress,
            uint256 bidPrice,
            uint256 bidAmount,
            bool active
        )
    {
        bidderAddress = bid_array[_index].bidderAddress;
        bidPrice = bid_array[_index].bidPrice;
        bidAmount = bid_array[_index].bidAmount;
        active = bid_array[_index].active;
        return (bidderAddress, bidPrice, bidAmount, active);
    }

    function verifyCollection() external onlyOwner {
        COLLECTION_STATE = true;
        SUPPORT_STATE = false;
        COMMERCIALIZABLE = false;
    }
}
