// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../EscrowContract.sol";

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
}
