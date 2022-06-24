// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./GalleryContract.sol";

contract AssetKidNFT is ERC1155, Ownable, ReentrancyGuard {
    address gallery_contract_address;
    uint256 public constant BIA = 0;
    uint256 public constant FriendsAndFam = 1;

    constructor(address _galleryAddress) ERC1155("") ReentrancyGuard() {
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
                gallery_contract_address,
                BIA,
                amount * (bidPrice - askPrice),
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
}
