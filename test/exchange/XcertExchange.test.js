const XcertExchange = artifacts.require('XcertExchange');
const XcertProxy = artifacts.require('XcertProxy');
const TokenTransferProxy = artifacts.require('TokenTransferProxy');
const Xct = artifacts.require('Xct');
const util = require('ethjs-util');
const web3Util = require('web3-utils');
const assertRevert = require('../helpers/assertRevert');

contract('XcertExchange', (accounts) => {
  let exchange;
  let xcertProxy;
  let tokenProxy;
  let token;

  beforeEach(async () => {
    xcertProxy = await XcertProxy.new();
    tokenProxy = await TokenTransferProxy.new();
    token = await Xct.new();

    exchange = await XcertExchange.new(token.address, tokenProxy.address, xcertProxy.address);
    xcertProxy.addAuthorizedAddress(exchange.address);
    tokenProxy.addAuthorizedAddress(exchange.address);
  });

  describe('hashing', function () {
    var testArrayAccount = [accounts[3],accounts[5]];
    var testArrayAmount = [1,10];
    it('compares the same local and contract hash', async () => {
      var contractHash = await exchange.getTransferDataHash(accounts[0], accounts[1], accounts[2], 1, testArrayAccount, testArrayAmount, 123);
      var localHash = web3Util.soliditySha3(exchange.address,accounts[0], accounts[1], accounts[2], 1, {t: 'address[]', v:testArrayAccount}, {t: 'uint256[]', v:testArrayAmount}, 123);
      assert.equal(contractHash, localHash);
    });

    it('compares the different local and contract hash', async () => {
      var contractHash = await exchange.getTransferDataHash(accounts[0], accounts[1], accounts[2], 1, testArrayAccount, testArrayAmount, 123);
      var localHash = web3Util.soliditySha3(exchange.address,accounts[0], accounts[1], accounts[2], 1, {t: 'address[]', v:testArrayAccount}, {t: 'uint256[]', v:testArrayAmount}, 124);
      assert.notEqual(contractHash, localHash);
    });
  });

  describe('signature', function () {
    var testArray = [1,2];
    var hash;
    var r;
    var s;
    var v;

    beforeEach(async () => {
      hash = await exchange.getTransferDataHash(accounts[0], accounts[1], accounts[2], 1, testArray, testArray, 123);
      var signature = web3.eth.sign(accounts[0], hash);

      r = signature.substr(0, 66);
      s = '0x' + signature.substr(66, 64);
      v = parseInt('0x' + signature.substr(130, 2)) + 27;
    });

    it('correctly validates correct signer', async () => {
      var valid = await exchange.isValidSignature(accounts[0],hash,v,r,s);
      assert.equal(valid, true);
    });

    it('correctly validates wrong signer', async () => {
      var valid = await exchange.isValidSignature(accounts[1],hash,v,r,s);
      assert.equal(valid, false);
    });

    it('correctly validates wrong signature data', async () => {
      var valid = await exchange.isValidSignature(accounts[0],hash,1,2,3);
      assert.equal(valid, false);
    });

    it('correctly validates signature data from another accout', async () => {
      var signature = web3.eth.sign(accounts[1], hash);

      r = signature.substr(0, 66);
      s = '0x' + signature.substr(66, 64);
      v = parseInt('0x' + signature.substr(130, 2)) + 27;

      var valid = await exchange.isValidSignature(accounts[0],hash,v,r,s);
      assert.equal(valid, false);

      var valid = await exchange.isValidSignature(accounts[1],hash,v,r,s);
      assert.equal(valid, true);
    });
  });

});
