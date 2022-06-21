async function deployLib() {
    const AssemblerLib = await ethers.getContractFactory(
        "DeployAssemblerContract"
    )
    const assemblerLibContract = await AssemblerLib.deploy()
    await assemblerLibContract.deployed()

    const AssetKidNFTLib = await ethers.getContractFactory("DeployAssetKidNFT")
    const assetKidNFTLib = await AssetKidNFTLib.deploy()
    await assetKidNFTLib.deployed()

    const EscrowContractLib = await ethers.getContractFactory(
        "DeployEscrowContract"
    )
    const escrowLib = await EscrowContractLib.deploy()
    await escrowLib.deployed()

    return { assemblerLibContract, assetKidNFTLib, escrowLib }
}

module.exports = { deployLib }

