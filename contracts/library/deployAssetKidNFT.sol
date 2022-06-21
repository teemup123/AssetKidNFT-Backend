// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../AssetKidNFT.sol";

library DeployAssetKidNFT {

    function deployContract(address deployerAddress) public returns(address contractDeployedAddress){

        AssetKidNFT contractDeployed = new AssetKidNFT(deployerAddress);
        return ( address(contractDeployed) );
    }

}