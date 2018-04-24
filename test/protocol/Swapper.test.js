const Swapper = artifacts.require('Swapper');
const NFTokenTransferProxy = artifacts.require('NFTokenTransferProxy');
const TokenTransferProxy = artifacts.require('TokenTransferProxy');
const Xcert = artifacts.require('Xcert');
const Xct = artifacts.require('Xct');
const util = require('ethjs-util');
const web3Util = require('web3-utils');
const assertRevert = require('../helpers/assertRevert');

contract('Swapper', (accounts) => {
  let swapper;
  let nfTokenProxy;
  let tokenProxy;
  let token;
  let xcert;
  let xcert2;
  let xcert3;
  let id1 = web3.sha3('test1');
  let id2 = web3.sha3('test2');
  let id3 = web3.sha3('test3');
  let id4 = web3.sha3('test4');
  let xcert2id1 = 1;
  let xcert2id2 = 2;
  let xcert2id3 = 3;
  let xcert2id4 = 4;
  let xcert3id1 = 1;
  let xcert3id2 = 2;
  let mockProof = "1e205550c271490347e5e2393a02e94d284bbe9903f023ba098355b8d75974c8";

  beforeEach(async () => {
    nfTokenProxy = await NFTokenTransferProxy.new();
    tokenProxy = await TokenTransferProxy.new();
    token = await Xct.new();
    xcert = await Xcert.new('Foo', 'F');
    xcert2 = await Xcert.new('Foo2', 'F2');
    xcert3 = await Xcert.new('Foo3', 'F3');

    await token.enableTransfer();
    await token.transfer(accounts[1], 200);
    await token.transfer(accounts[2], 200);
    await token.transfer(accounts[3], 200);

    await xcert.mint(accounts[1], id1, mockProof, 'url');
    await xcert.mint(accounts[2], id2, mockProof, 'url2');
    await xcert.mint(accounts[3], id3, mockProof, 'url3');
    await xcert.mint(accounts[1], id4, mockProof, 'url4');

    await xcert2.mint(accounts[1], xcert2id1, mockProof, 'url');
    await xcert2.mint(accounts[2], xcert2id2, mockProof, 'url2');
    await xcert2.mint(accounts[2], xcert2id3, mockProof, 'url3');
    await xcert2.mint(accounts[3], xcert2id4, mockProof, 'url4');

    await xcert3.mint(accounts[2], xcert3id1, mockProof, 'url');
    await xcert3.mint(accounts[2], xcert3id2, mockProof, 'url2');

    swapper = await Swapper.new(token.address, tokenProxy.address, nfTokenProxy.address);
    nfTokenProxy.addAuthorizedAddress(swapper.address);
    tokenProxy.addAuthorizedAddress(swapper.address);
  });

  describe('contract addresses', function () {
    it('check if token address is correct', async () => {
      var address = await swapper.getTokenAddress();
      assert.equal(address, token.address);
    });

    it('check if token transfer proxy address is correct', async () => {
      var address = await swapper.getTokenTransferProxyAddress();
      assert.equal(address, tokenProxy.address);
    });

    it('check if none-fundgible token transfer proxy address is correct', async () => {
      var address = await swapper.getNFTokenTransferProxyAddress();
      assert.equal(address, nfTokenProxy.address);
    });
  });


  describe('hashing', function () {

    var timestamp = 1521195657;
    var expirationTimestamp = 1821195657;

    var claimAddressArray;
    var claimUintArray;
    var contractHash;

    var fromNFTokenAddressArray;
    var fromNFTokenIdArray

    var toNFTokenAddressArray;
    var toNFTokenIdArray

    var toFeeAddressArray;
    var toFeeAmountArray

    beforeEach(async () => {
      claimAddressArray = [accounts[1], accounts[2], xcert.address, xcert.address, accounts[1]];
      claimUintArray = [timestamp, expirationTimestamp, 1, 1, id1, id2, 20];

      fromNFTokenAddressArray = [xcert.address];
      fromNFTokenIdArray = [id1];

      toNFTokenAddressArray = [xcert.address];
      toNFTokenIdArray = [id2];

      toFeeAddressArray = [accounts[1]];
      toFeeAmountArray = [20];

      contractHash = await swapper.getSwapDataClaim(claimAddressArray, claimUintArray);
    });

    it('compares the same local and contract hash', async () => {
      var localHash = web3Util.soliditySha3(swapper.address, accounts[1], accounts[2], {t: 'address[]', v:fromNFTokenAddressArray}, {t: 'uint256[]', v:fromNFTokenIdArray},
        {t: 'address[]', v:toNFTokenAddressArray}, {t: 'uint256[]', v:toNFTokenIdArray}, {t: 'address[]', v:toFeeAddressArray}, {t: 'uint256[]', v:toFeeAmountArray}, timestamp, expirationTimestamp);
      assert.equal(contractHash, localHash);
    });

    it('compares different local and contract hash', async () => {
      var localHash = web3Util.soliditySha3(swapper.address, accounts[1], accounts[2], {t: 'address[]', v:fromNFTokenAddressArray}, {t: 'uint256[]', v:fromNFTokenIdArray},
        {t: 'address[]', v:toNFTokenAddressArray}, {t: 'uint256[]', v:toNFTokenIdArray}, {t: 'address[]', v:toFeeAddressArray}, {t: 'uint256[]', v:toFeeAmountArray}, timestamp, 1821195658);
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

    var claimAddressArray;
    var claimUintArray;

    beforeEach(async () => {
      claimAddressArray = [accounts[1], accounts[2], xcert.address, xcert.address, accounts[1]];
      claimUintArray = [timestamp, expirationTimestamp, 1, 1, id1, id2, 500];

      hash = await swapper.getSwapDataClaim(claimAddressArray, claimUintArray);
      var signature = web3.eth.sign(accounts[0], hash);

      r = signature.substr(0, 66);
      s = '0x' + signature.substr(66, 64);
      v = parseInt('0x' + signature.substr(130, 2)) + 27;
    });

    it('correctly validates correct signer', async () => {
      var valid = await swapper.isValidSignature(accounts[0], hash, v, r, s);
      assert.equal(valid, true);
    });

    it('correctly validates wrong signer', async () => {
      var valid = await swapper.isValidSignature(accounts[1], hash, v, r, s);
      assert.equal(valid, false);
    });

    it('correctly validates wrong signature data', async () => {
      var valid = await swapper.isValidSignature(accounts[0], hash, 1, 2, 3);
      assert.equal(valid, false);
    });

    it('correctly validates signature data from another accout', async () => {
      var signature = web3.eth.sign(accounts[1], hash);

      r = signature.substr(0, 66);
      s = '0x' + signature.substr(66, 64);
      v = parseInt('0x' + signature.substr(130, 2)) + 27;

      var valid = await swapper.isValidSignature(accounts[0],hash,v,r,s);
      assert.equal(valid, false);

      var valid = await swapper.isValidSignature(accounts[1],hash,v,r,s);
      assert.equal(valid, true);
    });

  });

  describe('swap', function () {

    var r;
    var s;
    var v;

    var from = accounts[1];
    var to = accounts[2];
    var thirdParty = accounts[3];

    var timestamp = 1521195657;
    var expirationTimestamp = 1821195657;

    var claimAddressArray;
    var claimUintArray;
    var contractHash;

    var fromNFTokenAddressArray;
    var fromNFTokenIdArray

    var toNFTokenAddressArray;
    var toNFTokenIdArray

    var toFeeAddressArray;
    var toFeeAmountArray

    describe('same signature tests', function () {

      beforeEach(async () => {

        claimAddressArray = [from, to, xcert.address, xcert.address, from];
        claimUintArray = [timestamp, expirationTimestamp, 1, 1, id1, id2, 20];

        fromNFTokenAddressArray = [xcert.address];
        fromNFTokenIdArray = [id1];

        toNFTokenAddressArray = [xcert.address];
        toNFTokenIdArray = [id2];

        toFeeAddressArray = [accounts[1]];
        toFeeAmountArray = [20];

        var hash = web3Util.soliditySha3(swapper.address, from, to, {t: 'address[]', v:fromNFTokenAddressArray}, {t: 'uint256[]', v:fromNFTokenIdArray},
        {t: 'address[]', v:toNFTokenAddressArray}, {t: 'uint256[]', v:toNFTokenIdArray}, {t: 'address[]', v:toFeeAddressArray}, {t: 'uint256[]', v:toFeeAmountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(from, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;
      });

      describe('cancel', function () {

        it('successfuly cancels swap', async () => {
          var { logs } = await swapper.cancelSwap(claimAddressArray, claimUintArray, {from: from});

          let cancelEvent = logs.find(e => e.event === 'CancelSwap');
          assert.notEqual(cancelEvent, undefined);
        });

        it('throws when someone else then the swap sender tries to cancel it', async () => {
          await assertRevert(swapper.cancelSwap(claimAddressArray, claimUintArray, {from: thirdParty}));
        });

        it('throws when trying to cancel an already performed swap', async () => {

          await token.approve(tokenProxy.address, 20, {from: to});
          await xcert.approve(nfTokenProxy.address, id1, {from: from});
          await xcert.approve(nfTokenProxy.address, id2, {from: to});

          let { logs } = await swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, false, {from: to});

          let event = logs.find(e => e.event === 'PerformSwap');
          assert.notEqual(event, undefined);

          await assertRevert(swapper.cancelSwap(claimAddressArray, claimUintArray, {from: to}));
        });

      });

      describe('perform', function () {

        describe('checks enabled', function () {

          it('should swap successfuly', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.approve(nfTokenProxy.address, id1, {from: from});
            await xcert.approve(nfTokenProxy.address, id2, {from: to});

            let { logs } = await swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, true, {from: to});

            let event = logs.find(e => e.event === 'PerformSwap');
            assert.notEqual(event, undefined);

            var owner1 = await xcert.ownerOf(id1);
            var owner2 = await xcert.ownerOf(id2);
            var tokenAmountAcc1 = await token.balanceOf(from);
            var tokenAmountAcc2 = await token.balanceOf(to);

            assert.equal(owner1, to);
            assert.equal(owner2, from);
            assert.equal(tokenAmountAcc1, 220);
            assert.equal(tokenAmountAcc2, 180);
          });

          it('should fail when not allowed to transfer NFToken', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.approve(nfTokenProxy.address, id1, {from: from});

            //TODO checks for revert message
            await assertRevert(swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, true, {from: to}));
          });

          it('should fail with unsofficient allowence', async () => {
            await xcert.approve(nfTokenProxy.address, id1, {from: from});
            await xcert.approve(nfTokenProxy.address, id2, {from: to});

            //TODO checks for revert message
            await assertRevert(swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, true, {from: to}));
          });

          it('throws when _to address is not the one performing transfer', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.approve(nfTokenProxy.address, id1, {from: from});
            await xcert.approve(nfTokenProxy.address, id2, {from: to});

            await assertRevert(swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, true, {from: thirdParty}));
          });

        });

        describe('checks disabled', function () {

          it('throws when not allowed to transfer NFToken', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.approve(nfTokenProxy.address, id1, {from: from});

            await assertRevert(swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, false, {from: to}));
          });

          it('throws with unsofficient allowence', async () => {
            await xcert.approve(nfTokenProxy.address, id1, {from: from});
            await xcert.approve(nfTokenProxy.address, id2, {from: to});

            await assertRevert(swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, false, {from: to}));
          });

        });

      });

    });

    describe('different signature tests', function () {

      it('should swap successfuly with no fees', async () => {

        claimAddressArray = [from, to, xcert.address, xcert.address];
        claimUintArray = [timestamp, expirationTimestamp, 1, 1, id1, id2];

        fromNFTokenAddressArray = [xcert.address];
        fromNFTokenIdArray = [id1];

        toNFTokenAddressArray = [xcert.address];
        toNFTokenIdArray = [id2];

        toFeeAddressArray = [];
        toFeeAmountArray = [];

        var hash = web3Util.soliditySha3(swapper.address, from, to, {t: 'address[]', v:fromNFTokenAddressArray}, {t: 'uint256[]', v:fromNFTokenIdArray},
        {t: 'address[]', v:toNFTokenAddressArray}, {t: 'uint256[]', v:toNFTokenIdArray}, {t: 'address[]', v:toFeeAddressArray}, {t: 'uint256[]', v:toFeeAmountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(from, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await xcert.approve(nfTokenProxy.address, id1, {from: from});
        await xcert.approve(nfTokenProxy.address, id2, {from: to});

        let { logs } = await swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, true, {from: to});

        let event = logs.find(e => e.event === 'PerformSwap');
        assert.notEqual(event, undefined);

        var owner1 = await xcert.ownerOf(id1);
        var owner2 = await xcert.ownerOf(id2);

        assert.equal(owner1, to);
        assert.equal(owner2, from);
      });

      it('should swap multiple different tokens successfuly', async () => {

        claimAddressArray = [from, to, xcert.address, xcert.address, xcert2.address, xcert3.address, xcert2.address, from];
        claimUintArray = [timestamp, expirationTimestamp, 3, 2, id1, id4, xcert2id1, xcert3id1, xcert2id3, 20];

        fromNFTokenAddressArray = [xcert.address, xcert.address, xcert2.address];
        fromNFTokenIdArray = [id1, id4, xcert2id1];

        toNFTokenAddressArray = [xcert3.address, xcert2.address];
        toNFTokenIdArray = [xcert3id1, xcert2id3];

        toFeeAddressArray = [accounts[1]];
        toFeeAmountArray = [20];

        var hash = web3Util.soliditySha3(swapper.address, from, to, {t: 'address[]', v:fromNFTokenAddressArray}, {t: 'uint256[]', v:fromNFTokenIdArray},
        {t: 'address[]', v:toNFTokenAddressArray}, {t: 'uint256[]', v:toNFTokenIdArray}, {t: 'address[]', v:toFeeAddressArray}, {t: 'uint256[]', v:toFeeAmountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(from, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await token.approve(tokenProxy.address, 20, {from: to});
        await xcert.approve(nfTokenProxy.address, id1, {from: from});
        await xcert.approve(nfTokenProxy.address, id4, {from: from});
        await xcert2.approve(nfTokenProxy.address, xcert2id1, {from: from});

        await xcert3.approve(nfTokenProxy.address, xcert3id1, {from: to});
        await xcert2.approve(nfTokenProxy.address, xcert2id3, {from: to});

        let { logs } = await swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, true, {from: to});

        let event = logs.find(e => e.event === 'PerformSwap');
        assert.notEqual(event, undefined);

        var owner1 = await xcert.ownerOf(id1);
        var owner2 = await xcert.ownerOf(id4);
        var owner3 = await xcert2.ownerOf(xcert2id1);
        var owner4 = await xcert3.ownerOf(xcert3id1);
        var owner5 = await xcert2.ownerOf(xcert2id3);
        var tokenAmountAcc1 = await token.balanceOf(from);
        var tokenAmountAcc2 = await token.balanceOf(to);

        assert.equal(owner1, to);
        assert.equal(owner2, to);
        assert.equal(owner3, to);
        assert.equal(owner4, from);
        assert.equal(owner5, from);
        assert.equal(tokenAmountAcc1, 220);
        assert.equal(tokenAmountAcc2, 180);

      });

      it('throws when _to and _from addresses are the same', async () => {
        claimAddressArray = [from, from, xcert.address, xcert.address, from];
        claimUintArray = [timestamp, expirationTimestamp, 1, 1, id1, id2, 20];

        fromNFTokenAddressArray = [xcert.address];
        fromNFTokenIdArray = [id1];

        toNFTokenAddressArray = [xcert.address];
        toNFTokenIdArray = [id2];

        toFeeAddressArray = [accounts[1]];
        toFeeAmountArray = [20];

        var hash = web3Util.soliditySha3(swapper.address, from, from, {t: 'address[]', v:fromNFTokenAddressArray}, {t: 'uint256[]', v:fromNFTokenIdArray},
        {t: 'address[]', v:toNFTokenAddressArray}, {t: 'uint256[]', v:toNFTokenIdArray}, {t: 'address[]', v:toFeeAddressArray}, {t: 'uint256[]', v:toFeeAmountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(from, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await token.approve(tokenProxy.address, 20, {from: to});
        await xcert.approve(nfTokenProxy.address, id1, {from: from});
        await xcert.approve(nfTokenProxy.address, id2, {from: to});

        await assertRevert(swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, false, {from: to}));

      });

      it('throws when number representing array length is 0', async () => {
        claimAddressArray = [from, to, xcert.address, xcert.address, from];
        claimUintArray = [timestamp, expirationTimestamp, 1, 0, id1, id2, 20];

        fromNFTokenAddressArray = [xcert.address];
        fromNFTokenIdArray = [id1];

        toNFTokenAddressArray = [xcert.address];
        toNFTokenIdArray = [id2];

        toFeeAddressArray = [accounts[1]];
        toFeeAmountArray = [20];

        var hash = web3Util.soliditySha3(swapper.address, from, to, {t: 'address[]', v:fromNFTokenAddressArray}, {t: 'uint256[]', v:fromNFTokenIdArray},
        {t: 'address[]', v:toNFTokenAddressArray}, {t: 'uint256[]', v:toNFTokenIdArray}, {t: 'address[]', v:toFeeAddressArray}, {t: 'uint256[]', v:toFeeAmountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(from, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await token.approve(tokenProxy.address, 20, {from: to});
        await xcert.approve(nfTokenProxy.address, id1, {from: from});
        await xcert.approve(nfTokenProxy.address, id2, {from: to});

        await assertRevert(swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, false, {from: to}));

      });

      it('throws when number representing array length is bigger then it should be', async () => {
        claimAddressArray = [from, to, xcert.address, xcert.address, from];
        claimUintArray = [timestamp, expirationTimestamp, 1, 2, id1, id2, 20];

        fromNFTokenAddressArray = [xcert.address];
        fromNFTokenIdArray = [id1];

        toNFTokenAddressArray = [xcert.address];
        toNFTokenIdArray = [id2];

        toFeeAddressArray = [accounts[1]];
        toFeeAmountArray = [20];

        var hash = web3Util.soliditySha3(swapper.address, from, to, {t: 'address[]', v:fromNFTokenAddressArray}, {t: 'uint256[]', v:fromNFTokenIdArray},
        {t: 'address[]', v:toNFTokenAddressArray}, {t: 'uint256[]', v:toNFTokenIdArray}, {t: 'address[]', v:toFeeAddressArray}, {t: 'uint256[]', v:toFeeAmountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(from, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await token.approve(tokenProxy.address, 20, {from: to});
        await xcert.approve(nfTokenProxy.address, id1, {from: from});
        await xcert.approve(nfTokenProxy.address, id2, {from: to});

        await assertRevert(swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, false, {from: to}));

      });

      it('throws when number representing array length is lower then it should be', async () => {
        claimAddressArray = [from, to, xcert.address, xcert.address, xcert2.address];
        claimUintArray = [timestamp, expirationTimestamp, 1, 1, id1, id2, xcert2id2];

        fromNFTokenAddressArray = [xcert.address];
        fromNFTokenIdArray = [id1];

        toNFTokenAddressArray = [xcert.address, xcert2.address];
        toNFTokenIdArray = [id2, xcert2id2];

        toFeeAddressArray = [];
        toFeeAmountArray = [];

        var hash = web3Util.soliditySha3(swapper.address, from, to, {t: 'address[]', v:fromNFTokenAddressArray}, {t: 'uint256[]', v:fromNFTokenIdArray},
        {t: 'address[]', v:toNFTokenAddressArray}, {t: 'uint256[]', v:toNFTokenIdArray}, {t: 'address[]', v:toFeeAddressArray}, {t: 'uint256[]', v:toFeeAmountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(from, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await xcert.approve(nfTokenProxy.address, id1, {from: from});
        await xcert.approve(nfTokenProxy.address, id2, {from: to});
        await xcert2.approve(nfTokenProxy.address, xcert2id2, {from: to});

        await assertRevert(swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, false, {from: to}));

      });

      it('throws when array lengths are not correct', async () => {
        claimAddressArray = [from, to, xcert.address, xcert.address, xcert2.address];
        claimUintArray = [timestamp, expirationTimestamp, 1, 2, id1, id2, xcert2id2, xcert2id3];

        fromNFTokenAddressArray = [xcert.address];
        fromNFTokenIdArray = [id1];

        toNFTokenAddressArray = [xcert.address, xcert2.address];
        toNFTokenIdArray = [id2, xcert2id2];

        toFeeAddressArray = [];
        toFeeAmountArray = [];

        var hash = web3Util.soliditySha3(swapper.address, from, to, {t: 'address[]', v:fromNFTokenAddressArray}, {t: 'uint256[]', v:fromNFTokenIdArray},
        {t: 'address[]', v:toNFTokenAddressArray}, {t: 'uint256[]', v:toNFTokenIdArray}, {t: 'address[]', v:toFeeAddressArray}, {t: 'uint256[]', v:toFeeAmountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(from, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await xcert.approve(nfTokenProxy.address, id1, {from: from});
        await xcert.approve(nfTokenProxy.address, id2, {from: to});
        await xcert2.approve(nfTokenProxy.address, xcert2id2, {from: to});
        await xcert2.approve(nfTokenProxy.address, xcert2id3, {from: to});

        await assertRevert(swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, false, {from: to}));

      });

      it('throws if current time is after expirationTimestamp', async () => {
        claimAddressArray = [from, to, xcert.address, xcert.address, xcert2.address];
        claimUintArray = [timestamp, timestamp, 1, 1, id1, id2];

        fromNFTokenAddressArray = [xcert.address];
        fromNFTokenIdArray = [id1];

        toNFTokenAddressArray = [xcert.address];
        toNFTokenIdArray = [id2];

        toFeeAddressArray = [accounts[1]];
        toFeeAmountArray = [20];

        var hash = web3Util.soliditySha3(swapper.address, from, to, {t: 'address[]', v:fromNFTokenAddressArray}, {t: 'uint256[]', v:fromNFTokenIdArray},
        {t: 'address[]', v:toNFTokenAddressArray}, {t: 'uint256[]', v:toNFTokenIdArray}, {t: 'address[]', v:toFeeAddressArray}, {t: 'uint256[]', v:toFeeAmountArray}, timestamp, timestamp);
        var signature = web3.eth.sign(from, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await token.approve(tokenProxy.address, 20, {from: to});
        await xcert.approve(nfTokenProxy.address, id1, {from: from});
        await xcert.approve(nfTokenProxy.address, id2, {from: to});
        await xcert2.approve(nfTokenProxy.address, xcert2id2, {from: to});

        await assertRevert(swapper.performSwap(claimAddressArray, claimUintArray, v, r, s, false, {from: to}));

      });

    });

  });

});
