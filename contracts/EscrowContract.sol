// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./AssetKidNFTUpgradeable.sol";

error EscrowContract__ArrayFull();
error EscrowContract__ContractLocked();
error EscrowContract__CannotCommercialize();
error EscrowContract__CannotSupport();
error EscrowContract__AlreadySubmit();

contract EscrowContract is ERC1155Holder, Ownable {
    // This contract will facillitate the trade of a specific tokenId token belonging to the AssetKidNft collection

    bool public COMMERCIALIZABLE; // whether this escrow is baseTier or maxQuant token or not available for support
    uint256 public SUPPORT_PRICE;
    uint256 public SUPPORT_AMOUNT;

    enum ContractState {
        UNVERIFIED, // when the contract is created
        SEEKING_SUPPORT,
        SUPPORT_CANCELLED, // when the creator cancel the support
        VERIFIED
    }

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
        if (contractState != ContractState.VERIFIED) {
            revert EscrowContract__ContractLocked();
        }
        _;
    }

    Bid[50] bid_array; //highest bid will be stored in the 49th place
    Ask[50] ask_array; //lowest ask
    uint256 immutable tokenId;
    address CREATOR_ADDRESS;

    ContractState contractState;

    constructor(
        address _nftAddress,
        address galleryAddress,
        uint256 _nativeTokenId,
        bool _commercialTier
    ) {
        address collectionAddress = _nftAddress;
        AssetKidNftUpgradeable nft_contract = AssetKidNftUpgradeable(collectionAddress);
        nft_contract.setApprovalForAll(galleryAddress, true); // when created, this contract will approve gallery to manage their tokens.
        tokenId = _nativeTokenId;
        COMMERCIALIZABLE = _commercialTier ? true : false;
        contractState = ContractState.UNVERIFIED;
    }

    function commercialize(
        address creatorAddress,
        uint256 amount,
        uint256 price,
        bool cancel
    ) public onlyOwner {
        if (
            (!COMMERCIALIZABLE && !cancel) || (amount * price < 5000 && !cancel)
        ) {
            // Make sure it is the commercial tier token of the collection and amount * price exceeds 5000 BIA.
            revert EscrowContract__CannotCommercialize();
        }

        contractState = cancel
            ? ContractState.SUPPORT_CANCELLED
            : ContractState.SEEKING_SUPPORT;
        COMMERCIALIZABLE = false;
        SUPPORT_PRICE = cancel ? SUPPORT_PRICE : price;
        // need to log creator address to support bia.
        address2BiaOwed[creatorAddress] = cancel ? 0 : amount * SUPPORT_PRICE;
        CREATOR_ADDRESS = creatorAddress;
    }

    function support(
        address supporterAddress,
        uint256 amount,
        bool cancel // sftAmount that user supports
    ) public onlyOwner {
        if (contractState != ContractState.SEEKING_SUPPORT) {
            revert EscrowContract__CannotSupport();
        }
        cancel
            ? address2SftAmtOwed[supporterAddress] = 0
            : address2SftAmtOwed[supporterAddress] = amount;
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
        ) = findIndex(adr, price, bid);

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

    function check4Submission(address adr, bool bid)
        public
        view
        returns (bool proceed)
    {
        // if bid or ask already exist, revert
        for (uint8 i = 0; i < 50; i++) {
            if (bid && bid_array[i].bidderAddress == adr) {
                revert EscrowContract__AlreadySubmit();
            } else if (!bid && ask_array[i].askerAddress == adr) {
                revert EscrowContract__AlreadySubmit();
            }
        }

        return true;
    }

    function getContractStatus()
        public
        view
        returns (
            uint8,
            bool,
            uint256,
            uint256
        )
    {
        return (
            uint8(contractState),
            COMMERCIALIZABLE,
            SUPPORT_PRICE,
            SUPPORT_AMOUNT
        );
    }

    function getYourSupportInfo(address claimer)
        public
        view
        returns (uint256 biaSupported, uint256 sftOwed)
    {
        return (address2BiaOwed[claimer], address2SftAmtOwed[claimer]);
    }

    function claimedSupport(address claimer) external onlyOwner {
        address2BiaOwed[claimer] = 0;
        address2SftAmtOwed[claimer] = 0;
    }

    // CALL THIS FUNCTION BEFORE RECORD BID/ RECORD ASk

    function findIndex(
        address adr,
        uint256 submitPrice,
        bool bid
    )
        internal
        view
        verifiedCollection
        returns (
            uint8 index,
            bool found,
            bool replacement,
            address replacement_address,
            uint256 refund_amt
        )
    {
        uint256 ref_price = bid ? (2**256 - 1) : 0;
        for (uint8 i; i < 50; i++) {
            require(
                adr !=
                    (
                        bid
                            ? bid_array[i].bidderAddress
                            : ask_array[i].askerAddress
                    ),
                "You have already submitted a offer for this token."
            );
            if (bid ? !bid_array[i].active : !ask_array[i].active) {
                index = i;
                found = true;
                replacement = false;
                replacement_address = address(0);

                return (
                    index,
                    found,
                    replacement,
                    replacement_address,
                    refund_amt
                );
            } else if (
                bid
                    ? (bid_array[i].active &&
                        bid_array[i].bidPrice <= ref_price)
                    : (ask_array[i].active &&
                        ask_array[i].askPrice >= ref_price)
            ) {
                ref_price = bid ? bid_array[i].bidPrice : ask_array[i].askPrice;
                index = i;
            }
        }
        if (
            (
                bid
                    ? (submitPrice > bid_array[index].bidPrice)
                    : (submitPrice < ask_array[index].askPrice)
            )
        ) {
            found = true;
            replacement = true;
            refund_amt = bid
                ? (bid_array[index].bidPrice * bid_array[index].bidAmount)
                : ask_array[index].askAmount;
            replacement_address = bid
                ? bid_array[index].bidderAddress
                : ask_array[index].askerAddress;
        } else {
            found = false;
            replacement = false;
        }

        return (index, found, replacement, replacement_address, refund_amt);
    }

    function findHighestBidLowestAsk(bool bid)
        public
        view
        verifiedCollection
        returns (uint8 _index, bool _submissionExists)
    {
        uint256 ref_price = bid ? 0 : (2**256 - 1);

        for (uint8 i; i < 50; i++) {
            if (
                bid
                    ? (bid_array[i].active && bid_array[i].bidPrice > ref_price)
                    : (ask_array[i].active && ask_array[i].askPrice < ref_price)
            ) {
                ref_price = bid ? bid_array[i].bidPrice : ask_array[i].askPrice;
                _index = i;
                _submissionExists = true;
            }
        }

        return (_index, _submissionExists);
    }

    function reconcileAmount(
        uint256 _newAmt,
        uint8 _index,
        bool bid
    ) external onlyOwner verifiedCollection {
        if (_newAmt == 0) {
            bid
                ? ask_array[_index].active = false
                : bid_array[_index].active = false;
        } else {
            bid
                ? ask_array[_index].askAmount = _newAmt
                : bid_array[_index].bidAmount = _newAmt;
        }
    }

    function getArrayInfo(uint8 _index, bool bid)
        public
        view
        verifiedCollection
        returns (
            address adr,
            uint256 price,
            uint256 amount,
            bool active
        )
    {
        adr = bid
            ? bid_array[_index].bidderAddress
            : ask_array[_index].askerAddress;
        price = bid ? bid_array[_index].bidPrice : ask_array[_index].askPrice;
        amount = bid
            ? bid_array[_index].bidAmount
            : ask_array[_index].askAmount;
        active = bid ? bid_array[_index].active : ask_array[_index].active;
        return (adr, price, amount, active);
    }

    function verifyCollection() external onlyOwner {
        contractState = ContractState.VERIFIED;
        COMMERCIALIZABLE = false;
    }
}
