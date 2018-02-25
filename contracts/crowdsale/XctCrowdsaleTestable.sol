pragma solidity ^0.4.19;

import "./XctCrowdsale.sol";


/**
  * @title This contract adds additional test functions to the crowdsale contract.
  * Used to properly test internal functions and contract states which would otherwise be
  * hard to set up. There are two types of functions; one change contract state and other
  * visibility of contract functions. Both have their own naming pattern:
  * 1. Ones that change values of contract variables: `_testSet<variableName>()`.
  * 2. Ones that change function visibility: `<functionName>Wrapper()`.
  */
contract XctCrowdsaleTestable is XctCrowdsale {
  /**
   * @dev Tester's address who gains access to super powers.
   */
  address public contractTesterAddr;

  /**
   * @dev check tester's address who is the only one allowed to call _test functions
   */
  modifier onlyTester() {
    require(msg.sender == contractTesterAddr);
    _;
  }

  function XctCrowdsaleTestable(uint256 _startTimeStageOne,
                                uint256 _personalWeiCap,
                                uint256 _crowdSaleWeiCap,
                                uint256 _rate,
                                address _walletAddress,
                                address _tokenAddress,
                                address _contractTesterAddr)
    XctCrowdsale(_startTimeStageOne,
                 _personalWeiCap,
                 _crowdSaleWeiCap,
                 _rate,
                 _walletAddress,
                 _tokenAddress)
    public
  {
    contractTesterAddr = _contractTesterAddr;
  }

  /**
   * @dev Sets weiRaised value.
   * @param amount New amount.
   */
  function _testSetWeiRaised(uint256 amount)
    external
  {
    weiRaised = amount;
  }

  /**
   * @dev Calls internal forwardFunds function.
   */
  function forwardFundsWrapper()
    external
    payable
  {
    super.forwardFunds();
  }

  /**
   * @dev Calls internal validPurchase function.
   * @param weiAmount Wei amount.
   */
  function validPurchaseWrapper(uint256 weiAmount)
    external
    view
    returns (bool)
  {
    return super.validPurchase(weiAmount);
  }

  /**
   * @dev Calls internal getTokenAmount function.
   * @param weiAmount Wei amount.
   */
  function getTokenAmountWrapper(uint256 weiAmount)
    external
    view
    returns (uint256)
  {
    return super.getTokenAmount(weiAmount);
  }

}
