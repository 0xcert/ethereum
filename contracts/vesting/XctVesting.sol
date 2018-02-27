pragma solidity ^0.4.19;

import "../math/SafeMath.sol";
import "../tokens/Xct.sol";
import "../ownership/Ownable.sol";


/**
 * @title XCT vesting contract.
 * @dev Vesting contract for 0xcert team and advisors.
 */
contract XctVesting is Ownable {
  using SafeMath for uint256;

  /**
   * XCT Token address.
   */
  Xct public token;

  /**
   * Start timestamp of the token offering. Or do we start at the endTime?
   */
  uint256 public icoStartTime;

  // TODO(luka): this is just an approximation.
  uint256 private months = 30 days;

  /**
   * Number of decimals for vesting rates.
   */
  uint256 private rateDecimals = 3;

  /**
   * An array of vesting stages (timestamps).
   */
  uint256[10] public vestingTimestamps;

  mapping(uint256 => uint256[]) public vestingRates;

  enum Roles {Founder, Team, Advisor}

  struct Member {
    address addr;
    uint256 totalAmount;
    uint256 remainingAmount;
    uint256 atStage;
    Roles role;
  }

  /**
   * Mapping from an address to a vesting member.
   */
  mapping(address => Member) public members;

  function XctVesting(address _tokenAddress, uint256 _icoStartTime)
    public
  {
    require(_tokenAddress != address(0));
    require(_icoStartTime > 0);

    token = Xct(_tokenAddress);
    icoStartTime = _icoStartTime;

    vestingTimestamps[0] = icoStartTime;
    vestingTimestamps[1] = icoStartTime + 3 * months;
    vestingTimestamps[2] = icoStartTime + 6 * months;
    vestingTimestamps[3] = icoStartTime + 9 * months;
    vestingTimestamps[4] = icoStartTime + 12 * months;
    vestingTimestamps[5] = icoStartTime + 15 * months;
    vestingTimestamps[6] = icoStartTime + 18 * months;
    vestingTimestamps[7] = icoStartTime + 21 * months;
    vestingTimestamps[8] = icoStartTime + 24 * months;
    vestingTimestamps[9] = icoStartTime.add(months.mul(27));

    // 125 / (10 ** rateDecimals) = 0.125 (12.5%)
    vestingRates[uint(Roles.Founder)] = new uint256[](10);
    vestingRates[uint(Roles.Founder)][0] = 0;    // ICO
    vestingRates[uint(Roles.Founder)][1] = 0;    // 3 months
    vestingRates[uint(Roles.Founder)][2] = 125;  // 6 months
    vestingRates[uint(Roles.Founder)][3] = 125;  // 9 months
    vestingRates[uint(Roles.Founder)][4] = 125;  // 12 months
    vestingRates[uint(Roles.Founder)][5] = 125;  // 15 months
    vestingRates[uint(Roles.Founder)][6] = 125;  // 18 months
    vestingRates[uint(Roles.Founder)][7] = 125;  // 21 months
    vestingRates[uint(Roles.Founder)][8] = 125;  // 24 months
    vestingRates[uint(Roles.Founder)][9] = 125;  // 27 months
    assert(vestingRates[uint(Roles.Founder)].length == vestingTimestamps.length);

    vestingRates[uint(Roles.Team)] = new uint256[](10);
    vestingRates[uint(Roles.Team)][0] = 200;   // ICO
    vestingRates[uint(Roles.Team)][1] = 150;  // 3 months
    vestingRates[uint(Roles.Team)][2] = 150;  // 6 months
    vestingRates[uint(Roles.Team)][3] = 150;  // 9 months
    vestingRates[uint(Roles.Team)][4] = 150;  // 12 months
    vestingRates[uint(Roles.Team)][5] = 150;  // 15 months
    vestingRates[uint(Roles.Team)][6] = 150;  // 18 months
    vestingRates[uint(Roles.Team)][7] = 50;  // 21 months
    vestingRates[uint(Roles.Team)][8] = 0;   // 24 months
    vestingRates[uint(Roles.Team)][9] = 0;   // 27 months
    assert(vestingRates[uint(Roles.Team)].length == vestingTimestamps.length);

    vestingRates[uint(Roles.Advisor)] = new uint256[](10);
    vestingRates[uint(Roles.Advisor)][0] = 200;  // ICO
    vestingRates[uint(Roles.Advisor)][1] = 400;  // 3 months
    vestingRates[uint(Roles.Advisor)][2] = 400;  // 6 months
    vestingRates[uint(Roles.Advisor)][3] = 0;  // 9 months
    vestingRates[uint(Roles.Advisor)][4] = 0;  // 12 months
    vestingRates[uint(Roles.Advisor)][5] = 0;  // 15 months
    vestingRates[uint(Roles.Advisor)][6] = 0;  // 18 months
    vestingRates[uint(Roles.Advisor)][7] = 0;  // 21 months
    vestingRates[uint(Roles.Advisor)][8] = 0;  // 24 months
    vestingRates[uint(Roles.Advisor)][9] = 0;  // 27 months
    assert(vestingRates[uint(Roles.Advisor)].length == vestingTimestamps.length);
  }

  /**
   * @dev Add a member to the vesting contract
   * @param addr Member's address.
   * @param amount Amount of tokens to vest.
   * @param role Member's role.
   */
  function addMember(address addr, uint256 amount, string role)
    onlyOwner()
    external
    returns (bool)
  {
    require(addr != members[addr].addr);
    require(addr != address(0));
    require(amount > 0);

    if (keccak256(role) == keccak256("Founder")) {
      members[addr] = Member(addr, amount, amount, 0, Roles.Founder);
    }
    else if (keccak256(role) == keccak256("Team")) {
      members[addr] = Member(addr, amount, amount, 0, Roles.Team);
    }
    else if (keccak256(role) == keccak256("Advisor")) {
      members[addr] = Member(addr, amount, amount, 0, Roles.Advisor);
    }
    else {
      revert();
    }
    return true;
  }

  /**
   * @dev Withdraw vested tokens.
   */
  function withdraw()
    external
  {
    Member memory beneficiary = members[msg.sender];
    require(msg.sender == beneficiary.addr);
    require(beneficiary.remainingAmount > 0);

    uint256 role = uint256(beneficiary.role);
    uint256 currentStage = beneficiary.atStage;
    beneficiary.atStage += 1;

    assert(currentStage < vestingRates[role].length);
    assert(currentStage < vestingTimestamps.length);

    uint256 currentRate = vestingRates[role][currentStage];
    require(now >= vestingTimestamps[currentStage]);

    // if vestingRate == 0, then move currentStage forward if you can
    while (currentStage < vestingRates[role].length && currentRate == 0 && now >= vestingTimestamps[currentStage]) {
      currentStage = beneficiary.atStage;
      beneficiary.atStage += 1;
      currentRate = vestingRates[role][currentStage];
    }

    bool isLastStage = currentStage == vestingTimestamps.length - 1;
    uint256 tokensToWithdraw;
    // Withdraw the remainder which could include truncated quotients from previous divisions.
    if (isLastStage) {
      require(beneficiary.remainingAmount > 0);
      tokensToWithdraw = beneficiary.remainingAmount;
    }
    else {
      // TODO(luka): we could save beneficiary state before we revert to avoid repeating while loops
      // in the future.
      require(currentRate > 0);
      tokensToWithdraw = beneficiary.totalAmount.mul(currentRate).div(10 ** rateDecimals);
    }

    beneficiary.remainingAmount -= tokensToWithdraw;
    members[msg.sender] = beneficiary;
    token.transferFrom(token.owner(), beneficiary.addr, tokensToWithdraw);
  }
}
