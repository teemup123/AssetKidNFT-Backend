// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
// import "./GalleryContract.sol";

error AssetKidNft__NotAdmin();
error AssetKidNft__NotGalleryContract();

contract AssetKidNftUpgradeable is ERC1155BurnableUpgradeable {
    address public GALLERY_ADMIN_ADDRESS;
    address public GALLERY_PROXY_ADDRESS;
    address public GALLERY2_PROXY_ADDRESS;
    address public PROJECT_WALLET_ADDRESS;
    uint256 public BIA;
    uint256 public FriendsAndFam;
    string public BIA_URL;
    string public FFT_URL;

    modifier onlyGalleryAdmin() {
        if (msg.sender != GALLERY_ADMIN_ADDRESS) {
            revert AssetKidNft__NotAdmin();
        }
        _;
    }

    modifier onlyGallery() {
        if (msg.sender != GALLERY_PROXY_ADDRESS) {
            revert AssetKidNft__NotGalleryContract();
        }
        _;
    }

    modifier onlyGallery2() {
        if (msg.sender != GALLERY2_PROXY_ADDRESS) {
            revert AssetKidNft__NotGalleryContract();
        }
        _;
    }

    function initialize(
        // address _proxyGalleryContractAddress,
        // address _proxyGallery2ContractAddress,
        address _galleryAdminAddress,
        address _projectWalletAddress,
        uint256 _bia,
        uint256 _friendsAndFam
    ) public initializer {
        GALLERY_ADMIN_ADDRESS = _galleryAdminAddress;
        PROJECT_WALLET_ADDRESS = _projectWalletAddress;
        BIA = _bia;
        FriendsAndFam = _friendsAndFam;
        _mint(_projectWalletAddress, BIA, 10**9, ""); //mint 10^9 BIA to the gallery address
        _mint(_projectWalletAddress, FriendsAndFam, 50, ""); //mint 50 FF tokens to the gallery address
        setApprovalForAll(GALLERY_ADMIN_ADDRESS, true); // Approving Gallery Admin to manage
    }

    function burnAll(
        /// do you want to override this alltogether ?
        address account,
        uint256 id
    ) public onlyGallery2 {
        require(
            account == _msgSender() || isApprovedForAll(account, _msgSender()),
            "ERC1155: caller is not token owner nor approved"
        );

        uint256 value = balanceOf(account, id);

        _burn(account, id, value);
    }

    function mintToken(
        address _addressMintTo,
        uint256 _tokenId,
        uint16 _quantity
    ) external onlyGallery {
        // Called in createSimpleCollectable & createTierCollectable
        // CALLABLE ONLY BY GALLERY1 PROXY CONTRACT.
        _mint(_addressMintTo, _tokenId, _quantity, "");
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
    ) public onlyGallery {
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
                PROJECT_WALLET_ADDRESS,
                BIA,
                amount * (bidPrice - askPrice),
                ""
            );
        }
    }

    function collectGalleryFee(address user, uint256 txnAmt)
        public
        onlyGallery
    {
        //Check to see if 1%
        safeTransferFrom(
            user,
            PROJECT_WALLET_ADDRESS,
            BIA,
            (txnAmt > 100) ? (txnAmt / 100) : 1,
            ""
        );
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
        view
        override
        returns (string memory)
    {
        if (_tokenID == BIA) {
            return BIA_URL;
        } else if (_tokenID == FriendsAndFam){
            return FFT_URL;
        }
        string memory hexstringtokenID;
        hexstringtokenID = uint2hexstr(_tokenID);

        return
            string(
                abi.encodePacked(
                    "ipfs://f01701220",
                    hexstringtokenID,
                    "/metadata.json"
                )
            );
    }

    function setNewBiaMetaData(string memory new_uri) public onlyGalleryAdmin {
        BIA_URL = new_uri;
    }

    function setNewFftMetaData(string memory new_uri) public onlyGalleryAdmin {
        FFT_URL = new_uri;
    }

    function setGalleryAddress(address galleryProxyAddress)
        public
        onlyGalleryAdmin
    {
        GALLERY_PROXY_ADDRESS = galleryProxyAddress;
    }

    function setGallery2Address(address gallery2ProxyAddress)
        public
        onlyGallery
    {
        GALLERY2_PROXY_ADDRESS = gallery2ProxyAddress;
    }

    function getAdminAddress() public view returns (address) {
        return GALLERY_ADMIN_ADDRESS;
    }

    function transferAll(
        address from,
        address to,
        uint256 tokenId
    ) public onlyGallery {
        uint256 amount = balanceOf(from, tokenId);
        safeTransferFrom(from, to, tokenId, amount, "");
    }
}
