// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./AssetKidNFT.sol";

contract AssemblerContract is ERC1155Holder, Ownable {
    // This contract will simply hold the ERC1155 token minted as tier collectable.

    constructor(address _nftAddress) {
        address collectionAddress = _nftAddress;

        AssetKidNFT nft_contract = AssetKidNFT(collectionAddress);
        nft_contract.setApproval4Gallery(); //when created, this contract will approve gallery to manage their tokens.
    }
}
