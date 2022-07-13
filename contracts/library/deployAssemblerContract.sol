// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../AssemblerContract.sol";

library DeployAssemblerContract {

    function deployContract(address nftAddress, address galleryAddress) public returns(address contractDeployedAddress){

        AssemblerContract contractDeployed = new AssemblerContract(nftAddress, galleryAddress);
        return ( address(contractDeployed) );
    }

}