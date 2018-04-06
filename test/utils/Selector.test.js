const Xcert = artifacts.require('Xcert');
const BurnableXcert = artifacts.require('BurnableXcert');
const ChainableXcert = artifacts.require('ChainableXcert');
const SettableTransferXcert = artifacts.require('SettableTransferXcert');
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

  it('Checks SettableTransferXcert selector', async () => {
    var xcert = await SettableTransferXcert.new('Foo', 'F');
    var bytes = await selector.calculateSettableTransferXcertSelector();
    var supports = await xcert.supportsInterface(bytes);
    assert.equal(supports, true);
  });

  it('Checks ChainableXcert selector', async () => {
    var xcert = await ChainableXcert.new('Foo', 'F');
    var bytes = await selector.calculateChainableXcertSelector();
    var supports = await xcert.supportsInterface(bytes);
    assert.equal(supports, true);
  });

});
