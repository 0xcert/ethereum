const SettableTransferXcert = artifacts.require('SettableTransferXcert');
const util = require('ethjs-util');
const assertRevert = require('../helpers/assertRevert');

contract('SettableTransferXcert', (accounts) => {
  let xcert;
  let id1 = web3.sha3('test1');
  let id2 = web3.sha3('test2');
  let id3 = web3.sha3('test3');
  let id4 = web3.sha3('test4');
  let mockProof = "1e205550c271490347e5e2393a02e94d284bbe9903f023ba098355b8d75974c8";

  beforeEach(async function () {
    xcert = await SettableTransferXcert.new('Foo', 'F');
  });

  it('correctly sets transfer status', async () => {
    var { logs } = await xcert.setTransferable(false);
    let transferStatusChangeEvent = logs.find(e => e.event === 'TransferStatusChange');
    assert.notEqual(transferStatusChangeEvent, undefined);
    var transferState = await xcert.isTransferable();
    assert.equal(transferState, false);
  });

  it('reverts trying to set the same transferState', async () => {
    await assertRevert(xcert.setTransferable(true));
  });

  it('reverts when someone else then the owner tries to change transfer state', async () => {
    await assertRevert(xcert.setTransferable(false, {from: accounts[1]}));
  });

  it('succefully transfers when transfers are enabled', async () => {
    await xcert.mint(accounts[0], id1, mockProof, 'url1');
    await xcert.transferFrom(accounts[0], accounts[1], id1);
    var owner = await xcert.ownerOf(id1);
    assert.equal(owner, accounts[1]);
  });

  it('reverts trying to transfer when transfers are disabled', async () => {
    await xcert.mint(accounts[0], id1, mockProof, 'url1');
    await xcert.setTransferable(false);
    await assertRevert(xcert.transferFrom(accounts[0], accounts[1], id1));
  });
});
