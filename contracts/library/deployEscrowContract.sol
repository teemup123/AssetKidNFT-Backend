// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../EscrowContract.sol";
import "../GalleryContract.sol";

library DeployEscrowContract {
    function deployContract(
        address nftAddress,
        uint256 tokenIdCounter,
        bool commercialTier
    ) public returns (address contractDeployedAddress) {
        EscrowContract contractDeployed = new EscrowContract(
            nftAddress,
            tokenIdCounter,
            commercialTier
        );
        return (address(contractDeployed));
    }

    // PARAMETERIZE THESE THREE FUNCTION AND MAKE SURE THE VARIABLES ALIGN
    function getCounterPartyInfo(bool bid, address escrowAddress)
        public
        view
        returns (
            uint8 counterIndex,
            address counterAddress,
            uint256 counterPrice,
            uint256 counterAmount,
            bool counterFound
        )
    {
        EscrowContract escrowContract = EscrowContract(escrowAddress);

        (counterIndex, counterFound) = escrowContract.findHighestBidLowestAsk(
            bid ? false : true
        );
        if (counterFound) {
            (counterAddress, counterPrice, counterAmount, ) = escrowContract
                .getArrayInfo(counterIndex, bid ? false : true);
        }

        return (
            counterIndex,
            counterAddress,
            counterPrice,
            counterAmount,
            counterFound
        );
    }

    function getExchangeRate(
        uint256 _tokenIdSubmit,
        uint256 _tokenIdExchange,
        address galleryContractAddress
    ) public view returns (uint16 submitToExchange, uint16 exchangeToSubmit) {
        
        GalleryContract galleryContract = GalleryContract(
            galleryContractAddress
        );

        (
            uint256 submittedCollectionId,
            uint16 submittedPercent,
            ,
            ,
            ,

        ) = galleryContract.getTokenInfo(_tokenIdSubmit);
        (
            uint256 exchangedCollectionId,
            uint16 exchangedPercent,
            ,
            ,
            ,

        ) = galleryContract.getTokenInfo(_tokenIdExchange);

        require(
            submittedCollectionId == exchangedCollectionId,
            "Different Collection"
        );

        if (_tokenIdSubmit < _tokenIdExchange) {
            //Exchange up

            submitToExchange = exchangedPercent / submittedPercent;
            exchangeToSubmit = 1;
        } else if (_tokenIdSubmit > _tokenIdExchange) {
            //Exchange down

            exchangeToSubmit = submittedPercent / exchangedPercent;
            submitToExchange = 1;
        }

        return ((submitToExchange, exchangeToSubmit));
    }

    function getOtherTokenInCollection(
        uint256 mappedCollectionId,
        uint256 _tokenId,
        uint256 token_Id_counter,
        address galleryContractAddress
    ) public view returns (uint256[10] memory otherTokenIds) {
        GalleryContract galleryContract = GalleryContract(
            galleryContractAddress
        );
        // Both create token functions create token consecutively -> query
        uint8 indexReturn;
        uint256 guessedTokenId;
        for (int256 i = -10; i < 10; i++) {
            if ((int256(_tokenId) + i) < 0) {
                // if any calculated tokenId <0; just ignore it.
                continue;
            }
            guessedTokenId = uint256(int256(_tokenId) + i);

            if (guessedTokenId >= token_Id_counter) {
                break;
            }

            (uint256 guessCollectionId, , , , , ) = galleryContract
                .getTokenInfo(uint256(guessedTokenId));

            // tokenId + 1 does not exist -> revert

            if (guessCollectionId == mappedCollectionId) {
                otherTokenIds[indexReturn] = guessedTokenId;
                indexReturn += 1;
            }
        }

        return (otherTokenIds);
    }

    function claimSftHelper(uint256 tokenId, address galleryContractAddress, address sender)
        public
        returns (
            uint8 collectionState,
            uint256 collectionPrice,
            uint256 sftOwed, 
            address escrowAddress
        )
    {
        GalleryContract galleryContract = GalleryContract(
            galleryContractAddress
        );
        EscrowContract escrow_contract = galleryContract.getEscrowContract(tokenId);
        escrowAddress = address(escrow_contract);
        (collectionState, , collectionPrice, ) = escrow_contract
            .getContractStatus();

        // collection state 3 = verified : collector calling will be transferred sft
        // colelction state 2 = SUPPORT-Cancelled : collector calling will be refunded NFT that is owed
        if (collectionState == 0 || collectionState == 1) {
            revert GalleryContract__CollectionIdNotApproved();
        }
        
        (, sftOwed) = escrow_contract.getYourSupportInfo(sender);

        if (sftOwed == 0){
            revert GalleryContract__NotCollector();
        }

        escrow_contract.claimedSupport(sender);

        return (collectionState, collectionPrice, sftOwed, escrowAddress);
    }
}
