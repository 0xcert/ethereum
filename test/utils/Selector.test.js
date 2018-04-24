const Xcert = artifacts.require('Xcert');
const BurnableXcert = artifacts.require('BurnableXcert');
const ChainableXcert = artifacts.require('ChainableXcert');
const PausableXcert = artifacts.require('PausableXcert');
const RevokableXcert = artifacts.require('RevokableXcert');
const Minter = artifacts.require('Minter');
const Trader = artifacts.require('Trader');
const Swapper = artifacts.require('Swapper');
const Selector = artifacts.require('Selector');

contract('Selector', (accounts) => {

  let selector;

  beforeEach(async function () {
    selector = await Selector.new();
  });

  it('Checks Xcert selector', async () => {
    var xcert = await Xcert.new('Foo', 'F');
    var bytes = await selector.calculateXcertSelector();
    var supports = await xcert.supportsInterface(bytes);
    assert.equal(supports, true);
  });

  it('Checks BurnableXcert selector', async () => {
    var xcert = await BurnableXcert.new('Foo', 'F');
    var bytes = await selector.calculateBurnableXcertSelector();
    var supports = await xcert.supportsInterface(bytes);
    assert.equal(supports, true);
  });

  it('Checks PausableXcert selector', async () => {
    var xcert = await PausableXcert.new('Foo', 'F');
    var bytes = await selector.calculatePausableXcertSelector();
    var supports = await xcert.supportsInterface(bytes);
    assert.equal(supports, true);
  });

  it('Checks ChainableXcert selector', async () => {
    var xcert = await ChainableXcert.new('Foo', 'F');
    var bytes = await selector.calculateChainableXcertSelector();
    var supports = await xcert.supportsInterface(bytes);
    assert.equal(supports, true);
  });

  it('Checks RevokableXcert selector', async () => {
    var xcert = await RevokableXcert.new('Foo', 'F');
    var bytes = await selector.calculateRevokableXcertSelector();
    var supports = await xcert.supportsInterface(bytes);
    assert.equal(supports, true);
  });

  it('Checks Minter selector', async () => {
    var minter = await Minter.new(accounts[1], accounts[2], accounts[3]);
    var bytes = await selector.calculateMinterSelector();
    var supports = await minter.supportsInterface(bytes);
    assert.equal(supports, true);
  });

  it('Checks Trader selector', async () => {
    var trader = await Trader.new(accounts[1], accounts[2], accounts[3]);
    var bytes = await selector.calculateTraderSelector();
    var supports = await trader.supportsInterface(bytes);
    assert.equal(supports, true);
  });

  it('Checks Swapper selector', async () => {
    var swapper = await Swapper.new(accounts[1], accounts[2], accounts[3]);
    var bytes = await selector.calculateSwapperSelector();
    var supports = await swapper.supportsInterface(bytes);
    assert.equal(supports, true);
  });

});
