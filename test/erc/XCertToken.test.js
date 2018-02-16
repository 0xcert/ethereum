const assertRevert = require('../helpers/assertRevert');
const BigNumber = web3.BigNumber;

var XCertToken = artifacts.require("./XCertToken.sol");

contract('XCertToken', function (accounts) {
  let token;
  let owner = accounts[0];
  let totalSupply = new BigNumber('4e+26');

  beforeEach(async function () {
    token = await XCertToken.new();
  });

  describe('should test token constructor', function () {
    it('should return the correct totalSupply after construction', async function () {
      let actualSupply = await token.totalSupply();
      assert.equal(actualSupply.toString(), totalSupply.toString());
    });
  });

  describe('should test transfer function and its modifiers', function () {
    it('should return correct balances after transfer', async function () {
      await token.enableTransfer();
      await token.transfer(accounts[1], 100);

      let firstAccountBalance = await token.balanceOf(owner);
      assert.equal(firstAccountBalance.toString(), totalSupply.minus(100).toString());

      let secondAccountBalance = await token.balanceOf(accounts[1]);
      assert.equal(secondAccountBalance, 100);
    });
    it('should emit Transfer event on transfer', async function () {
      await token.enableTransfer();
      let {logs} = await token.transfer(accounts[1], 100);
      let event = logs.find(e => e.event === 'Transfer');
      assert.notEqual(event, undefined);
    });
    it('should throw an error when trying to transfer before transfers enabled', async function () {
      await assertRevert(token.transfer(accounts[1], 100));
    });
    it('should throw an error when trying to transfer more than balance', async function () {
      let moreThanBalance = totalSupply.plus(1);
      await token.enableTransfer();
      await assertRevert(token.transfer(accounts[1], moreThanBalance));
    });
    it('should throw an error when trying to transfer to 0x0', async function () {
      await token.enableTransfer();
      await assertRevert(token.transfer(0x0, 100));
    });
    it('should throw an error when trying to transfer to contract address', async function () {
      await token.enableTransfer();
      await assertRevert(token.transfer(token.address, 100));
    });
    it('should throw an error when trying to transfer to the contract owner', async function () {
      await token.enableTransfer();
      await assertRevert(token.transfer(owner, 100));
    });
  });

  describe('should test allowance and transferFrom', function () {
    it('should return the correct allowance amount after approval', async function () {
      await token.approve(accounts[1], 100);
      let allowance = await token.allowance(owner, accounts[1]);
      assert.equal(allowance, 100);
    });
    it('should emit Approval event after approval', async function () {
      let {logs} = await token.approve(accounts[1], 100);
      let event = logs.find(e => e.event === 'Approval');
      assert.notEqual(event, undefined);
    });
    it('should return correct balances after transfering from another account', async function () {
      await token.enableTransfer();
      await token.approve(accounts[1], 100);
      await token.transferFrom(owner, accounts[2], 100, { from: accounts[1] });

      let balance0 = await token.balanceOf(owner);
      assert.equal(balance0.toString(), totalSupply.minus(100).toString());

      let balance1 = await token.balanceOf(accounts[2]);
      assert.equal(balance1, 100);

      let balance2 = await token.balanceOf(accounts[1]);
      assert.equal(balance2, 0);
    });
    it('should emit Transfer event on transferFrom', async function () {
      await token.enableTransfer();
      await token.approve(accounts[1], 100);
      let {logs} = await token.transferFrom(owner, accounts[2], 100, { from: accounts[1] });
      let event = logs.find(e => e.event === 'Transfer');
      assert.notEqual(event, undefined);
    });
    it('should throw an error when trying to transfer more than allowed', async function () {
      await token.enableTransfer();
      await token.approve(accounts[1], 99);
      await assertRevert(token.transferFrom(owner, accounts[2], 100, { from: accounts[1] }));
    });
    it('should throw an error when trying to transferFrom more than _from has', async function () {
      await token.enableTransfer();
      let balance0 = await token.balanceOf(owner);
      await token.approve(accounts[1], 99);
      await assertRevert(token.transferFrom(owner, accounts[2], balance0.toNumber() + 1,
                        { from: accounts[1] }));
    });
  });

  describe('should test allowance updates to spender', function () {
    let preApproved;

    it('should start with zero', async function () {
      preApproved = await token.allowance(owner, accounts[1]);
      assert.equal(preApproved, 0);
    });
    it('should increase to 50 then decrease to 40', async function () {
      await token.approve(accounts[1], 50);
      let postIncrease = await token.allowance(owner, accounts[1]);
      assert.equal(preApproved.plus(50).toString(), postIncrease.toString());
      await token.approve(accounts[1], 0);
      await token.approve(accounts[1], 40);
      let postDecrease = await token.allowance(owner, accounts[1]);
      assert.equal(postIncrease.minus(10).toString(), postDecrease.toString());
    });
    it('should increase to 50 then throw an error when chaging approval without setting ' +
       'it to 0 first', async function () {
      await token.approve(accounts[1], 50);
      await assertRevert(token.approve(accounts[1], 100));
    });
  });

  describe('should test invalid transferFrom calls', function () {
    it('should throw an error when trying to transferFrom before transfers enabled',
      async function ()
    {
      await token.approve(accounts[1], 100);
      await assertRevert(token.transferFrom(owner, accounts[2], 100, { from: accounts[1] }));
    });
    it('should throw an error when trying to transferFrom to 0x0', async function () {
      await token.enableTransfer();
      await token.approve(accounts[1], 100);
      await assertRevert(token.transferFrom(owner, 0x0, 100, { from: accounts[1] }));
    });
    it('should throw an error when trying to transferFrom to contract address', async function () {
      await token.enableTransfer();
      await token.approve(accounts[1], 100);
      await assertRevert(token.transferFrom(owner, token.address, 100, { from: accounts[1] }));
    });
    it('should throw an error when trying to transferFrom owner', async function () {
      await token.enableTransfer();
      await token.approve(accounts[1], 100);
      await assertRevert(token.transferFrom(owner, owner, 100, { from: accounts[1] }));
    });
  });

  describe('should test token burning', function () {
    it('owner should be able to burn tokens', async function () {
      await token.enableTransfer();
      let {logs} = await token.burn(1, {from: owner});

      let balance = await token.balanceOf(owner);
      assert.equal(balance.toString(), totalSupply.minus(1).toString());

      let actualSupply = await token.totalSupply();
      assert.equal(actualSupply.toString(), totalSupply.minus(1).toString());

      let event = logs.find(e => e.event === 'Burn');
      assert.notEqual(event, undefined);
    });
    it('should allow only owner to burn tokens', async function () {
      await assertRevert(token.burn(1, {from: accounts[1]}));
    });
    it('should not allow owner to burn more tokens than the balance', async function () {
      await assertRevert(token.burn(totalSupply.plus(1), {from: owner}));
    });
  });

  describe('should test contract ownership and permissions', function () {
    it('should have an owner', async function () {
      let owner = await token.owner();
      assert.isTrue(owner !== 0);
    });
    it('should change owner after ownership transfer', async function () {
      let other = accounts[1];
      await token.transferOwnership(other);
      let newOwner = await token.owner();

      assert.isTrue(newOwner === other);
    });
    it('should emit OwnershipTransferred event after ownership transfer', async function () {
      let other = accounts[1];
      let {logs} = await token.transferOwnership(other);
      let event = logs.find(e => e.event === 'OwnershipTransferred');
      assert.notEqual(event, undefined);
    });
    it('should prevent non-owners from transfering', async function () {
      let other = accounts[2];
      let actualOwner = await token.owner.call();
      assert.isTrue(actualOwner !== other);
      await assertRevert(token.transferOwnership(other, {from: other}));
    });

    it('should guard ownership against stuck state', async function () {
      let originalOwner = await token.owner();
      await assertRevert(token.transferOwnership(null, { from: originalOwner }));
    });
  });
});
