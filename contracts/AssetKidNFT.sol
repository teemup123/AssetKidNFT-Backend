// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./GalleryContract.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";

contract AssetKidNFT is ERC1155, ERC1155Burnable, Ownable, ReentrancyGuard {
    address GALLERY_CONTRACT_ADDRESS;
    uint256 public constant BIA =
        0x9be311107159657ffe70682e3b33dcaf994ed60bb0afd954dbdd8afa12f139e5;
    uint256 public constant FriendsAndFam =
        0x204e2560e88f1d0a68fd87ad260c282b9ad7480d8dc1158c830f3b87cf1b404d;
    address GALLERY_2_ADDRESS;

    constructor(address _galleryAddress) ERC1155("") ReentrancyGuard() {
        GALLERY_CONTRACT_ADDRESS = _galleryAddress; //specify for approveforall function
        _mint(_galleryAddress, BIA, 10**9, ""); //mint 10^9 BIA to the gallery address
        _mint(_galleryAddress, FriendsAndFam, 50, ""); //mint 50 FF tokens to the gallery address
    }

    // minting function that transfer token to creator's wallet address
    // minting function will set gallery contract as the operator of that wallet's token
    // gas managed in the gallery contractss

    function mintToken(
        address _addressMintTo,
        uint256 _tokenId,
        uint16 _quantity
    ) external onlyOwner {
        _mint(_addressMintTo, _tokenId, _quantity, "");
    }

    function setApproval4Gallery() public nonReentrant {
        // this function will approve the gallery contract to manage their NFTs for trading.
        // this function will also approve the escrow as well as the assembler contract to function.
        // any transfer will be handle by the GalleryContract,
        // escrow and assembler function will call this function to approve gallery to transfer token on thier behalf.
        // this should be prompted when user connect their wallet to gallery. Web3 stuff probably.

        GalleryContract gallery_contract = GalleryContract(
            GALLERY_CONTRACT_ADDRESS
        );
        gallery_contract.setApprovalForTrading(msg.sender);
        setApprovalForAll(GALLERY_CONTRACT_ADDRESS, true);
    }

    function setApproval4Gallery2() public nonReentrant {
        // this function will approve the gallery contract to manage their NFTs for trading.
        // this function will also approve the escrow as well as the assembler contract to function.
        // any transfer will be handle by the GalleryContract,
        // escrow and assembler function will call this function to approve gallery to transfer token on thier behalf.
        // this should be prompted when user connect their wallet to gallery. Web3 stuff probably.
        setApprovalForAll(GALLERY_2_ADDRESS, true);
    }

    function mutualEscrowTransfer(
        address sender,
        address counterParty,
        uint256 tokenId,
        uint256 amount,
        uint256 askPrice,
        uint256 bidPrice,
        bool bid,
        address escrow_address
    ) public onlyOwner {
        // This function pays the record side
        // bid ?    bidder transfer BIA to asker @ _tokenAmt * _askPrice
        //          asker trasnfer SFT to bidder @ _tokenAmt
        // Transfer from sender to counter party.
        // bid ?    sender:bidder ; counterParty:asker
        //          sender:asker ; counterParty:bidder
        safeTransferFrom(
            sender,
            counterParty,
            bid ? BIA : tokenId,
            bid ? amount * askPrice : amount,
            ""
        );

        collectGalleryFee(sender, bid ? amount * askPrice : amount); // fee collected on sender, whether bid or ask.

        // bid? transfer SFT from escrow to bidder : transfer BIA from escrow to asker
        // this functions pays the escrow side (bid or ask)
        // bid ?    escrow transfer SFT to bidder @ _tokenAmt
        //          escrow transfer BIA to asker @ _tokenAmt * _askPrice
        // Transfer from escrow to sender.
        safeTransferFrom(
            escrow_address,
            sender,
            bid ? tokenId : BIA,
            bid ? amount : amount * askPrice,
            ""
        );

        // If price is different, gallery contract does abitrage
        // bid ?    bidder transfer BIA to gallery @  _tokenAmt * (_bidPrice - _askPrice)
        //          escrow transfer BIA to gallery @ _tokenAmt * (_bidPrice - _askPrice)
        if (askPrice < bidPrice) {
            safeTransferFrom(
                bid ? sender : escrow_address,
                GALLERY_CONTRACT_ADDRESS,
                BIA,
                amount * (bidPrice - askPrice),
                ""
            );
        }
    }

    function uint2hexstr(uint256 i) public pure returns (string memory) {
        if (i == 0) return "0";
        uint256 j = i;
        uint256 length;
        while (j != 0) {
            length++;
            j = j >> 4;
        }
        uint256 mask = 15;
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (i != 0) {
            uint256 curr = (i & mask);
            bstr[--k] = curr > 9
                ? bytes1(uint8(55 + curr))
                : bytes1(uint8(48 + curr)); // 55 = 65 - 10
            i = i >> 4;
        }
        return string(bstr);
    }

    function uri(uint256 _tokenID)
        public
        pure
        override
        returns (string memory)
    {
        string memory hexstringtokenID;
        hexstringtokenID = uint2hexstr(_tokenID);

        return string(abi.encodePacked("ipfs://f01701220", hexstringtokenID));
    }

    function setGallery2Address(address gallery2Address) public onlyOwner {
        GALLERY_2_ADDRESS = gallery2Address;
    }

    function collectGalleryFee(address user, uint256 txnAmt) public onlyOwner {
        //Check to see if 1%
        safeTransferFrom(
            user,
            GALLERY_CONTRACT_ADDRESS,
            BIA,
            (txnAmt > 100) ? (txnAmt / 100) : 1,
            ""
        );
    }
}
