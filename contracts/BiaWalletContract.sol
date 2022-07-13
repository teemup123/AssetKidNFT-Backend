// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";

error BiaWalletContract__CannotLowLevelCallNftContract();
error BiaWalletContract__NotAdmin();

contract BiaWalletContract is ERC1155HolderUpgradeable {
    uint256 BIA;
    uint256 FFT;
    address ASSET_KID_NFT_ADDRESS;
    address GALLERY_ADMIN_ADDRESS;

    modifier onlyGalleryAdmin() {
        if (msg.sender != GALLERY_ADMIN_ADDRESS) {
            revert BiaWalletContract__NotAdmin();
        }
        _;
    }

    function __init__BiaWalletContract(
        address _galleryAdminAddress,
        uint256 bia, 
        uint256 fft
    ) public {
        BIA = bia;
        GALLERY_ADMIN_ADDRESS = _galleryAdminAddress;
        FFT = fft;
    }

    function setNftContractAddress(address adr) public onlyGalleryAdmin {
        ASSET_KID_NFT_ADDRESS = adr;
    }

    function fundAddress(
        //SMT WRONG HERE. Gallery admin is not approved to manage Creator's Bia ?
        address adr,
        uint256 amount
    ) public {
        nftSafeTransfer(address(this), adr, BIA, amount);
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
            revert BiaWalletContract__CannotLowLevelCallNftContract();
        }
    }
}
