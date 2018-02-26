pragma solidity ^0.4.19;

import "../math/SafeMath.sol";
import "../tokens/Xct.sol";
import "../ownership/Ownable.sol";


/**
 * @title XCT crowdsale contract.
 * @dev Crowdsale contract for distributing XCT token.
 */
contract XctCrowdsale is Ownable {
  using SafeMath for uint256;

  /**
   * Token being sold.
   */
  Xct public token;

  /**
   * Start timestamps for when investments are allowed (both inclusive).
   * First stage:
   *   - first 24 hours with a personal cap
   * Second stage:
   *   - after 24 hours and lasts for 7 days without a personal cap
   */
  uint256 public startTimeStageOne;

  uint256 public startTimeStageTwo;

  /**
   * End timestamp to end the crowdsale.
   */
  uint256 public endTime;

  /**
   * Maximum amount of wei to spend during the first stage of the crowdsale.
   */
  uint256 public personalWeiCap;

  /**
   * Crowdsale cap in wei.
   */
  uint256 public crowdSaleWeiCap;
  /**
   * Raised amount in wei.
   */
  uint256 public weiRaised;

  /**
   * Address where funds are collected.
   */
  address public wallet;

  /**
   * How many token units a buyer gets per wei.
   */
  uint256 public rate;

  /**
   * @dev An event which is triggered when tokens are bought.
   * @param _from The address sending tokens.
   * @param _to The address recieving tokens.
   * @param _weiAmount Purchase amount in wei.
   * @param _tokenAmount The amount of purchased tokens.
   */
  event TokenPurchase(address indexed _from, address indexed _to, uint256 _weiAmount,
                      uint256 _tokenAmount);

  /**
   * @dev Contract constructor.
   */
  function XctCrowdsale(uint256 _startTimeStageOne,
                        uint256 _personalWeiCap,
                        uint256 _crowdSaleWeiCap,
                        uint256 _rate,
                        address _walletAddress,
                        address _tokenAddress)
    public
  {
    require(_startTimeStageOne >= now);
    require(_crowdSaleWeiCap > 0);
    require(_personalWeiCap > 0);
    require(_personalWeiCap < _crowdSaleWeiCap);
    require(_rate > 0);
    require(_walletAddress != address(0));
    require(_tokenAddress != address(0));
    require(_tokenAddress != _walletAddress);

    token = Xct(_tokenAddress);
    require(token.totalSupply() >= _crowdSaleWeiCap.mul(_rate));

    startTimeStageOne = _startTimeStageOne;
    startTimeStageTwo = _startTimeStageOne + 1 days;
    endTime = startTimeStageTwo + 7 days;
    personalWeiCap = _personalWeiCap;
    crowdSaleWeiCap = _crowdSaleWeiCap;
    rate = _rate;
    wallet = _walletAddress;
  }

  /**
   * @dev Fallback function can be used to buy tokens.
   */
  function()
    external
    payable
  {
    buyTokens(msg.sender);
  }

  /**
   * @dev Low level token purchase function.
   * @param beneficiary Address which is buying tokens.
   */
  function buyTokens(address beneficiary)
    public
    payable
  {
    require(beneficiary != address(0));
    require(validPurchase(msg.value));

    uint256 weiAmount = msg.value;

    // calculate token amount to be created
    uint256 tokens = getTokenAmount(weiAmount);

    weiRaised = weiRaised.add(weiAmount);

    require(token.transferFrom(token.owner(), beneficiary, tokens));

    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    forwardFunds();
  }

  /**
   * @return true if crowdsale event has ended
   */
  function hasEnded()
    external
    view
    returns (bool)
  {
    bool capReached = weiRaised >= crowdSaleWeiCap;
    bool endTimeReached =  now >= endTime;
    return capReached || endTimeReached;
  }

  /**
   * @return number of tokens per wei amount
   */
  function getTokenAmount(uint256 weiAmount)
    internal
    view
    returns(uint256)
  {
    return weiAmount.mul(rate);
  }

  /**
   * @dev send ether to the fund collection wallet.
   */
  function forwardFunds()
    internal
  {
    wallet.transfer(msg.value);
  }


  /**
   * @dev Check if potential purchase is valid. We check:
   *   1. Stage one: purchase amount is whitin crowdsale and personal cap.
   *   2. Stage two: purchase amount is whiting crwodsale cap and crowdsale hasn't ended yet.
   * @return true if the transaction can buy tokens
   */
  function validPurchase(uint256 weiAmount)
    internal
    view
    returns (bool)
  {
    // TODO(luka): we can optimize this but this version is in the most logically deductive order.
    bool withinCrowdSaleCap = weiRaised.add(weiAmount) <= crowdSaleWeiCap;
    if (now >= startTimeStageOne && now < startTimeStageTwo) {
      bool withinPersonalCap = token.balanceOf(msg.sender).div(rate).add(weiAmount) <=
                                 personalWeiCap;
      return withinPersonalCap && withinCrowdSaleCap && weiAmount!= 0;
    }
    else if (now >= startTimeStageTwo && now < endTime) {
      return withinCrowdSaleCap && weiAmount != 0;
    }
    else {
      return false;
    }
  }
}
