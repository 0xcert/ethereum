const Xcert = artifacts.require('Xcert');
const util = require('ethjs-util');
const assertRevert = require('../helpers/assertRevert');

contract('erc/Xcert', (accounts) => {
  let xcert;
  let id1 = web3.sha3('test1');
  let id2 = web3.sha3('test2');
  let id3 = web3.sha3('test3');
  let id4 = web3.sha3('test4');

  beforeEach(async function () {
    xcert = await Xcert.deployed();
  });

  it('returns 0 minted deeds', async () => {
    const count = await xcert.countOfDeeds.call();
    assert.equal(count.toNumber(), 0);
  });

  it('returns correct count of deeds after mint', async () => {
    await xcert.mint.sendTransaction(accounts[0],id1,'url');
    const count = await xcert.countOfDeeds.call();
    assert.equal(count.toNumber(), 1);
  });

  it('throws when trying to mint 2 deeds with the same hash', async () => {
    await xcert.mint.sendTransaction(accounts[0], id2, 'url2');
    await assertRevert(xcert.mint.sendTransaction(accounts[0], id2, 'url2'));
    const count = await xcert.countOfDeeds.call();
    assert.equal(count.toNumber(), 2);
  });

  it('throws trying to mint deed with empty hash', async () => {
    await assertRevert(xcert.mint.sendTransaction(accounts[0],'',''));
    const count = await xcert.countOfDeeds.call();
    assert.equal(count.toNumber(), 2);
  });

  it('throws when trying to ming deed to 0x0 address ', async () => {
    await assertRevert(xcert.mint.sendTransaction('0',id3,''));
    const count = await xcert.countOfDeeds.call();
    assert.equal(count.toNumber(), 2);
  });

  it('throws when trying to mint deed from non owner address', async () => {
    await assertRevert(xcert.mint.sendTransaction('0',id3,'',{from: accounts[1]}));
    const count = await xcert.countOfDeeds.call();
    assert.equal(count.toNumber(), 2);
  });

  it('returns correct count of deeds after mint', async () => {
    await xcert.mint.sendTransaction(accounts[1],id3,'url3');
    const count = await xcert.countOfDeeds.call();
    assert.equal(count.toNumber(), 3);
  });

  it('throws when trying to mint deed with uri length more then 2083 chars', async () => {
    await assertRevert(xcert.mint.sendTransaction(accounts[0],id4,'sdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfddfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfd'));
    const count = await xcert.countOfDeeds.call();
    assert.equal(count.toNumber(), 3);
  });

  it('should find the correct amount deeds owned by account[0]', async () => {
    const count = await xcert.countOfDeedsByOwner.call(accounts[0]);
    assert.equal(count.toNumber(), 2);
  });

  it('throws when trying to get count of deeds owned by 0x0 address', async () => {
    await assertRevert(xcert.countOfDeedsByOwner.call('0'));
  });

  it('finds the correct owner of deed id 3', async () => {
    const address = await xcert.ownerOf.call(id3);
    assert.equal(address, accounts[1]);
  });

  it('throws when trying to find owner od none existant deed id', async () => {
    await assertRevert(xcert.ownerOf.call(id4));
  });

  it('correctly approves account[1]', async () => {
    await xcert.approve.sendTransaction(accounts[1],id2);
    const address = await xcert.approvedFor.call(id2);
    assert.equal(address, accounts[1]);
  });

  it('correctly cancels approval of account[1]', async () => {
    await xcert.approve.sendTransaction(0,id2);
    const address = await xcert.approvedFor.call(id2);
    assert.equal(address, 0);
  });

  it('returns 0x0 address for check approval of none existant deed id', async () => {
    const address = await xcert.approvedFor.call(id4);
    assert.equal(address, 0);
  });

  it('correctly approves and take ownership of deed id 2 from account[0] to account[1]', async () => {
    await xcert.approve.sendTransaction(accounts[1],id2);
    await xcert.takeOwnership.sendTransaction(id2, {from: accounts[1]});
    const countac0 = await xcert.countOfDeedsByOwner.call(accounts[0]);
    const countac1 = await xcert.countOfDeedsByOwner.call(accounts[1]);
    const owner = await xcert.ownerOf(id2);
    assert.equal(owner, accounts[1]);
    assert.equal(countac0, 1);
    assert.equal(countac1, 2);
  });

  it('throws when trying to take ownership that is not approved for', async () => {
    await assertRevert(xcert.takeOwnership.sendTransaction(id2));
    const countac0 = await xcert.countOfDeedsByOwner.call(accounts[0]);
    const countac1 = await xcert.countOfDeedsByOwner.call(accounts[1]);
    const owner = await xcert.ownerOf(id2);
    assert.equal(owner, accounts[1]);
    assert.equal(countac0, 1);
    assert.equal(countac1, 2);
  });

  it('throws when trying to take ownership of deed that approval was granted but then canceled', async () => {
    await xcert.approve.sendTransaction(accounts[0], id2, {from: accounts[1]});
    await xcert.approve.sendTransaction(0, id2, {from: accounts[1]});
    await assertRevert(xcert.takeOwnership.sendTransaction(id2));
    const countac0 = await xcert.countOfDeedsByOwner.call(accounts[0]);
    const countac1 = await xcert.countOfDeedsByOwner.call(accounts[1]);
    const owner = await xcert.ownerOf(id2);
    assert.equal(owner, accounts[1]);
    assert.equal(countac0, 1);
    assert.equal(countac1, 2);
  });

  it('throws when trying to approve deed id that we are not the owner of', async () => {
   await assertRevert(xcert.approve.sendTransaction(accounts[1], id2));
   const address = await xcert.approvedFor.call(2);
   assert.equal(address, 0);
  });

  it('returns the correct issuer name', async () => {
    const name = await xcert.name.call();
    assert.equal(name, 'test');
  });

  it('returns the correct issuer symbol', async () => {
    const symbol = await xcert.symbol.call();
    assert.equal(symbol, 'TST');
  });

  it('returns the correct deed id 2 url', async () => {
    const deedUri = await xcert.deedUri.call(id2);
    assert.equal(deedUri, 'url2');
  });

  it('throws when trying to get uri of none existant deed id', async () => {
    const xcert = await Xcert.deployed();
    await assertRevert(xcert.deedUri.call(id4));
  });

  it('returns the correct deed id for account[1] index 1', async () => {
    const xcertId = await xcert.deedOfOwnerByIndex.call(accounts[1], 0);
    assert.equal(util.intToHex(xcertId), id3);
  });

  it('throws when trying to get id of none existant index', async () => {
    await assertRevert(xcert.deedOfOwnerByIndex.call(accounts[1], 5));
  });

  it('destroys deed id 1', async () => {
    await xcert.burn.sendTransaction(id1);
    const countac0 = await xcert.countOfDeedsByOwner.call(accounts[0]);
    const count = await xcert.countOfDeeds.call();
    assert.equal(countac0, 0);
    assert.equal(count, 2);
  });

  it('throws when trying to destory an already destroyed deed id 1', async () => {
    await assertRevert(xcert.burn.sendTransaction(id1));
    const countac0 = await xcert.countOfDeedsByOwner.call(accounts[0]);
    const count = await xcert.countOfDeeds.call();
    assert.equal(countac0, 0);
    assert.equal(count, 2);
  });

  it('throws when trying to destory deed you are not the owner of', async () => {
    await assertRevert(xcert.burn.sendTransaction(id2));
    const countac1 = await xcert.countOfDeedsByOwner.call(accounts[1]);
    const count = await xcert.countOfDeeds.call();
    assert.equal(countac1, 2);
    assert.equal(count, 2);
  });

  it('returns the correct array of deed ids of accounts[1]', async () => {
    const deedIds = await xcert.deedsOf.call(accounts[1]);
    assert.equal(deedIds.length, 2);
    assert.equal(util.intToHex(deedIds[0]), id3);
    assert.equal(util.intToHex(deedIds[1]), id2);
  });

  it('returns the correct array size of accounts[0]', async () => {
    const deedIds = await xcert.deedsOf.call(accounts[0]);
    assert.equal(deedIds.length, 0);
  });

  it('throws when trying to get array of deeds for 0x0 adress', async () => {
    await assertRevert(xcert.deedsOf.call(0));
  });

  it('returns the correct array size for account[3]', async () => {
    const deedIds = await xcert.deedsOf.call(accounts[3]);
    assert.equal(deedIds.length, 0);
  });

  it('correctly transfers deed ownership', async () => {
    await xcert.transfer.sendTransaction(accounts[0], id2, {from: accounts[1]});
    const deedIds = await xcert.deedsOf.call(accounts[0]);
    const deed2Ids = await xcert.deedsOf.call(accounts[1]);
    const countac0 = await xcert.countOfDeedsByOwner.call(accounts[0]);
    const countac1 = await xcert.countOfDeedsByOwner.call(accounts[1]);
    assert.equal(util.intToHex(deedIds[0]), id2);
    assert.equal(util.intToHex(deed2Ids[0]), id3);
    assert.equal(countac0, 1);
    assert.equal(countac1, 1);
  });

  it('throws when trying to transfer to a 0x0 account', async () => {
    await assertRevert(xcert.transfer.sendTransaction(0, id2));
  });

  it('throws when trying to transfer an none existant deed', async () => {
    await assertRevert(xcert.transfer.sendTransaction(accounts[1], id4));
  });

  it('throws when trying to transfer deed you are not an owner of', async () => {
    await assertRevert(xcert.transfer.sendTransaction(accounts[1], id3));
  });

  it('throws when trying to transfer deed to yourself', async () => {
    await assertRevert(xcert.transfer.sendTransaction(accounts[0], id2));
  });

});
