const assertRevert = require('../helpers/assertRevert');
const { advanceBlock } = require('../helpers/advanceToBlock');
const { increaseTime, increaseTimeTo, duration } = require('../helpers/increaseTime');
const latestTime = require('../helpers/latestTime');
const ether = require('../helpers/ether');

const BigNumber = web3.BigNumber;

const XctCrowdsale = artifacts.require('./XctCrowdsale.sol');
const XctCrowdsaleTestable = artifacts.require('./XctCrowdsaleTestable.sol');
const Xct = artifacts.require('./Xct.sol');


contract('crowdsale/XctCrowdsale', (accounts) => {
  let rate = new BigNumber(1000);
  let crowdsaleCap = ether(100);
  let personalCap = ether(5);
  let crowdsaleOwner = accounts[1];
  let tokenOwner = accounts[2];
  let wallet = accounts[3];
  let buyerOne = accounts[4];
  let buyerTwo = accounts[5];
  let _tester = accounts[6];  // tester should never be the default account!

  let firstStageStart;
  let token;
  let crowdsale;
  let secondStageStart;
  let endTime;

  before(async () => {
    // Advance to the next block to correctly read time in the solidity "now"
    // function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async () => {
    firstStageStart = latestTime() + duration.hours(1);
    token = await Xct.new({from: tokenOwner});
    crowdsale = await XctCrowdsaleTestable.new(firstStageStart,
                                                    personalCap,
                                                    crowdsaleCap,
                                                    rate,
                                                    wallet,
                                                    token.address,
                                                    _tester,
                                                    {from: crowdsaleOwner});
    let _secondStageStart = await crowdsale.startTimeStageTwo.call();
    secondStageStart = _secondStageStart.toNumber();
    let _endTime = await crowdsale.endTime.call();
    endTime= _endTime.toNumber();
  });

  it('time stages should be in the right order', async () => {
    assert.ok(firstStageStart < secondStageStart < endTime);
  });

  it('constructor should fail with start time in the past', async () => {
    firstStageStartPast = latestTime() - duration.weeks(1);
    await assertRevert(XctCrowdsale.new(firstStageStartPast, 0, crowdsaleCap,
                                        rate, wallet, token.address));
  });

  it('constructor should fail with zero personal cap', async () => {
    await assertRevert(XctCrowdsale.new(firstStageStart, 0, crowdsaleCap,
                                        rate, wallet, token.address));
  });

  it('constructor should fail with zero crowdsale cap', async () => {
    await assertRevert(XctCrowdsale.new(firstStageStart, personalCap, 0,
                                        rate, wallet, token.address));
  });

  it('constructor should fail if personalCap > crowdsaleCap', async () => {
    await assertRevert(XctCrowdsale.new(firstStageStart, ether(100), ether(99),
                                        rate, wallet, token.address));
  });

  it('constructor should fail with zero rate', async () => {
    await assertRevert(XctCrowdsale.new(firstStageStart, personalCap, crowdsaleCap,
                                        0, wallet, token.address));
  });

  it('constructor should fail with zero wallet address', async () => {
    await assertRevert(XctCrowdsale.new(firstStageStart, personalCap, crowdsaleCap,
                                        rate, 0, token.address));
  });

  it('constructor should fail with zero token address', async () => {
    await assertRevert(XctCrowdsale.new(firstStageStart, personalCap, crowdsaleCap,
                                        rate, wallet, 0));
  });

  it('constructor should fail if token address == wallet address', async () => {
    await assertRevert(XctCrowdsale.new(firstStageStart, personalCap, crowdsaleCap,
                                        rate, wallet, wallet));
  });

  it('constructor should fail if total supply of token < crowdsale cap', async () => {
    await assertRevert(XctCrowdsale.new(firstStageStart, personalCap, ether(9999999),
                                        rate, wallet, token.address));
  });

  it('constructor should not fail while initializing a valid contract', async () => {
    await XctCrowdsale.new(firstStageStart, personalCap, crowdsaleCap,
                           rate, wallet, token.address);
  });

  it('validPurchase should return false when not yet first stage', async () => {
    let weiAmount = ether(0.05);
    assert.strictEqual(await crowdsale.validPurchaseWrapper(weiAmount, {from: buyerOne}),
                       false);
  });

  it('validPurchase should return true when first stage and no caps reached', async () => {
    // Fast forward into the first stage of token sale
    await increaseTimeTo(firstStageStart + duration.seconds(30));
    let weiAmount = ether(0.05);
    assert.strictEqual(await crowdsale.validPurchaseWrapper(weiAmount, {from: buyerOne}),
                       true);
  });

  it('validPurchase should return false when first stage and 0 wei sent', async () => {
    // Fast forward into the first stage of token sale
    await increaseTimeTo(firstStageStart + duration.minutes(10));
    assert.strictEqual(await crowdsale.validPurchaseWrapper(0, {from: buyerOne}), false);
  });

  it('validPurchase should return false when first stage and personal cap reached', async () => {
    // Set up buyerOne's token balance to be > personal cap for 1st stage
    await token.enableTransfer({from: tokenOwner});
    await token.transfer(buyerOne, rate.mul(personalCap), {from: tokenOwner});
    await token.disableTransfer({from: tokenOwner});
    // Fast forward into the first stage of token sale
    await increaseTimeTo(firstStageStart + duration.minutes(10));
    let weiAmount = ether(1);
    // 5 + 1 eth > 5 personal cap eth
    assert.strictEqual(await crowdsale.validPurchaseWrapper(weiAmount, {from: buyerOne}),
                       false);
  });

  it('validPurchase should return false when first stage and crowdsale cap reached', async () => {
    crowdsale._testSetWeiRaised(crowdsaleCap, {from: _tester})
    // Fast forward into the first stage of token sale
    await increaseTimeTo(firstStageStart + duration.minutes(10));
    let weiAmount = ether(1);
    assert.strictEqual(await crowdsale.validPurchaseWrapper(weiAmount, {from: buyerOne}),
                       false);
  });

  it('validPurchase should return true when 2nd stage and crowdsale cap not reached', async () => {
    // Fast forward into the second stage of token sale
    await increaseTimeTo(secondStageStart + duration.seconds(10));
    let weiAmount = personalCap.add(ether(2));
    assert.strictEqual(await crowdsale.validPurchaseWrapper(weiAmount, {from: buyerTwo}),
                       true);
  });

  it('validPurchase should return false when second stage and crowdsale cap reached', async () => {
    crowdsale._testSetWeiRaised(crowdsaleCap, {from: _tester})
    // Fast forward into the second stage of token sale
    await increaseTimeTo(secondStageStart + duration.seconds(30));
    let weiAmount = personalCap.add(ether(2));
    assert.strictEqual(await crowdsale.validPurchaseWrapper(weiAmount, {from: buyerTwo}),
                       false);
  });

  it('validPurchase should return false when end time reached', async () => {
    // Fast forward into the end of the token sale
    await increaseTimeTo(endTime + duration.seconds(30));
    let weiAmount = ether(0.2);
    assert.strictEqual(await crowdsale.validPurchaseWrapper(weiAmount, {from: buyerTwo}),
                       false);
  });

  it('forwardFunds should send eth to wallet address', async () => {
    let weiAmount = ether(0.2);
    let initialBalance = await web3.eth.getBalance(wallet);
    await crowdsale.forwardFundsWrapper({from: buyerTwo, value: weiAmount});
    let newBalance = await web3.eth.getBalance(wallet);
    assert.strictEqual(newBalance.sub(initialBalance).toString(), ether(0.2).toString());
  });

  it('getTokenAmount should return correct num of tokens for a given wei', async () => {
    let weiAmount = ether(0.2);
    let tokensAmount = await crowdsale.getTokenAmountWrapper(weiAmount, {from: buyerTwo});
    assert.strictEqual(tokensAmount.toString(), weiAmount.mul(rate).toString());
  });

  it('hasEnded should return false if crowdsale not started, cap not reached', async () => {
    assert.strictEqual(await crowdsale.hasEnded(), false);
  });

  it('hasEnded should return false if crowdsale in first stage, cap not reached', async () => {
    await increaseTimeTo(firstStageStart + duration.seconds(30));
    assert.strictEqual(await crowdsale.hasEnded(), false);
  });

  it('hasEnded should return false if crowdsale in second stage, cap not reached', async () => {
    await increaseTimeTo(secondStageStart + duration.seconds(30));
    assert.strictEqual(await crowdsale.hasEnded(), false);
  });

  it('hasEnded should return true if crowdsale has reached end time, cap not reached', async () => {
    await increaseTimeTo(endTime + duration.seconds(30));
    assert.strictEqual(await crowdsale.hasEnded(), true);
  });

  it('hasEnded should return true if crowdsale reached the cap, end time not reached', async () => {
    crowdsale._testSetWeiRaised(crowdsaleCap, {from: _tester})
    assert.strictEqual(await crowdsale.hasEnded(), true);
  });

  it('hasEnded should return true if crowdsale reached the cap and end time', async () => {
    await increaseTimeTo(endTime + duration.seconds(30));
    crowdsale._testSetWeiRaised(crowdsaleCap, {from: _tester})
    assert.strictEqual(await crowdsale.hasEnded(), true);
  });

  it('buyTokens should purchase tokens', async () => {
    let weiAmount = ether(0.05);
    let shouldGetTokens = weiAmount.mul(rate);
    let startWalletBalance = await web3.eth.getBalance(wallet);
    await token.setCrowdsaleAllowance(crowdsale.address, crowdsaleCap,
                                           {from: tokenOwner});
    await increaseTimeTo(firstStageStart + duration.seconds(30));
    let { logs } = await crowdsale.buyTokens(buyerOne, {from: buyerOne, value: weiAmount});
    let actualBalance = await token.balanceOf(buyerOne);

    // Buyer should get correct number of tokens
    assert.equal(actualBalance.toString(), shouldGetTokens.toString());

    // Wallet should receive correct amount of wei
    let endWalletBalance = await web3.eth.getBalance(wallet);
    assert.strictEqual(endWalletBalance.sub(startWalletBalance).toString(), weiAmount.toString());

    // Global counter for raised wei should be increased
    let weiRaised = await crowdsale.weiRaised.call()
    assert.strictEqual(weiRaised.toString(), weiAmount.toString());

    let event = logs.find(e => e.event === 'TokenPurchase');
    assert.notEqual(event, undefined);
  });

  it('buyTokens should fail purchasing tokens if beneficiary address is 0', async () => {
    await increaseTimeTo(firstStageStart + duration.seconds(30));
    await token.setCrowdsaleAllowance(crowdsale.address, crowdsaleCap,
                                           {from: tokenOwner});
    await assertRevert(crowdsale.buyTokens(0, {from: buyerOne}));
  });

  it('buyTokens should fail purchasing tokens if validPurchase returns false', async () => {

    let weiAmount = ether(0.05);
    await token.setCrowdsaleAllowance(crowdsale.address, crowdsaleCap,
                                           {from: tokenOwner});
    // In this case crowdsale hasn't started yet
    await assertRevert(crowdsale.buyTokens(buyerOne, {from: buyerOne, value: weiAmount}));
  });

  it('buyTokens should fail purchasing tokens if token transfer fails', async () => {
    let weiAmount = ether(0.05);
    await increaseTimeTo(firstStageStart + duration.seconds(30));
    // Crowdsale contract has zero token allowance
    await assertRevert(crowdsale.buyTokens(buyerOne, {from: buyerOne, value: weiAmount}));
  });

  it('fallback function should purchase tokens', async () => {
    let weiAmount = ether(0.05);
    let shouldGetTokens = weiAmount.mul(rate);
    let startWalletBalance = await web3.eth.getBalance(wallet);
    await token.setCrowdsaleAllowance(crowdsale.address, crowdsaleCap,
                                           {from: tokenOwner});
    await increaseTimeTo(firstStageStart + duration.seconds(30));
    let { logs } = await crowdsale.sendTransaction({from: buyerOne, value: weiAmount});
    let actualBalance = await token.balanceOf(buyerOne);

    // Buyer should get correct number of tokens
    assert.equal(actualBalance.toString(), shouldGetTokens.toString());

    // Wallet should receive correct amount of wei
    let endWalletBalance = await web3.eth.getBalance(wallet);
    assert.strictEqual(endWalletBalance.sub(startWalletBalance).toString(), weiAmount.toString());

    // Global counter for raised wei should be increased
    let weiRaised = await crowdsale.weiRaised.call()
    assert.strictEqual(weiRaised.toString(), weiAmount.toString());

    let event = logs.find(e => e.event === 'TokenPurchase');
    assert.notEqual(event, undefined);
  });

  it('fallback function should fail purchasing tokens if validPurchase returns false', async () => {
    let weiAmount = ether(0.05);
    await token.setCrowdsaleAllowance(crowdsale.address, crowdsaleCap,
                                           {from: tokenOwner});
    // In this case crowdsale hasn't started yet
    await assertRevert(crowdsale.sendTransaction({from: buyerOne, value: weiAmount}));
  });

  it('buyTokens should fail purchasing tokens if token transfer fails', async () => {
    let weiAmount = ether(0.05);
    await increaseTimeTo(firstStageStart + duration.seconds(30));
    // Crowdsale contract has zero token allowance
    await assertRevert(crowdsale.sendTransaction({from: buyerOne, value: weiAmount}));
  });
});
