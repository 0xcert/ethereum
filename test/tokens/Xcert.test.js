const Xcert = artifacts.require('Xcert');
const util = require('ethjs-util');
const assertRevert = require('../helpers/assertRevert');

contract('Xcert', (accounts) => {
  let xcert;
  let id1 = web3.sha3('test1');
  let id2 = web3.sha3('test2');
  let id3 = web3.sha3('test3');
  let id4 = web3.sha3('test4');

  beforeEach(async function () {
    xcert = await Xcert.new('Foo', 'F');
  });

  it('returns correct balanceOf after mint', async () => {
    await xcert.mint(accounts[0],id1,'url');
    const count = await xcert.balanceOf(accounts[0]);
    assert.equal(count.toNumber(), 1);
  });

  it('throws when trying to mint 2 NFTokens with the same claim', async () => {
    await xcert.mint(accounts[0], id2, 'url2');
    await assertRevert(xcert.mint(accounts[0], id2, 'url2'));
  });

  it('throws trying to mint NFToken with empty claim', async () => {
    await assertRevert(xcert.mint(accounts[0], '', ''));
  });

  it('throws when trying to mint NFToken to 0x0 address ', async () => {
    await assertRevert(xcert.mint('0', id3, ''));
  });

  it('throws when trying to mint NFToken from non owner address', async () => {
    await assertRevert(xcert.mint('0', id3, '', { from: accounts[1] }));
  });

  it('throws when trying to mint NFToken with uri length more then 2083 chars', async () => {
    await assertRevert(xcert.mint(accounts[0], id4, 'sdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfddfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfdsdfsdfsdfsdfsdfsdfdsfdsfsdfsdfsdfdsfdsfdsfdsfdsfdsfsdfdsfsdfsdfd'));
  });

  it('finds the correct amount of NFTokens owned by account', async () => {
    await xcert.mint(accounts[1], id2, 'url2');
    await xcert.mint(accounts[1], id3, 'url3');
    const count = await xcert.balanceOf(accounts[1]);
    assert.equal(count.toNumber(), 2);
  });

  it('throws when trying to get count of NFTokens owned by 0x0 address', async () => {
    await assertRevert(xcert.balanceOf('0'));
  });

  it('finds the correct owner of NFToken id', async () => {
    await xcert.mint(accounts[1], id2, 'url2');
    const address = await xcert.ownerOf(id2);
    assert.equal(address, accounts[1]);
  });

  it('throws when trying to find owner od none existant NFToken id', async () => {
    await assertRevert(xcert.ownerOf(id4));
  });

  it('correctly approves account', async () => {
    await xcert.mint(accounts[0], id2, 'url2');
    await xcert.approve(accounts[1], id2);
    const address = await xcert.getApproved(id2);
    assert.equal(address, accounts[1]);
  });

  it('correctly cancels approval of account[1]', async () => {
    await xcert.mint(accounts[0], id2, 'url2');
    await xcert.approve(accounts[1], id2);
    await xcert.approve(0, id2);
    const address = await xcert.getApproved(id2);
    assert.equal(address, 0);
  });

  it('throws when trying to get approval of none existant NFToken id', async () => {
    await assertRevert(xcert.getApproved(id4));
  });

/*  it('correctly approves and take ownership of NFToken id 2 from account[0] to account[1]', async () => {
    await xcert.mint(accounts[0], id2, 'url2');
    await xcert.approve(accounts[1], id2);
    await xcert.transferFrom(id2, {from: accounts[1]});
    const countac0 = await xcert.balanceOf(accounts[0]);
    const countac1 = await xcert.balanceOf(accounts[1]);
    const owner = await xcert.ownerOf(id2);
    assert.equal(owner, accounts[1]);
    assert.equal(countac0, 0);
    assert.equal(countac1, 1);
  });

  it('throws when trying to take ownership that is not approved for', async () => {
    await xcert.mint(accounts[1], id2, 'url2');
    await assertRevert(xcert.transferFrom(id2));
    const countac0 = await xcert.balanceOf(accounts[0]);
    const countac1 = await xcert.balanceOf(accounts[1]);
    const owner = await xcert.ownerOf(id2);
    assert.equal(owner, accounts[1]);
    assert.equal(countac0, 0);
    assert.equal(countac1, 1);
  });

  it('throws when trying to take ownership of NFToken that approval was granted but then canceled', async () => {
    await xcert.mint(accounts[1], id2, 'url2');
    await xcert.approve(accounts[0], id2, {from: accounts[1]});
    await xcert.approve(0, id2, {from: accounts[1]});
    await assertRevert(xcert.transferFrom(id2));
    const countac0 = await xcert.balanceOf(accounts[0]);
    const countac1 = await xcert.balanceOf(accounts[1]);
    const owner = await xcert.ownerOf(id2);
    assert.equal(owner, accounts[1]);
    assert.equal(countac0, 0);
    assert.equal(countac1, 1);
  });*/

  it('throws when trying to approve NFToken id that we are not the owner of', async () => {
    await xcert.mint(accounts[1], id2, 'url2');
    await assertRevert(xcert.approve(accounts[1], id2));
    const address = await xcert.getApproved(id2);
    assert.equal(address, 0);
  });

  it('returns the correct issuer name', async () => {
    const name = await xcert.name();
    assert.equal(name, 'Foo');
  });

  it('returns the correct issuer symbol', async () => {
    const symbol = await xcert.symbol();
    assert.equal(symbol, 'F');
  });

  it('returns the correct NFToken id 2 url', async () => {
    await xcert.mint(accounts[1], id2, 'url2');
    const tokenURI = await xcert.tokenURI(id2);
    assert.equal(tokenURI, 'url2');
  });

  it('throws when trying to get uri of none existant NFToken id', async () => {
    await assertRevert(xcert.tokenURI(id4));
  });

  it('destroys NFToken id 1', async () => {
    await xcert.mint(accounts[0], id1, 'url1');
    await xcert.burn(id1);
    const count = await xcert.balanceOf(accounts[0]);
    assert.equal(count, 0);
  });

  it('throws when trying to destory an already destroyed NFToken id 1', async () => {
    await xcert.mint(accounts[0], id1, 'url1');
    await xcert.burn(id1);
    await assertRevert(xcert.burn(id1));
    const count = await xcert.balanceOf(accounts[0]);
    assert.equal(count, 0);
  });

  it('throws when trying to destory NFToken you are not the owner of', async () => {
    await xcert.mint(accounts[1], id2, 'url2');
    await assertRevert(xcert.burn(id2));
    const count = await xcert.balanceOf(accounts[1]);
    assert.equal(count, 1);
  });
});
