// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./GalleryContract.sol";

contract AssetKidNFT is ERC1155, Ownable, ReentrancyGuard {
    address gallery_contract_address;
    uint256 public constant BIA = 0x9be311107159657ffe70682e3b33dcaf994ed60bb0afd954dbdd8afa12f139e5; // put the IPFS for the meta data file here
    uint256 public constant FriendsAndFam = 1; 

    constructor(address _galleryAddress) ERC1155("ipfs://f0{id}") ReentrancyGuard() {
        gallery_contract_address = _galleryAddress; //specify for approveforall function
        _mint(gallery_contract_address, BIA, 10**9, ""); //mint 10^9 BIA to the gallery address
        _mint(gallery_contract_address, FriendsAndFam, 50, ""); //mint 50 FF tokens to the gallery address
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
            gallery_contract_address
        );
        gallery_contract.setApprovalForTrading(msg.sender);
        setApprovalForAll(gallery_contract_address, true);
    }

    function mutualEscrowTransfer(
        address bidderAddress,
        address askerAddress,
        uint256 _tokenId,
        uint256 _tokenAmt,
        uint256 _askPrice,
        uint256 _bidPrice,
        bool bid,
        address escrow_address
    ) public onlyOwner {
        
        // This function pays the record side
        // bid ?    bidder transfer BIA to asker @ _tokenAmt * _askPrice
        //          asker trasnfer SFT to bidder @ _tokenAmt
        safeTransferFrom(
            bid ? bidderAddress : askerAddress, // from bidder ->asker
            bid ? askerAddress : bidderAddress,
            bid ? 0 : _tokenId,
            bid ? _tokenAmt * _askPrice : _tokenAmt,
            ""
        );


        // bid? transfer SFT from escrow to bidder : transfer BIA from escrow to asker
        // this functions pays the escrow side (bid or ask)
        // bid ?    escrow transfer SFT to bidder @ _tokenAmt
        //          escrow transfer BIA to asker @ _tokenAmt * _askPrice
        safeTransferFrom(
            escrow_address,
            bid ? bidderAddress : askerAddress,
            bid ? _tokenId : 0,
            bid ? _tokenAmt : _tokenAmt * _askPrice,
            ""
        );

        // If price is different, gallery contract does abitrage
        // bid ?    bidder transfer BIA to gallery @  _tokenAmt * (_bidPrice - _askPrice)
        //          escrow transfer BIA to gallery @ _tokenAmt * (_bidPrice - _askPrice)
        if (_askPrice < _bidPrice) {
            safeTransferFrom(
                bid ? bidderAddress : escrow_address,
                gallery_contract_address,
                0,
                _tokenAmt * (_bidPrice - _askPrice),
                ""
            );
        }
    }

    function assetToEscrowTransfer(
        address _from,
        uint256 _tokenId,
        uint256 _tokenAmt,
        uint256 _tokenPrice,
        bool edit,
        bool bid,
        address escrow_contract,
        bool replacement,
        address replacement_address,
        uint256 replacementAmt
    ) internal {
        //transfer BIA/SFT to escrow contract.!!!
        if (!edit) {
            safeTransferFrom(
                _from,
                address(escrow_contract),
                bid ? 0 : _tokenId,
                bid ? _tokenAmt * _tokenPrice : _tokenAmt,
                ""
            );
        }

        if (replacement) {
            // refunding the lowest bidder
            safeTransferFrom(
                address(escrow_contract),
                replacement_address,
                bid ? 0 : _tokenId,
                replacementAmt,
                ""
            );
        }
    }

    function uint2hexstr(uint256 i) public pure returns (string memory) {
        if (i == 0) return "0";
        uint j = i;
        uint length;
        while (j != 0) {
            length++;
            j = j >> 4;
        }
        uint mask = 15;
        bytes memory bstr = new bytes(length);
        uint k = length;
        while (i != 0) {
            uint curr = (i & mask);
            bstr[--k] = curr > 9 ?
                bytes1(uint8(55 + curr)) :
                bytes1(uint8(48 + curr)); // 55 = 65 - 10
            i = i >> 4;
        }
        return string(bstr);
    }
    
    function uri(uint256 _tokenID) override public pure returns (string memory) {
    
       string memory hexstringtokenID;
         hexstringtokenID = uint2hexstr(_tokenID);
    
    return string(
        abi.encodePacked(
        "ipfs://f01701220",
        hexstringtokenID)
        );
    }
}
