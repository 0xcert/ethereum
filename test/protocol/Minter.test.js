const Minter = artifacts.require('Minter');
const NFTokenTransferProxy = artifacts.require('NFTokenTransferProxy');
const TokenTransferProxy = artifacts.require('TokenTransferProxy');
const XcertMintProxy = artifacts.require('XcertMintProxy');
const Xcert = artifacts.require('Xcert');
const Xct = artifacts.require('Xct');
const util = require('ethjs-util');
const web3Util = require('web3-utils');
const assertRevert = require('../helpers/assertRevert');

contract('Minter', (accounts) => {
  let minter;
  let tokenProxy;
  let mintProxy;
  let token;
  let xcert
  let id1 = web3.sha3('test1');
  let id2 = web3.sha3('test2');
  let id3 = web3.sha3('test3');
  let uri = "http://url.com"
  let mockProof = "1e205550c271490347e5e2393a02e94d284bbe9903f023ba098355b8d75974c8";

  beforeEach(async () => {
    tokenProxy = await TokenTransferProxy.new();
    mintProxy = await XcertMintProxy.new();
    token = await Xct.new();
    xcert = await Xcert.new('Foo', 'F');

    await token.enableTransfer();
    await token.transfer(accounts[1], 200);
    await token.transfer(accounts[2], 200);
    await token.transfer(accounts[3], 200);

    minter = await Minter.new(token.address, tokenProxy.address, mintProxy.address);
    tokenProxy.addAuthorizedAddress(minter.address);
    mintProxy.addAuthorizedAddress(minter.address);
  });

  describe('contract addresses', function () {
    it('check if token address is correct', async () => {
      var address = await minter.getTokenAddress();
      assert.equal(address, token.address);
    });

    it('check if token transfer proxy address is correct', async () => {
      var address = await minter.getTokenTransferProxyAddress();
      assert.equal(address, tokenProxy.address);
    });

    it('check if xcert mint proxy address is correct', async () => {
      var address = await minter.getXcertMintProxyAddress();
      assert.equal(address, mintProxy.address);
    });
  });

  describe('hashing', function () {
    var testArrayAccount = [accounts[3], accounts[5]];
    var testArrayAmount = [1, 10];

    var timestamp = 1521195657;
    var expirationTimestamp = 1821195657;

    var claimAccountArray =[accounts[1], accounts[2], accounts[3], accounts[5]];
    var claimUintArray = [id1, timestamp, expirationTimestamp, 1, 10];

    var contractHash;

    beforeEach(async () => {
      contractHash = await minter.getMintDataClaim(claimAccountArray, claimUintArray, mockProof, uri);
    });

    it('compares the same local and contract hash', async () => {
      var localHash = web3Util.soliditySha3(minter.address, accounts[1], accounts[2], id1, mockProof, uri, {t: 'address[]', v:testArrayAccount}, {t: 'uint256[]', v:testArrayAmount}, timestamp, expirationTimestamp);
      assert.equal(contractHash, localHash);
    });

    it('compares different local and contract hash', async () => {
      var localHash = web3Util.soliditySha3(minter.address, accounts[1], accounts[2], id1, mockProof, uri, {t: 'address[]', v:testArrayAccount}, {t: 'uint256[]', v:testArrayAmount}, timestamp, 34);
      assert.notEqual(contractHash, localHash);
    });
  });

  describe('signature', function () {
    var hash;
    var r;
    var s;
    var v;

    var timestamp = 1521195657;
    var expirationTimestamp = 1821195657;
    var claimAccountArray =[accounts[1], accounts[2], accounts[3], accounts[5]];
    var claimUintArray = [id1, timestamp, expirationTimestamp, 1, 10];

    beforeEach(async () => {
      hash = await minter.getMintDataClaim(claimAccountArray, claimUintArray, mockProof, uri);
      var signature = web3.eth.sign(accounts[0], hash);

      r = signature.substr(0, 66);
      s = '0x' + signature.substr(66, 64);
      v = parseInt('0x' + signature.substr(130, 2)) + 27;
    });

    it('correctly validates correct signer', async () => {
      var valid = await minter.isValidSignature(accounts[0], hash, v, r, s);
      assert.equal(valid, true);
    });

    it('correctly validates wrong signer', async () => {
      var valid = await minter.isValidSignature(accounts[1], hash, v, r, s);
      assert.equal(valid, false);
    });

    it('correctly validates wrong signature data', async () => {
      var valid = await minter.isValidSignature(accounts[0], hash, 1, 2, 3);
      assert.equal(valid, false);
    });

    it('correctly validates signature data from another account', async () => {
      var signature = web3.eth.sign(accounts[1], hash);

      r = signature.substr(0, 66);
      s = '0x' + signature.substr(66, 64);
      v = parseInt('0x' + signature.substr(130, 2)) + 27;

      var valid = await minter.isValidSignature(accounts[0],hash,v,r,s);
      assert.equal(valid, false);

      var valid = await minter.isValidSignature(accounts[1],hash,v,r,s);
      assert.equal(valid, true);
    });
  });

  describe('mint', function () {

    var r;
    var s;
    var v;
    var timestamp = 1521195657;
    var expirationTimestamp = 1821195657;
    var addressArray = [accounts[1]];
    var amountArray = [20];
    var owner = accounts[0];
    var to = accounts[2];
    var thirdParty = accounts[3];

    var mintAddressArray;
    var mintUintArray;

    describe('same signature tests', function () {

      beforeEach(async () => {
        mintAddressArray = [to, xcert.address, accounts[1]];
        mintUintArray = [id1, timestamp, expirationTimestamp, 20];
        var hash = web3Util.soliditySha3(minter.address, to, xcert.address, id1, mockProof, uri, {t: 'address[]', v:addressArray}, {t: 'uint256[]', v:amountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(owner, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;
      });

      describe('cancel', function () {

        it('successfuly cancels mint', async () => {
          var { logs } = await minter.cancelMint(mintAddressArray, mintUintArray, mockProof, uri, {from: owner});

          let cancelEvent = logs.find(e => e.event === 'CancelMint');
          assert.notEqual(cancelEvent, undefined);
        });

        it('throws when someone else then the minter tries to cancel it', async () => {
          await assertRevert(minter.cancelMint(mintAddressArray, mintUintArray, mockProof, uri, {from: thirdParty}));
        });

        it('throws when trying to cancel an already performed mint', async () => {

          await token.approve(tokenProxy.address, 20, {from: to});
          await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});

          let { logs } = await minter.performMint(mintAddressArray, mintUintArray, mockProof, uri, v, r, s, false, {from: to});

          let event = logs.find(e => e.event === 'PerformMint');
          assert.notEqual(event, undefined);

          await assertRevert(minter.cancelMint(mintAddressArray, mintUintArray, mockProof, uri, {from: owner}));
        });

      });

      describe('perform', function () {

        describe('checks enabled', function () {

          it('mints correctly', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});

            let { logs } = await minter.performMint(mintAddressArray, mintUintArray, mockProof, uri, v, r, s, true, {from: to});

            let event = logs.find(e => e.event === 'PerformMint');
            assert.notEqual(event, undefined);

            var tokenOwner = await xcert.ownerOf(id1);
            assert.equal(tokenOwner, to);

            var tokenAmountAcc1 = await token.balanceOf(accounts[1]);
            var tokenAmountAcc2 = await token.balanceOf(to);

            assert.equal(tokenAmountAcc1, 220);
            assert.equal(tokenAmountAcc2, 180);
          });

          it('throws if msg.sender is not the receiver', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});

            await assertRevert(minter.performMint(mintAddressArray, mintUintArray, mockProof, uri, v, r, s, true, {from: thirdParty}));
          });

          it('fails when trying to perform already performed mint', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});
            await minter.performMint(mintAddressArray, mintUintArray, mockProof, uri, v, r, s, true, {from: to});
            //TODO checks for revert message
            await assertRevert(minter.performMint(mintAddressArray, mintUintArray, mockProof, uri, v, r, s, true, {from: to}));
          });

          it('fails when approved token amount is not sufficient', async () => {
            await token.approve(tokenProxy.address, 10, {from: to});
            await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});
            //TODO checks for revert message
            await assertRevert(minter.performMint(mintAddressArray, mintUintArray, mockProof, uri, v, r, s, true, {from: to}));
          });

          it('throws when trying to perform canceled mint', async () => {
            await minter.cancelMint(mintAddressArray, mintUintArray, mockProof, uri, {from: owner});
            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});
            //TODO checks for revert message
            await assertRevert(minter.performMint(mintAddressArray, mintUintArray, mockProof, uri, v, r, s, true, {from: to}));
          });

          it('throws when does not have mint rights', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            //TODO checks for revert message
            await assertRevert(minter.performMint(mintAddressArray, mintUintArray, mockProof, uri, v, r, s, true, {from: to}));
          });

        });

        describe('checks disabled', function () {

          it('throws when approved token amount is not sufficient', async () => {
            await token.approve(tokenProxy.address, 10, {from: to});
            await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});
            await assertRevert(minter.performMint(mintAddressArray, mintUintArray, mockProof, uri, v, r, s, false, {from: to}));
          });

          it('throws when does not have mint rights', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            await assertRevert(minter.performMint(mintAddressArray, mintUintArray, mockProof, uri, v, r, s, false, {from: to}));
          });

        });

      });

    });

   describe('different signature tests', function () {

     it('mints correctly when no fees', async () => {
        mintAddressArray = [to, xcert.address];
        mintUintArray = [id1, timestamp, expirationTimestamp];
        addressArray = [];
        amountArray = [];
        var hash = web3Util.soliditySha3(minter.address, to, xcert.address, id1, mockProof, uri, {t: 'address[]', v:addressArray}, {t: 'uint256[]', v:amountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(owner, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});

        let { logs } = await minter.performMint(mintAddressArray, mintUintArray, mockProof, uri, v, r, s, true, {from: to});

        let event = logs.find(e => e.event === 'PerformMint');
        assert.notEqual(event, undefined);

        var tokenOwner = await xcert.ownerOf(id1);
        assert.equal(tokenOwner, to);
      });

      it('throws when fee amount array is no the same length then feeRecipient', async () => {

        mintAddressArray = [to, xcert.address];
        mintUintArray = [id1, timestamp, expirationTimestamp, 20, 10];
        amountArray = [20, 10];
        var hash = web3Util.soliditySha3(minter.address, to, xcert.address, id1, mockProof, uri, {t: 'address[]', v:addressArray}, {t: 'uint256[]', v:amountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(owner, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await token.approve(tokenProxy.address, 20, {from: to});
        await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});

        await assertRevert(minter.performMint(mintAddressArray, mintUintArray, mockProof, uri, v, r, s, true, {from: to}));
      });

      it('throws when to and the owner addresses are the same', async () => {

        mintAddressArray = [owner, xcert.address];
        mintUintArray = [id1, timestamp, expirationTimestamp, 20];
        amountArray = [20];

        var hash = web3Util.soliditySha3(minter.address, owner, xcert.address, id1, mockProof, uri, {t: 'address[]', v:addressArray}, {t: 'uint256[]', v:amountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(owner, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await token.approve(tokenProxy.address, 20, {from: owner});
        await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});
        await assertRevert(minter.performMint(mintAddressArray, mintUintArray, mockProof, uri, v, r, s, true, {from: owner}));
      });

      it('throws if current time is after expirationTimestamp', async () => {
        mintAddressArray = [to, xcert.address];
        mintUintArray = [id1, timestamp, timestamp, 20];
        amountArray = [20];

        var hash = web3Util.soliditySha3(minter.address, to, xcert.address, id1, mockProof, uri, {t: 'address[]', v:addressArray}, {t: 'uint256[]', v:amountArray}, timestamp, timestamp);
        var signature = web3.eth.sign(owner, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await token.approve(tokenProxy.address, 20, {from: to});
        await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});
        await assertRevert(minter.performMint(mintAddressArray, mintUintArray, mockProof, uri, v, r, s, true, {from: to}));
      });


   });

  });

});
