const { ethers, run, network } = require("hardhat")
const {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    BIA,
    FFT,
} = require("../helper-hardhat-config")


async function assetkidnft_info() {
    console.log("--------------AssetKidNft Contract-----------------")

    let AssetKidNftContract = await ethers.getContractFactory(
        "AssetKidNftUpgradeable"
    )
    // deploying assetKid Nft contract proxy

    let assetKidNftContract = AssetKidNftContract.attach(
        "0x47acEe75cE302ACdab8f4Db78835aA719D220bB4"
    )

    let gallery_admin_address =
        await assetKidNftContract.GALLERY_ADMIN_ADDRESS()
    let gallery_proxy_address =
        await assetKidNftContract.GALLERY_PROXY_ADDRESS()
    let gallery2_proxy_address =
        await assetKidNftContract.GALLERY2_PROXY_ADDRESS()
    let bia_wallet_address = await assetKidNftContract.PROJECT_WALLET_ADDRESS()
    let bia_hex_id = await assetKidNftContract.BIA()
    let fft_hex_id = await assetKidNftContract.FriendsAndFam()
    let bia_url = await assetKidNftContract.BIA_URL()
    let fft_url = await assetKidNftContract.FFT_URL()

    console.log(`Gallery Admin's Address: ${gallery_admin_address}`)
    console.log(`Gallery Proxy Address: ${gallery_proxy_address}`)
    console.log(`Gallery2 Proxy Address: ${gallery2_proxy_address}`)
    console.log(`Bia Wallet Address: ${bia_wallet_address}`)
    console.log(`BIA hex Id: ${bia_hex_id}`)
    console.log(`fft hex Id: ${fft_hex_id}`)
    console.log(`BIA url: ${bia_url}`)
    console.log(`fft url: ${fft_url}`)
}

async function updateBiaFftMetaData(BIA_ipfs_url, fft_ipfs_url){
    //"ipfs://f01701220B130F89938255007645FCA0397717C42DDA5D6FB544AE2028A106BC0E0BBA8E7/metadata.json"
    //"ipfs://f01701220204E2560E88F1D0A68FD87AD260C282B9AD7480D8DC1158C830F3B87CF1B404D/metadata.json"

    ;[owner, galleryAdmin] = await ethers.getSigners()

    let AssetKidNftContract = await ethers.getContractFactory(
        "AssetKidNftUpgradeable"
    )
    // deploying assetKid Nft contract proxy

    let assetKidNftContract = AssetKidNftContract.attach(
        "0x47acEe75cE302ACdab8f4Db78835aA719D220bB4"
    )

    await assetKidNftContract.deployTransaction.wait(6)
    
    await assetKidNftContract.connect(galleryAdmin).setNewBiaMetaData(BIA_ipfs_url)
    await assetKidNftContract.connect(galleryAdmin).setNewFftMetaData(fft_ipfs_url)

}

async function main() {

    let AssetKidNftContract = await ethers.getContractFactory(
        "AssetKidNftUpgradeable"
    )
    let assetKidNftContract = AssetKidNftContract.attach(
        "0x47acEe75cE302ACdab8f4Db78835aA719D220bB4"
    )

    let uri_read = await assetKidNftContract.uri("80145898622226195175804391155189164984685302253777533687561405889480549443815")
    console.log(uri_read)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
