const assertRevert = require('../helpers/assertRevert');
const { advanceBlock } = require('../helpers/advanceToBlock');
const { increaseTime, increaseTimeTo, duration } = require('../helpers/increaseTime');
const latestTime = require('../helpers/latestTime');
const ether = require('../helpers/ether');

const BigNumber = web3.BigNumber;

const XctVesting = artifacts.require('./XctVesting.sol');
const Xct = artifacts.require('./Xct.sol');


contract('vesting/XctVesting', (accounts) => {
  let vestingOwner = accounts[1];
  let tokenOwner = accounts[2];
  let founder = accounts[4];
  let team = accounts[5];
  let advisor = accounts[6];

  let icoStartTime;
  let token;
  let vesting;

  before(async () => {
    // Advance to the next block to correctly read time in the solidity "now"
    // function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async () => {
    icoStartTime = latestTime() + duration.hours(1);
    token = await Xct.new({from: tokenOwner});
    vesting = await XctVesting.new(token.address, icoStartTime, {from: vestingOwner});
    await token.approve(vesting.address, 1000, {from: tokenOwner});
    // TODO(luka): we enable transfers for tests. Otherwise we need to add
    // vesting address to token `onlyWhenTransferAllowed` modifier in order to transfer tokens
    // during the ICO. If we can do it after the ICO, then fine because we'll unlock transfers
    // for everyone.
    await token.enableTransfer({from: tokenOwner});
  });

  it('constructor should fail with zero token address', async () => {
    await assertRevert(XctVesting.new(0, icoStartTime));
  });

  it('constructor should fail with zero ico start time', async () => {
    await assertRevert(XctVesting.new(token.address, 0));
  });

  it('constructor initialize expected variables', async () => {
    let tokenAddr = await vesting.token.call();
    assert.strictEqual(tokenAddr.toString(), token.address);

    let actualIcoStartTime = await vesting.icoStartTime.call();
    assert.strictEqual(actualIcoStartTime.toString(), icoStartTime.toString());

    let firstVestingTs = await vesting.vestingTimestamps.call(0);
    assert.strictEqual(firstVestingTs.toString(), icoStartTime.toString());

    let lastVestingTs = await vesting.vestingTimestamps.call(9);
    assert.strictEqual(lastVestingTs.toString(), (icoStartTime + duration.days(27 * 30)).toString());
  });

  it('addMember should add a founder', async () => {
    await vesting.addMember(founder, 100, "Founder", {from: vestingOwner});
    let actualFounder = await vesting.members.call(founder);
    assert.strictEqual(actualFounder[0], founder); // address
    assert.strictEqual(actualFounder[1].toString(), "100"); // totalAmount
    assert.strictEqual(actualFounder[2].toString(), "100"); // remainingAmount
    assert.strictEqual(actualFounder[3].toString(), "0"); // stageAt
    assert.strictEqual(actualFounder[4].toString(), "0"); // 0 is Founder
  });

  it('addMember should add a team member', async () => {
    await vesting.addMember(team, 100, "Team", {from: vestingOwner});
    let actualTeam = await vesting.members.call(team);
    assert.strictEqual(actualTeam[0], team);
    assert.strictEqual(actualTeam[1].toString(), "100"); // totalAmount
    assert.strictEqual(actualTeam[2].toString(), "100"); // remainingAmount
    assert.strictEqual(actualTeam[3].toString(), "0"); // stageAt
    assert.strictEqual(actualTeam[4].toString(), "1"); // 1 is Team
  });

  it('addMember should add an advisor', async () => {
    await vesting.addMember(advisor, 100, "Advisor", {from: vestingOwner});
    let actualAdvisor = await vesting.members.call(advisor);
    assert.strictEqual(actualAdvisor[0], advisor);
    assert.strictEqual(actualAdvisor[1].toString(), "100"); // totalAmount
    assert.strictEqual(actualAdvisor[2].toString(), "100"); // remainingAmount
    assert.strictEqual(actualAdvisor[3].toString(), "0"); // stageAt
    assert.strictEqual(actualAdvisor[4].toString(), "2"); // 2 is Advisor
  });

  it('addMember should not add an unknown member type', async () => {
    await assertRevert(vesting.addMember(advisor, 100, "Foo", {from: vestingOwner}));
  });

  it('addMember should not add a member type if not called by owner', async () => {
    await assertRevert(vesting.addMember(advisor, 100, "Foo", {from: advisor}));
  });

  it('withdraw should withdraw tokens at ICO time / first stage for team member', async () => {
    let firstBalance = await token.balanceOf(team);
    assert.strictEqual(firstBalance.toString(), "0");

    await vesting.addMember(team, 100, "Team", {from: vestingOwner});
    await increaseTimeTo(icoStartTime + duration.seconds(30));
    await vesting.withdraw({from: team});

    let secondBalance = await token.balanceOf(team);
    assert.strictEqual(secondBalance.toString(), "20");
  });

  it('withdraw should only allow one withdrawal per vesting period', async () => {
    await vesting.addMember(team, 100, "Team", {from: vestingOwner});
    await increaseTimeTo(icoStartTime + duration.seconds(30));
    await vesting.withdraw({from: team});
    await assertRevert(vesting.withdraw({from: team}));
  });

  it('withdraw should not allow one withdrawal for non-vesting members', async () => {
    await increaseTimeTo(icoStartTime + duration.seconds(30));
    await assertRevert(vesting.withdraw({from: team}));
  });

  it('withdraw should withdraw tokens for founder at the 3rd vesting stage', async () => {
    let firstBalance = await token.balanceOf(founder);
    assert.strictEqual(firstBalance.toString(), "0");

    await vesting.addMember(founder, 50, "Founder", {from: vestingOwner});
    let actualFounder = await vesting.members.call(founder);
    assert.strictEqual(actualFounder[3].toString(), "0");

    // Six months + 1 month - available 12.5%
    await increaseTimeTo(icoStartTime + duration.days(30 * 7));

    await vesting.withdraw({from: founder});
    actualFounder = await vesting.members.call(founder);
    assert.strictEqual(actualFounder[3].toString(), "3");
    currentBalance = await token.balanceOf(founder);
    assert.strictEqual(currentBalance.toString(), "6");

    actualFounder = await vesting.members.call(founder);
    assert.strictEqual(actualFounder[2].toString(), "44"); // Remainig amount
  });

  it('withdraw should withdraw all tokens for advisor', async () => {
    let firstBalance = await token.balanceOf(advisor);
    assert.strictEqual(firstBalance.toString(), "0");

    await vesting.addMember(advisor, 60, "Advisor", {from: vestingOwner});

    // Clear all vesting periods
    await increaseTimeTo(icoStartTime + duration.days(30 * 28));

    // We can withdraw per vesting period - 1st period w/ 20% tokens
    await vesting.withdraw({from: advisor});
    currentBalance = await token.balanceOf(advisor);
    assert.strictEqual(currentBalance.toString(), "12");

    // We can withdraw per vesting period - 2nd period w/ % tokens
    await vesting.withdraw({from: advisor});
    currentBalance = await token.balanceOf(advisor);
    assert.strictEqual(currentBalance.toString(), "36");

    // We can withdraw per vesting period - 3rd  period w/ % tokens
    await vesting.withdraw({from: advisor});
    currentBalance = await token.balanceOf(advisor);
    assert.strictEqual(currentBalance.toString(), "60");

    actualAdvisor = await vesting.members.call(advisor);
    assert.strictEqual(actualAdvisor[2].toString(), "0"); // Remainig amount

    await assertRevert(vesting.withdraw({from: advisor}));
  });
});
