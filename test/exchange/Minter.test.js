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
    it('compares the same local and contract hash', async () => {
      var contractHash = await minter.getMintDataClaim(accounts[1], accounts[2], id1, uri, testArrayAccount, testArrayAmount, 123);
      var localHash = web3Util.soliditySha3(minter.address, accounts[1], accounts[2], id1, uri, {t: 'address[]', v:testArrayAccount}, {t: 'uint256[]', v:testArrayAmount}, 123);
      assert.equal(contractHash, localHash);
    });

    it('compares different local and contract hash', async () => {
      var contractHash = await minter.getMintDataClaim(accounts[1], accounts[2], id1, uri, testArrayAccount, testArrayAmount, 123);
      var localHash = web3Util.soliditySha3(minter.address, accounts[1], accounts[2], id1, uri, {t: 'address[]', v:testArrayAccount}, {t: 'uint256[]', v:testArrayAmount}, 124);
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
      hash = await minter.getMintDataClaim(accounts[1], accounts[2], id1, uri, testArray, testArray, 123);
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

    it('correctly validates signature data from another accout', async () => {
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

    describe('valid signature', function () {
      var r;
      var s;
      var v;
      var timestamp;
      var addressArray = [accounts[1]];
      var amountArray = [20];

      var owner = accounts[0];
      var to = accounts[2];
      var thirdParty = accounts[3];

      beforeEach(async () => {
        timestamp = 234235345325;
        var hash = web3Util.soliditySha3(minter.address, to, xcert.address, id1, uri, {t: 'address[]', v:addressArray}, {t: 'uint256[]', v:amountArray}, timestamp);
        var signature = web3.eth.sign(owner, hash);

        r = signature.substr(0, 66);
        s = '0x' + signature.substr(66, 64);
        v = parseInt('0x' + signature.substr(130, 2)) + 27;
      });

      describe('cancel', function () {

        it('successfuly cancels mint', async () => {
          var { logs } = await minter.cancelMint(to, xcert.address, id1, uri, addressArray, amountArray, timestamp, {from: owner});

          let cancelEvent = logs.find(e => e.event === 'LogCancelMint');
          assert.notEqual(cancelEvent, undefined);
        });

        it('throws when someone else then the minter tries to cancel it', async () => {
          await assertRevert(minter.cancelMint(to, xcert.address, id1, uri, addressArray, amountArray, timestamp, {from: thirdParty}));
        });

        it('throws when trying to cancel an already performed mint', async () => {

          await token.approve(tokenProxy.address, 20, {from: to});
          await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});

          let { logs } = await minter.performMint(to, xcert.address, id1, uri, addressArray, amountArray, timestamp, v, r, s, false, {from: to});

          let event = logs.find(e => e.event === 'LogPerformMint');
          assert.notEqual(event, undefined);

          await assertRevert(minter.cancelMint(to, xcert.address, id1, uri, addressArray, amountArray, timestamp, {from: owner}));
        });

      });

      describe('perform', function () {

        describe('checks enabled', function () {

          it('mints correctly', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});

            let { logs } = await minter.performMint(to, xcert.address, id1, uri, addressArray, amountArray, timestamp, v, r, s, true, {from: to});

            let event = logs.find(e => e.event === 'LogPerformMint');
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

            await assertRevert(minter.performMint(to, xcert.address, id1, uri, addressArray, amountArray, timestamp, v, r, s, true, {from: thirdParty}));
          });

          it('fails when trying to perform canceled mint', async () => {
            await minter.cancelMint(to, xcert.address, id1, uri, addressArray, amountArray, timestamp, {from: owner});
            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});

            let { logs } = await minter.performMint(to, xcert.address, id1, uri, addressArray, amountArray, timestamp, v, r, s, true, {from: to});

            let event = logs.find(e => e.event === 'LogError');
            assert.notEqual(event, undefined);
          });

          it('throws when fee amount array is no the same length then feeRecipient', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});
            await assertRevert(minter.performMint(to, xcert.address, id1, uri, addressArray, [20,10], timestamp, v, r, s, true, {from: to}));
          });

          it('throws when _from is the owner addresses are the same', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});
            await assertRevert(minter.performMint(owner, xcert.address, id1, uri, addressArray, amountArray, timestamp, v, r, s, true, {from: to}));
          });

          it('fails when trying to perform already performed mint', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});
            await minter.performMint(to, xcert.address, id1, uri, addressArray, amountArray, timestamp, v, r, s, true, {from: to});
            let { logs } = await minter.performMint(to, xcert.address, id1, uri, addressArray, amountArray, timestamp, v, r, s, true, {from: to});

            let event = logs.find(e => e.event === 'LogError');
            assert.notEqual(event, undefined);
          });

          it('fails when approved token amount is not sufficient', async () => {
            await token.approve(tokenProxy.address, 10, {from: to});
            await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});
            let { logs } = await minter.performMint(to, xcert.address, id1, uri, addressArray, amountArray, timestamp, v, r, s, true, {from: to});

            let event = logs.find(e => e.event === 'LogError');
            assert.notEqual(event, undefined);
          });

          it('fails when does not have mint rights', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            let { logs } = await minter.performMint(to, xcert.address, id1, uri, addressArray, amountArray, timestamp, v, r, s, true, {from: to});

            let event = logs.find(e => e.event === 'LogError');
            assert.notEqual(event, undefined);
          });

        });

        describe('checks disabled', function () {

          it('throws when approved token amount is not sufficient', async () => {
            await token.approve(tokenProxy.address, 10, {from: to});
            await xcert.setMintAuthorizedAddress(mintProxy.address, true, {from: owner});
            await assertRevert(minter.performMint(to, xcert.address, id1, uri, addressArray, amountArray, timestamp, v, r, s, false, {from: to}));
          });

          it('throws when does not have mint rights', async () => {
            await token.approve(tokenProxy.address, 20, {from: to});
            await assertRevert(minter.performMint(to, xcert.address, id1, uri, addressArray, amountArray, timestamp, v, r, s, false, {from: to}));
          });

        });

      });

    });

  });

});
