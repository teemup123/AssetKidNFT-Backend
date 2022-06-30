// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./GalleryContract.sol";
import "./EscrowContract.sol";
import "./AssetKidNFT.sol";

error GalleryContract2__NotCreator();
error GalleryContract2__CollectionIdAlreadyApproved();
error GalleryContract2__SubmissionError();

import "./library/deployEscrowContract.sol";

contract GalleryContract2 {
    address public immutable GALLERY_CONTRACT_ADDRESS;
    address public immutable NFT_CONTRACT_ADDRESS;
    AssetKidNFT public immutable NFT_CONTRACT;
    GalleryContract public immutable galleryContract;

    constructor(address galleryContractAddress, address assetKidNftAddress) {
        GALLERY_CONTRACT_ADDRESS = galleryContractAddress;
        galleryContract = GalleryContract(galleryContractAddress);
        NFT_CONTRACT_ADDRESS = assetKidNftAddress;
        NFT_CONTRACT = AssetKidNFT(assetKidNftAddress);
    }

    function burnCollection(uint256 tokenId) public {
        // Get token info
        (
            uint256 collectionId,
            ,
            address escrowContractAddress,
            ,
            ,
            address creatorAddress
        ) = galleryContract.getTokenInfo(tokenId);

        // Getting Escrow Contract from token info
        EscrowContract escrowContract = EscrowContract(escrowContractAddress);
        (uint8 contractState, , , ) = escrowContract.getContractStatus();

        burnCollectionFilter(msg.sender, creatorAddress, contractState);

        burnOtherTokensInCollection(tokenId);
        burnCommercialToken(tokenId);
        galleryContract.burnCollectionId(collectionId); // call to remap other collectionIdExist

    }

    function burnCollectionFilter(
        address sender,
        address creatorAddress,
        uint8 contractState
    ) internal pure {
        // Check if creator - token info
        if (sender != creatorAddress) {
            revert GalleryContract2__NotCreator();
        }

        // Checking for verified
        if (contractState == 3) {
            revert GalleryContract2__CollectionIdAlreadyApproved();
        }
    }

    function burnOtherTokensInCollection(uint256 tokenId) internal {
        // get other token info
        (uint256 collectionId, , , , uint8 collectionType, ) = galleryContract
            .getTokenInfo(tokenId);

        uint256[10] memory otherTokeIds = DeployEscrowContract
            .getOtherTokenInCollection(
                collectionId,
                tokenId,
                galleryContract.getTokenIdCounter(),
                address(this)
            );
        // taking out tokenId existence
        for (uint8 i; i < 10; i++) {
            galleryContract.burnTokenId(otherTokeIds[i]);
            //tokenIdExist[otherTokeIds[i]] = false; // has to be done regardless of simple or tier
            // burn all token in collection for simple collectable
            uint256 hexId = galleryContract.getHexId(otherTokeIds[i]);
            if (
                collectionType == 1 //SIMPLE COLLECTABLE
            ) {
                NFT_CONTRACT.burn(
                    msg.sender,
                    hexId,
                    NFT_CONTRACT.balanceOf(msg.sender, hexId)
                );
            }
        }
    }

    function burnCommercialToken(uint256 tokenId) internal {
        (
            ,
            ,
            address escrowContractAddress,
            ,
            uint8 collectionType,
            
        ) = galleryContract.getTokenInfo(tokenId);

        // Getting Escrow Contract from token info
        EscrowContract escrowContract = EscrowContract(escrowContractAddress);

        (, bool commercializable, , ) = escrowContract.getContractStatus();
        if (collectionType == 2 && commercializable) {
            // and commercial token

            NFT_CONTRACT.burn(
                msg.sender,
                galleryContract.getHexId(tokenId),
                NFT_CONTRACT.balanceOf(
                    msg.sender,
                    galleryContract.getHexId(tokenId)
                )
            ); // if collection not verified, assembly cannot exchange token !
        } else if (collectionType == 2) {
            revert GalleryContract2__SubmissionError();
        }
    }
}
