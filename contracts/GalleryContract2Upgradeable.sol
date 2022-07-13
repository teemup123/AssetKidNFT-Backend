// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./GalleryContractUpgradeable.sol";
import "./EscrowContract.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";

// or low level call these

error GalleryContract2__NotCreator();
error GalleryContract2__CollectionIdAlreadyApproved();
error GalleryContract2__SubmissionError();
error GalleryContract2__CannotLowLevelCallNftContract();

import "./library/deployEscrowContract.sol";

contract GalleryContract2Upgradeable is ERC1155HolderUpgradeable {
    address public GALLERY_CONTRACT_ADDRESS;
    address public ASSET_KID_NFT_ADDRESS;

    GalleryContractUpgradeable public galleryContract;

    function initialize(
        address galleryContractAddress,
        address assetKidNftAddress
    ) public initializer {
        GALLERY_CONTRACT_ADDRESS = galleryContractAddress;
        galleryContract = GalleryContractUpgradeable(galleryContractAddress);
        ASSET_KID_NFT_ADDRESS = assetKidNftAddress; // convert to low level call instead
    }

    function burnCollection(uint256 tokenId) public {
        // Get token info
        (
            uint256 collectionId,
            ,
            address escrowContractAddress,
            ,
            uint8 collectionType,
            address creatorAddress
        ) = galleryContract.getTokenInfo(tokenId);

        // Getting Escrow Contract from token info
        EscrowContract escrowContract = EscrowContract(escrowContractAddress);
        (uint8 contractState, , , ) = escrowContract.getContractStatus();

        burnCollectionFilter(msg.sender, creatorAddress, contractState);
        if (collectionType == 1) {
            burnSimpleCollectable(tokenId, msg.sender);
            galleryContract.burnCollectionId(collectionId);
            return;
        } else if (collectionType == 2) {
            burnTierCollectable(tokenId, msg.sender);
            galleryContract.burnCollectionId(collectionId);
            return;
        } else {
            revert GalleryContract2__SubmissionError();
        }
        // call to remap other collectionIdExist
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

    function burnSimpleCollectable(uint256 tokenId, address sender) internal {
        // get other token info
        (uint256 collectionId, , , , uint8 collectionType, ) = galleryContract
            .getTokenInfo(tokenId);

        uint256[10] memory otherTokeIds = DeployEscrowContract
            .getOtherTokenInCollection(
                collectionId,
                tokenId,
                galleryContract.getTokenIdCounter(),
                GALLERY_CONTRACT_ADDRESS
            );
        // taking out tokenId existence
        for (uint8 i; i < 10; i++) {
            //tokenIdExist[otherTokeIds[i]] = false; // has to be done regardless of simple or tier
            // burn all token in collection for simple collectable
            uint256 hexId = galleryContract.getHexId(otherTokeIds[i]);
            if (
                collectionType == 1 //SIMPLE COLLECTABLE
            ) {
                galleryContract.burnTokenId(otherTokeIds[i]);
                nftBurn(sender, hexId);
            }
        }
    }

    function burnTierCollectable(uint256 tokenId, address sender) internal {
        (, , address escrowContractAddress, , , ) = galleryContract
            .getTokenInfo(tokenId);

        // Getting Escrow Contract from token info
        EscrowContract escrowContract = EscrowContract(escrowContractAddress);
        (, bool commercializable, , ) = escrowContract.getContractStatus();
        if (commercializable) {
            // and commercial token
            galleryContract.burnTokenId(tokenId);
            uint256 hexId = galleryContract.getHexId(tokenId);
            nftBurn(sender, hexId);
        } else {
            revert GalleryContract2__SubmissionError();
        }
    }

    function nftBurn(address account, uint256 tokenId) internal {
        (bool success, ) = ASSET_KID_NFT_ADDRESS.call(
            abi.encodeWithSignature(
                "burnAll(address,uint256)",
                account,
                tokenId
            )
        );
        if (!success) {
            revert GalleryContract2__CannotLowLevelCallNftContract();
        }
    }
}
