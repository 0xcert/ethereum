const Xct = artifacts.require('./Xct.sol');
const assertRevert = require('../helpers/assertRevert');

contract('erc/Xct', (accounts) => {
  let token;
  let owner = accounts[0];
  let totalSupply = new web3.BigNumber('4e+26');

  beforeEach(async () => {
    token = await Xct.new();
  });

  it('has correct totalSupply after construction', async () => {
    let actualSupply = await token.totalSupply();
    assert.equal(actualSupply.toString(), totalSupply.toString());
  });

  it('returns correct balances after transfer', async () => {
    await token.enableTransfer();
    await token.transfer(accounts[1], 100);
    let firstAccountBalance = await token.balanceOf(owner);
    let secondAccountBalance = await token.balanceOf(accounts[1]);
    assert.equal(firstAccountBalance.toString(), totalSupply.minus(100).toString());
    assert.equal(secondAccountBalance, 100);
  });

  it('emits Transfer event on transfer', async () => {
    await token.enableTransfer();
    let { logs } = await token.transfer(accounts[1], 100);
    let event = logs.find(e => e.event === 'Transfer');
    assert.notEqual(event, undefined);
  });

  it('throws when trying to transfer before transfer is enabled', async () => {
    await assertRevert(token.transfer(accounts[1], 100));
  });

  it('throws when trying to transfer more than available balance', async () => {
    let moreThanBalance = totalSupply.plus(1);
    await token.enableTransfer();
    await assertRevert(token.transfer(accounts[1], moreThanBalance));
  });

  it('throws when trying to transfer to 0x0', async () => {
    await token.enableTransfer();
    await assertRevert(token.transfer(0x0, 100));
  });

  it('throws when trying to transfer to contract address', async () => {
    await token.enableTransfer();
    await assertRevert(token.transfer(token.address, 100));
  });

  it('returns the correct allowance amount after approval', async () => {
    await token.approve(accounts[1], 100);
    let allowance = await token.allowance(owner, accounts[1]);
    assert.equal(allowance, 100);
  });

  it('emits Approval event after approval', async () => {
    let { logs } = await token.approve(accounts[1], 100);
    let event = logs.find(e => e.event === 'Approval');
    assert.notEqual(event, undefined);
  });

  it('returns correct balances after transfering from another account', async () => {
    await token.enableTransfer();
    await token.approve(accounts[1], 100);
    await token.transferFrom(owner, accounts[2], 100, { from: accounts[1] });
    let balance0 = await token.balanceOf(owner);
    let balance1 = await token.balanceOf(accounts[2]);
    let balance2 = await token.balanceOf(accounts[1]);
    assert.equal(balance0.toString(), totalSupply.minus(100).toString());
    assert.equal(balance1, 100);
    assert.equal(balance2, 0);
  });

  it('emits Transfer event on transferFrom', async () => {
    await token.enableTransfer();
    await token.approve(accounts[1], 100);
    let { logs } = await token.transferFrom(owner, accounts[2], 100, { from: accounts[1] });
    let event = logs.find(e => e.event === 'Transfer');
    assert.notEqual(event, undefined);
  });

  it('throws when trying to transfer more than allowed amount', async () => {
    await token.enableTransfer();
    await token.approve(accounts[1], 99);
    await assertRevert(token.transferFrom(owner, accounts[2], 100, { from: accounts[1] }));
  });

  it('throws an error when trying to transferFrom more than _from has', async () => {
    await token.enableTransfer();
    let balance0 = await token.balanceOf(owner);
    await token.approve(accounts[1], 99);
    await assertRevert(token.transferFrom(owner, accounts[2], balance0.toNumber() + 1, { from: accounts[1] }));
  });

  it('returns 0 allowance by default', async () => {
    let preApproved = await token.allowance(owner, accounts[1]);
    assert.equal(preApproved, 0);
  });

  it('increases and decreases allowance after approval', async () => {
    await token.approve(accounts[1], 50);
    let postIncrease = await token.allowance(owner, accounts[1]);
    assert.equal(postIncrease.toString(), '50');
    await token.approve(accounts[1], 0);
    await token.approve(accounts[1], 40);
    let postDecrease = await token.allowance(owner, accounts[1]);
    assert.equal(postIncrease.minus(10).toString(), postDecrease.toString());
  });

  it('throws when approving without setting it to 0 first', async () => {
    await token.approve(accounts[1], 50);
    await assertRevert(token.approve(accounts[1], 100));
  });

  it('throws when trying to transferFrom before transfers enabled', async () => {
    await token.approve(accounts[1], 100);
    await assertRevert(token.transferFrom(owner, accounts[2], 100, { from: accounts[1] }));
  });

  it('throws when trying to transferFrom to 0x0', async () => {
    await token.enableTransfer();
    await token.approve(accounts[1], 100);
    await assertRevert(token.transferFrom(owner, 0x0, 100, { from: accounts[1] }));
  });

  it('throws when trying to transferFrom to contract address', async () => {
    await token.enableTransfer();
    await token.approve(accounts[1], 100);
    await assertRevert(token.transferFrom(owner, token.address, 100, { from: accounts[1] }));
  });

  it('allows token burning by the owner', async () => {
    await token.enableTransfer();
    let { logs } = await token.burn(1, {from: owner});

    let balance = await token.balanceOf(owner);
    assert.equal(balance.toString(), totalSupply.minus(1).toString());

    let actualSupply = await token.totalSupply();
    assert.equal(actualSupply.toString(), totalSupply.minus(1).toString());

    let event = logs.find(e => e.event === 'Burn');
    assert.notEqual(event, undefined);
  });

  it('allows only owner to burn tokens', async () => {
    await assertRevert(token.burn(1, { from: accounts[1] }));
  });

  it('does not allow owner to burn more than available balance', async () => {
    await assertRevert(token.burn(totalSupply.plus(1), { from: owner }));
  });

});
