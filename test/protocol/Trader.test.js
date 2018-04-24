const Trader = artifacts.require('Trader');
const NFTokenTransferProxy = artifacts.require('NFTokenTransferProxy');
const TokenTransferProxy = artifacts.require('TokenTransferProxy');
const Xcert = artifacts.require('Xcert');
const Xct = artifacts.require('Xct');
const util = require('ethjs-util');
const web3Util = require('web3-utils');
const assertRevert = require('../helpers/assertRevert');

contract('Trader', (accounts) => {
  let trader;
  let nfTokenProxy;
  let tokenProxy;
  let token;
  let xcert
  let id1 = web3.sha3('test1');
  let id2 = web3.sha3('test2');
  let id3 = web3.sha3('test3');
  let mockProof = "1e205550c271490347e5e2393a02e94d284bbe9903f023ba098355b8d75974c8";

  beforeEach(async () => {
    nfTokenProxy = await NFTokenTransferProxy.new();
    tokenProxy = await TokenTransferProxy.new();
    token = await Xct.new();
    xcert = await Xcert.new('Foo', 'F');

    await token.enableTransfer();
    await token.transfer(accounts[1], 200);
    await token.transfer(accounts[2], 200);
    await token.transfer(accounts[3], 200);

    await xcert.mint(accounts[1], id1, mockProof, 'url');
    await xcert.mint(accounts[2], id2, mockProof, 'url2');
    await xcert.mint(accounts[3], id3, mockProof, 'url3');

    trader = await Trader.new(token.address, tokenProxy.address, nfTokenProxy.address);
    nfTokenProxy.addAuthorizedAddress(trader.address);
    tokenProxy.addAuthorizedAddress(trader.address);
  });

  describe('contract addresses', function () {
    it('check if token address is correct', async () => {
      var address = await trader.getTokenAddress();
      assert.equal(address, token.address);
    });

    it('check if token transfer proxy address is correct', async () => {
      var address = await trader.getTokenTransferProxyAddress();
      assert.equal(address, tokenProxy.address);
    });

    it('check if none-fundgible token transfer proxy address is correct', async () => {
      var address = await trader.getNFTokenTransferProxyAddress();
      assert.equal(address, nfTokenProxy.address);
    });
  });

  describe('hashing', function () {
    var testArrayAccount = [accounts[3], accounts[5]];
    var testArrayAmount = [1, 10];

    var timestamp = 1521195657;
    var expirationTimestamp = 1821195657;

    var claimAccountArray =[accounts[0], accounts[1], accounts[2], accounts[3], accounts[5]];
    var claimUintArray = [id1, timestamp, expirationTimestamp, 1, 10];

    var contractHash;

    beforeEach(async () => {
      contractHash = await trader.getTransferDataClaim(claimAccountArray, claimUintArray);
    });

    it('compares the same local and contract hash', async () => {
      var localHash = web3Util.soliditySha3(trader.address, accounts[0], accounts[1], accounts[2], id1, {t: 'address[]', v:testArrayAccount}, {t: 'uint256[]', v:testArrayAmount}, timestamp, expirationTimestamp);
      assert.equal(contractHash, localHash);
    });

    it('compares different local and contract hash', async () => {
      var localHash = web3Util.soliditySha3(trader.address, accounts[0], accounts[1], accounts[2], id1, {t: 'address[]', v:testArrayAccount}, {t: 'uint256[]', v:testArrayAmount}, timestamp, 1821);
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

    var claimAccountArray =[accounts[0], accounts[1], accounts[2], accounts[3], accounts[5]];
    var claimUintArray = [id1, timestamp, expirationTimestamp, 1, 10];

    beforeEach(async () => {
      hash = await trader.getTransferDataClaim(claimAccountArray, claimUintArray);
      var signature = web3.eth.sign(accounts[0], hash);

      r = signature.substr(0, 66);
      s = '0x' + signature.substr(66, 64);
      v = parseInt('0x' + signature.substr(130, 2)) + 27;
    });

    it('correctly validates correct signer', async () => {
      var valid = await trader.isValidSignature(accounts[0], hash, v, r, s);
      assert.equal(valid, true);
    });

    it('correctly validates wrong signer', async () => {
      var valid = await trader.isValidSignature(accounts[1], hash, v, r, s);
      assert.equal(valid, false);
    });

    it('correctly validates wrong signature data', async () => {
      var valid = await trader.isValidSignature(accounts[0], hash, 1, 2, 3);
      assert.equal(valid, false);
    });

    it('correctly validates signature data from another accout', async () => {
      var signature = web3.eth.sign(accounts[1], hash);

      r = signature.substr(0, 66);
      s = '0x' + signature.substr(66, 64);
      v = parseInt('0x' + signature.substr(130, 2)) + 27;

      var valid = await trader.isValidSignature(accounts[0],hash,v,r,s);
      assert.equal(valid, false);

      var valid = await trader.isValidSignature(accounts[1],hash,v,r,s);
      assert.equal(valid, true);
    });
  });


  describe('transfer', function () {

    var r;
    var s;
    var v;

    var timestamp = 1521195657;
    var expirationTimestamp = 1821195657;
    var addressArray = [accounts[1]];
    var amountArray = [20];
    var from = accounts[1];
    var to = accounts[2];
    var thirdParty = accounts[3];

    var claimAddressArray;
    var claimUintArray;

    describe('same signature tests', function () {

      beforeEach(async () => {
        claimAddressArray = [from, to, xcert.address, from];
        claimUintArray = [id1, timestamp, expirationTimestamp, 20];
        var hash = web3Util.soliditySha3(trader.address, from, to, xcert.address, id1, {t: 'address[]', v:addressArray}, {t: 'uint256[]', v:amountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(from, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;
      });

      describe('cancel', function () {

        it('successfuly cancels transfer', async () => {
          var { logs } = await trader.cancelTransfer(claimAddressArray, claimUintArray, {from: from});

          let cancelEvent = logs.find(e => e.event === 'CancelTransfer');
          assert.notEqual(cancelEvent, undefined);
        });

        it('throws when someone else then the transfer sender tries to cancel it', async () => {
          await assertRevert(trader.cancelTransfer(claimAddressArray, claimUintArray, {from: thirdParty}));
        });

        it('throws when trying to cancel an already performed transfer', async () => {

          await token.approve(tokenProxy.address, 20, {from: to});
          await xcert.approve(nfTokenProxy.address, id1, {from: from});

          let { logs } = await trader.performTransfer(claimAddressArray, claimUintArray, v, r, s, false, {from: to});

          let event = logs.find(e => e.event === 'PerformTransfer');
          assert.notEqual(event, undefined);

          await assertRevert(trader.cancelTransfer(claimAddressArray, claimUintArray, {from: to}));
        });

      });

      describe('perform', function () {

        describe('checks enabled', function () {

          it('should transfer successfuly', async () => {

            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.approve(nfTokenProxy.address, id1, {from: from});

            let { logs } = await trader.performTransfer(claimAddressArray, claimUintArray, v, r, s, true, {from: to});

            let event = logs.find(e => e.event === 'PerformTransfer');
            assert.notEqual(event, undefined);

            var owner = await xcert.ownerOf(id1);
            var tokenAmountAcc1 = await token.balanceOf(from);
            var tokenAmountAcc2 = await token.balanceOf(to);

            assert.equal(owner, to);
            assert.equal(tokenAmountAcc1, 220);
            assert.equal(tokenAmountAcc2, 180);

          });

          it('should fail with unsofficient allowence', async () => {

            await token.approve(tokenProxy.address, 10, {from: to});
            await xcert.approve(nfTokenProxy.address, id1, {from: from});

            //TODO checks for revert message
            await assertRevert(trader.performTransfer(claimAddressArray, claimUintArray, v, r, s, true, {from: to}));
          });

          it('should fail when not allowed to transfer NFToken', async () => {
            await token.approve(tokenProxy.address, 10, {from: to});

            //TODO checks for revert message
            await assertRevert(trader.performTransfer(claimAddressArray, claimUintArray, v, r, s, true, {from: to}));
          });

          it('throws when _to address is not the one performing transfer', async () => {
            await assertRevert(trader.performTransfer(claimAddressArray, claimUintArray, v, r, s, true, {from: thirdParty}));
          });


          it('fails trying to perfom an already performed transfer', async () => {

            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.approve(nfTokenProxy.address, id1, {from: from});

            var { logs } = await trader.performTransfer(claimAddressArray, claimUintArray, v, r, s, true, {from: to});

            let transferEvent = logs.find(e => e.event === 'PerformTransfer');
            assert.notEqual(transferEvent, undefined);

            //TODO checks for revert message
            await assertRevert(trader.performTransfer(claimAddressArray, claimUintArray, v, r, s, true, {from: to}));
          });

          it('fails trying to perform canceled transfer', async () => {

            var { logs } = await trader.cancelTransfer(claimAddressArray, claimUintArray, {from: from});

            let cancelEvent = logs.find(e => e.event === 'CancelTransfer');
            assert.notEqual(cancelEvent, undefined);

            //TODO checks for revert message
            await assertRevert(trader.performTransfer(claimAddressArray, claimUintArray, v, r, s, true, {from: to}));
          });

        });

        describe('checks disabled', function () {
          it('throws because of unsofficient allowence', async () => {
            await token.approve(tokenProxy.address, 10, {from: to});
            await xcert.approve(nfTokenProxy.address, id1, {from: from});

            await assertRevert(trader.performTransfer(claimAddressArray, claimUintArray, v, r, s, false, {from: to}));
          });

          it('throws when not allowed to transfer NFToken', async () => {
            await token.approve(tokenProxy.address, 10, {from: to});

            await assertRevert(trader.performTransfer(claimAddressArray, claimUintArray, v, r, s, false, {from: to}));
          });

        });
      });
    });

    describe('different signature tests', function () {

     it('throws when fee amount array is no the same length then feeRecipient', async () => {
        claimAddressArray = [from, to, xcert.address, from];
        claimUintArray = [id1, timestamp, expirationTimestamp, 20, 30];
        amountArray[1] = 30;
        var hash = web3Util.soliditySha3(trader.address, from, to, xcert.address, id1, {t: 'address[]', v:addressArray}, {t: 'uint256[]', v:amountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(from, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await token.approve(tokenProxy.address, 20, {from: to});
        await xcert.approve(nfTokenProxy.address, id1, {from: from});

        await assertRevert(trader.performTransfer(claimAddressArray, claimUintArray, v, r, s, true, {from: to}));
      });


      it('throws if current time is after expirationTimestamp', async () => {

        claimAddressArray = [from, to, xcert.address, from];
        claimUintArray = [id1, timestamp, timestamp, 20];
        var hash = web3Util.soliditySha3(trader.address, from, to, xcert.address, id1, {t: 'address[]', v:addressArray}, {t: 'uint256[]', v:amountArray}, timestamp, timestamp);
        var signature = web3.eth.sign(from, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await token.approve(tokenProxy.address, 20, {from: to});
        await xcert.approve(nfTokenProxy.address, id1, {from: from});

        await assertRevert(trader.performTransfer(claimAddressArray, claimUintArray, v, r, s, true, {from: to}));
      });

      it('throws when _to and _from addresses are the same', async () => {

        claimAddressArray = [to, to, xcert.address, from];
        claimUintArray = [id1, timestamp, expirationTimestamp, 20];
        var hash = web3Util.soliditySha3(trader.address, to, to, xcert.address, id1, {t: 'address[]', v:addressArray}, {t: 'uint256[]', v:amountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(from, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await token.approve(tokenProxy.address, 20, {from: to});
        await xcert.approve(nfTokenProxy.address, id1, {from: from});

        await assertRevert(trader.performTransfer(claimAddressArray, claimUintArray, v, r, s, true, {from: to}));
      });

      it('should transfer successfuly without any fees', async () => {

        claimAddressArray = [from, to, xcert.address];
        claimUintArray = [id1, timestamp, expirationTimestamp];

        addressArray = [];
        amountArray = [];
        var hash = web3Util.soliditySha3(trader.address, from, to, xcert.address, id1, {t: 'address[]', v:addressArray}, {t: 'uint256[]', v:amountArray}, timestamp, expirationTimestamp);
        var signature = web3.eth.sign(from, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;

        await xcert.approve(nfTokenProxy.address, id1, {from: from});

        let { logs } = await trader.performTransfer(claimAddressArray, claimUintArray, v, r, s, true, {from: to});

        let event = logs.find(e => e.event === 'PerformTransfer');
        assert.notEqual(event, undefined);

        var owner = await xcert.ownerOf(id1);

        assert.equal(owner, to);

        });

    });

  });
});
