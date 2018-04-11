const Minter = artifacts.require('Minter');
const Swapper = artifacts.require('Swapper');
const Trader = artifacts.require('Trader');
const NFTokenTransferProxy = artifacts.require('NFTokenTransferProxy');
const TokenTransferProxy = artifacts.require('TokenTransferProxy');
const XcertMintProxy = artifacts.require('XcertMintProxy');
const Xct = artifacts.require('Xct');

var token;
var tokenProxy;
var nfTokenProxy;
var mintProxy;

var minter;
var swapper;
var trader;

module.exports = function(deployer) {
  deployer.then(async () => {
    token = await Xct.deployed();
    nfTokenProxy = await NFTokenTransferProxy.new();
    tokenProxy = await TokenTransferProxy.new();
    mintProxy = await XcertMintProxy.new();

    trader = await Trader.new(token.address, tokenProxy.address, nfTokenProxy.address);
    await tokenProxy.addAuthorizedAddress(trader.address);
    await nfTokenProxy.addAuthorizedAddress(trader.address);

    minter = await Minter.new(token.address, tokenProxy.address, mintProxy.address);
    await tokenProxy.addAuthorizedAddress(minter.address);
    await mintProxy.addAuthorizedAddress(minter.address);

    swapper = await Swapper.new(token.address, tokenProxy.address, nfTokenProxy.address);
    await tokenProxy.addAuthorizedAddress(swapper.address);
    await nfTokenProxy.addAuthorizedAddress(swapper.address);
  });
};

