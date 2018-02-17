const assertRevert = require('../helpers/assertRevert');
const util = require('ethjs-util');

var Xcert = artifacts.require("Xcert");

contract('Xcert', function(accounts) {

  let instance;
  let id1 = web3.sha3("test1");
  let id2 = web3.sha3("test2");
  let id3 = web3.sha3("test3");
  let id4 = web3.sha3("test4");

  beforeEach(async function () {
    instance = await Xcert.deployed();
  });

  it("returns 0 minted deeds", async function() {
    var count = await instance.countOfDeeds.call();
    assert.equal(count.toNumber(), 0, "There should be 0 minted deed");
  });

  it("returns correct count of deeds after mint", async function() {
    await instance.mint.sendTransaction(accounts[0],id1,"url");
    var count = await instance.countOfDeeds.call();
    assert.equal(count.toNumber(), 1, "There should be 1 minted deed");
  });

  it("throws when trying to mint 2 deeds with the same hash", async function() {
    await instance.mint.sendTransaction(accounts[0], id2, "url2");
    await assertRevert(instance.mint.sendTransaction(accounts[0], id2, "url2"));
    var count = await instance.countOfDeeds.call();
    assert.equal(count.toNumber(), 2, "There should be 2 minted 0xerts");
  });

  it("throws trying to mint deed with empty hash", async function() {
    await assertRevert(instance.mint.sendTransaction(accounts[0],"",""));
    var count = await instance.countOfDeeds.call();
    assert.equal(count.toNumber(), 2, "There should be 2 minted deed");
  });

  it("throws when trying to ming deed to 0x0 address ", async function() {
    await assertRevert(instance.mint.sendTransaction("0",id3,""));
    var count = await instance.countOfDeeds.call();
    assert.equal(count.toNumber(), 2, "There should be 2 minted deed");
  });

  it("throws when trying to mint deed from non owner address", async function() {
    await assertRevert(instance.mint.sendTransaction("0",id3,"",{from: accounts[1]}));
    var count = await instance.countOfDeeds.call();
    assert.equal(count.toNumber(), 2, "There should be 2 minted deed");
  });

  it("returns correct count of deeds after mint", async function() {
    await instance.mint.sendTransaction(accounts[1],id3,"url3");
    var count = await instance.countOfDeeds.call();
    assert.equal(count.toNumber(), 3, "There should be 3 minted deeds");
  });

  it("throws when trying to mint deed with uri length more then 2083 chars", async function() {
    await assertRevert(instance.mint.sendTransaction(accounts[0],id4,"sdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfddfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfd"));
    var count = await instance.countOfDeeds.call();
    assert.equal(count.toNumber(), 3, "There should be 3 minted deed");
  });

  it("should find the correct amount deeds owned by account[0]", async function() {
    var count = await instance.countOfDeedsByOwner.call(accounts[0]);
    assert.equal(count.toNumber(), 2, "There should be 2 deeds");
  });

  it("throws when trying to get count of deeds owned by 0x0 address", async function() {
    await assertRevert(instance.countOfDeedsByOwner.call("0"));
  });

  it("finds the correct owner of deed id 3", async function() {
    var address = await instance.ownerOf.call(id3);
    assert.equal(address, accounts[1], "Owner should be accounts[1]");
  });

  it("throws when trying to find owner od none existant deed id", async function() {
    await assertRevert(instance.ownerOf.call(id4));
  });

  it("correctly approves account[1]", async function() {
    await instance.approve.sendTransaction(accounts[1],id2);
    var address = await instance.approvedFor.call(id2);
    assert.equal(address, accounts[1], "Should be account[1]");
  });

  it("correctly cancels approval of account[1]", async function() {
    await instance.approve.sendTransaction(0,id2);
    var address = await instance.approvedFor.call(id2);
    assert.equal(address, 0, "Should be 0");
  });

  it("returns 0x0 address for check approval of none existant deed id", async function() {
    var address = await instance.approvedFor.call(id4);
    assert.equal(address, 0, "Should be 0");
  });

  it("correctly approves and take ownership of deed id 2 from account[0] to account[1]", async function() {
    await instance.approve.sendTransaction(accounts[1],id2);
    await instance.takeOwnership.sendTransaction(id2, {from: accounts[1]});
    var countac0 = await instance.countOfDeedsByOwner.call(accounts[0]);
    var countac1 = await instance.countOfDeedsByOwner.call(accounts[1]);
    var owner = await instance.ownerOf(id2);

    assert.equal(owner, accounts[1], "account[1] should be owner.");
    assert.equal(countac0, 1, "Should have 1 deed.");
    assert.equal(countac1, 2, "Should have 2 deeds.");
  });

  it("throws when trying to take ownership that is not approved for", async function() {
    await assertRevert(instance.takeOwnership.sendTransaction(id2));
    var countac0 = await instance.countOfDeedsByOwner.call(accounts[0]);
    var countac1 = await instance.countOfDeedsByOwner.call(accounts[1]);
    var owner = await instance.ownerOf(id2);

    assert.equal(owner, accounts[1], "account[1] should be owner.");
    assert.equal(countac0, 1, "Should have 1 deed.");
    assert.equal(countac1, 2, "Should have 2 deeds.");
  });

  it("throws when trying to take ownership of deed that approval was granted but then canceled", async function() {
    await instance.approve.sendTransaction(accounts[0], id2, {from: accounts[1]});
    await instance.approve.sendTransaction(0, id2, {from: accounts[1]});
    await assertRevert(instance.takeOwnership.sendTransaction(id2));
    var countac0 = await instance.countOfDeedsByOwner.call(accounts[0]);
    var countac1 = await instance.countOfDeedsByOwner.call(accounts[1]);
    var owner = await instance.ownerOf(id2);

    assert.equal(owner, accounts[1], "account[1] should be owner.");
    assert.equal(countac0, 1, "Should have 1 deed.");
    assert.equal(countac1, 2, "Should have 2 deeds.");
  });

  it("throws when trying to approve deed id that we are not the owner of", async function() {
   await assertRevert(instance.approve.sendTransaction(accounts[1], id2));
   var address = await instance.approvedFor.call(2);
   assert.equal(address, 0, "Should be 0");
  });

  it("returns the correct issuer name", async function() {
    var name = await instance.name.call();
    assert.equal(name, "test", "Should be test");
  });

  it("returns the correct issuer symbol", async function() {
    var symbol = await instance.symbol.call();
    assert.equal(symbol, "TST", "Should be TST");
  });

  it("returns the correct deed id 2 url", async function() {
    var deedUri = await instance.deedUri.call(id2);
    assert.equal(deedUri, "url2", "Should be url2");
  });

  it("throws when trying to get uri of none existant deed id", async function() {
    var instance = await Xcert.deployed();
    await assertRevert(instance.deedUri.call(id4));
  });

  it("returns the correct deed id for account[1] index 1", async function() {
    var xcertId = await instance.deedOfOwnerByIndex.call(accounts[1], 0);
    assert.equal(util.intToHex(xcertId), id3, "Should be 3");
  });

  it("throws when trying to get id of none existant index", async function() {
    await assertRevert(instance.deedOfOwnerByIndex.call(accounts[1], 5));
  });

  it("destroys deed id 1", async function() {
    await instance.burn.sendTransaction(id1);
    var countac0 = await instance.countOfDeedsByOwner.call(accounts[0]);
    var count = await instance.countOfDeeds.call();

    assert.equal(countac0, 0, "Should have 0 deed.");
    assert.equal(count, 2, "Count of all deeds should be 2");
  });

  it("throws when trying to destory an already destroyed deed id 1", async function() {
    await assertRevert(instance.burn.sendTransaction(id1));
    var countac0 = await instance.countOfDeedsByOwner.call(accounts[0]);
    var count = await instance.countOfDeeds.call();

    assert.equal(countac0, 0, "Should have 0 deed.");
    assert.equal(count, 2, "Count of all deeds should be 2");
  });

  it("throws when trying to destory deed you are not the owner of", async function() {
    await assertRevert(instance.burn.sendTransaction(id2));
    var countac1 = await instance.countOfDeedsByOwner.call(accounts[1]);
    var count = await instance.countOfDeeds.call();

    assert.equal(countac1, 2, "Should have 2 deed.");
    assert.equal(count, 2, "Count of all deeds should be 2");
  });

  it("returns the correct array of deed ids of accounts[1]", async function() {
    var deedIds = await instance.deedsOf.call(accounts[1]);
    assert.equal(deedIds.length, 2, "Should be 2");
    assert.equal(util.intToHex(deedIds[0]), id3, "Should be id2");
    assert.equal(util.intToHex(deedIds[1]), id2, "Should be id3");
  });

  it("returns the correct array size of accounts[0]", async function() {
    var deedIds = await instance.deedsOf.call(accounts[0]);
    assert.equal(deedIds.length, 0, "Should be 0");
  });

  it("throws when trying to get array of deeds for 0x0 adress", async function() {
    await assertRevert(instance.deedsOf.call(0));
  });

  it("returns the correct array size for account[3]", async function() {
    var deedIds = await instance.deedsOf.call(accounts[3]);
    assert.equal(deedIds.length, 0, "Should be 0");
  });

  it("correctly transfers deed ownership", async function() {
    await instance.transfer.sendTransaction(accounts[0], id2, {from: accounts[1]});
    var deedIds = await instance.deedsOf.call(accounts[0]);
    var deed2Ids = await instance.deedsOf.call(accounts[1]);
    var countac0 = await instance.countOfDeedsByOwner.call(accounts[0]);
    var countac1 = await instance.countOfDeedsByOwner.call(accounts[1]);

    assert.equal(util.intToHex(deedIds[0]), id2, "Should be id2");
    assert.equal(util.intToHex(deed2Ids[0]), id3, "Should be id3");
    assert.equal(countac0, 1, "Should have 1 deed.");
    assert.equal(countac1, 1, "Should have 1 deed.");
  });

  it("throws when trying to transfer to a 0x0 account", async function() {
    await assertRevert(instance.transfer.sendTransaction(0, id2));
  });

  it("throws when trying to transfer an none existant deed", async function() {
    await assertRevert(instance.transfer.sendTransaction(accounts[1], id4));
  });

  it("throws when trying to transfer deed you are not an owner of", async function() {
    await assertRevert(instance.transfer.sendTransaction(accounts[1], id3));
  });

  it("throws when trying to transfer deed to yourself", async function() {
    await assertRevert(instance.transfer.sendTransaction(accounts[0], id2));
  });

});
