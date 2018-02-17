pragma solidity ^0.4.19;

import "../math/SafeMath.sol";
import "../ownership/Ownable.sol";

/*
 * @title 0xcert protocol ERC20 token.
 * @dev XCert Token is a standard ERC20 token. This contract is based on 
 * - OpenZeppelin contracts: goo.gl/hkHBWk
 * - BeeToken Contract: goo.gl/QqZqDb
 * This token is burnable:
 * - Token that can be irreversibly burned (destroyed).
 */

contract XCTToken is Ownable {
  using SafeMath for uint256;

  string public name;
  string public symbol;
  uint8 public decimals;
  mapping (address => uint256) internal balances;
  mapping (address => mapping (address => uint256)) internal allowed;
  uint256 internal currentSupply;
  uint256 public initialSupply;
  bool public transferEnabled;

  /**
   * @dev An event which is triggered when funds are transfered.
   * @param from The address sending tokens.
   * @param to The address recieving tokens.
   * @param value The amount of transferred tokens.
   */
  event Transfer(address indexed from, address indexed to, uint256 value);

  /**
   * @dev An event which is triggered when an address to spend the specified amount of
   * tokens on behalf is approved.
   * @param owner The address of an owner.
   * @param spender The address which spent the funds.
   * @param value The amount of spent tokens.
   */
  event Approval(address indexed owner, address indexed spender, uint256 value);

  /**
   * @dev An event which is triggered when tokens are burned.
   * @param burner The address which burns tokens.
   * @param value The amount of burned tokens.
   */
  event Burn(address indexed burner, uint256 value);

  /**
   * @dev Checks if tokens can be transfered.
   */
  modifier onlyWhenTransferAllowed() {
    require(transferEnabled);
    _;
  }

  /**
   * @dev Checks if the provided address is a valid destination to transfer tokens to.
   */
  modifier validDestination(address to) {
    require(to != address(0x0));
    require(to != address(this));
    _;
  }

  /**
   * @dev Contract constructor.
   */
  function XCTToken()
    public
  {
    name = "0xcert Protocol Token";
    symbol = "XCT";
    decimals = 18;

    initialSupply = 400000000000000000000000000;
    currentSupply = initialSupply;
    balances[owner] = currentSupply;

    transferEnabled = false;

    Transfer(address(0x0), owner, currentSupply);
  }

  /**
   * @dev Enables token transfers.
   */
  function enableTransfer()
    onlyOwner
    external
  {
    transferEnabled = true;
  }

  /**
   * @dev Returns the total number of tokens in circulation. This function is based on BasicToken
   * implementation at goo.gl/GZEhaq.
   */
  function totalSupply()
    public
    view
    returns (uint256)
  {
    return currentSupply;
  }

  /**
   * @dev Transfers tokens to a specified address. This function is based on BasicToken
   * implementation at goo.gl/GZEhaq.
   * @param _to The address to transfer to.
   * @param _value The amount to be transferred.
   */
  function transfer(address _to, uint256 _value)
    onlyWhenTransferAllowed
    validDestination(_to)
    public
    returns (bool)
  {
    require(_value <= balances[msg.sender]);

    balances[msg.sender] = balances[msg.sender].sub(_value); // will fail on insufficient funds
    balances[_to] = balances[_to].add(_value);

    Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
   * @dev Gets the balance of the specified address. This function is based on BasicToken
   * implementation from goo.gl/GZEhaq.
   * @param _owner The address to query for ballance.
   */
  function balanceOf(address _owner)
    public
    view
    returns (uint256)
  {
    return balances[_owner];
  }

  /**
   * @dev Transfers tokens from one address to another. This function is based on StandardToken
   * implementation at goo.gl/GZEhaq.
   * @param _from The address to send tokens from.
   * @param _to The address to transfer to.
   * @param _value The amount of tokens to transferred.
   */
  function transferFrom(address _from, address _to, uint256 _value)
    onlyWhenTransferAllowed
    validDestination(_to)
    public
    returns (bool)
  {
    require(_value <= balances[_from]);
    require(_value <= allowed[_from][msg.sender]);

    balances[_from] = balances[_from].sub(_value); // will fail on insufficient funds
    balances[_to] = balances[_to].add(_value);
    allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);

    Transfer(_from, _to, _value);
    return true;
  }

  /**
   * @dev Approves the passed address to spend the specified amount of tokens on behalf
   * of the msg.sender. This function is based on StandardToken implementation at goo.gl/GZEhaq
   * and goo.gl/fG8R4i.
   * To change the approve amount you first have to reduce the spender's allowance to zero by
   * calling `approve(_spender, 0)` if it is not already 0 to mitigate the race condition described
   * here https://goo.gl/7n9A4J.
   * @param _spender The address which will spend the funds.
   * @param _value The allowed amount of tokens to be spent.
   */
  function approve(address _spender, uint256 _value)
    public
    returns (bool)
  {
    require((_value == 0) || (allowed[msg.sender][_spender] == 0));

    allowed[msg.sender][_spender] = _value;

    Approval(msg.sender, _spender, _value);
    return true;
  }

  /**
   * @dev Returns the amount of tokens that a spender can transfer on behalf of an owner. This
   * function is based on StandardToken implementation at goo.gl/GZEhaq.
   * @param _owner The address which owns the funds.
   * @param _spender The address which will spend the funds.
   */
  function allowance(address _owner, address _spender)
    public
    view
    returns (uint256)
  {
    return allowed[_owner][_spender];
  }

  /**
   * @dev Burns a specific amount of tokens. Only owner is allowed to perform this operation. This
   * function is based on BurnableToken implementation at goo.gl/GZEhaq.
   * @param _value The amount of token to be burned.
   */
  function burn(uint256 _value)
    onlyOwner
    public
  {
    require(_value <= balances[msg.sender]);

    balances[owner] = balances[owner].sub(_value);
    currentSupply = currentSupply.sub(_value);

    Burn(owner, _value);
    Transfer(owner, address(0x0), _value);
  }

}
