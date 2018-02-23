const XcertExchange = artifacts.require('XcertExchange');
const util = require('ethjs-util');
const assertRevert = require('../helpers/assertRevert');

contract('XcertExchange', (accounts) => {
  let exchange;

  beforeEach(async function () {
    exchange = await XcertExchange.new(0, 1, 2);
  });

});
