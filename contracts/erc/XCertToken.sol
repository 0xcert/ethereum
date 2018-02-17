pragma solidity ^0.4.19;

import "../math/SafeMath.sol";

/*
 * @title XCT
 * @dev XCert Token is a standard ERC20 token. This contract is based on:
 * - OpenZeppelin contracts: goo.gl/hkHBWk
 * - BeeToken Contract: goo.gl/QqZqDb
 * This token is Burnable:
 * - Token that can be irreversibly burned (destroyed).
 * This token is Ownable:
 * - The Ownable contract has an owner address, and provides basic authorization control
 *   functions, this simplifies the implementation of "user permissions".
 */

contract XCertToken {
  using SafeMath for uint256;

  address public owner;
  mapping(address => uint256) balances;
  mapping (address => mapping (address => uint256)) internal allowed;
  uint256 totalSupply_;

  string public name = "XCert Token";
  string public symbol = "XCT";
  uint8 public decimals = 18;
  uint256 public constant INITIAL_SUPPLY = 400000000000000000000000000; // 400 mio
  bool public transferEnabled = false;

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
  event Burn(address indexed burner, uint256 value);
  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

  /**
    * @dev Check if token transfer is allowed.
    */
  modifier onlyWhenTransferAllowed() {
      require(transferEnabled);
      _;
  }

  /**
    * @dev Check if address is a valid destination to transfer tokens to.
    */
  modifier validDestination(address to) {
    require(to != address(0x0));
    require(to != address(this));
    require(to != owner);
    _;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   * This modifier is based on Ownable implementation from goo.gl/GZEhaq
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  /**
    * @dev Token contract constructor.
    */
  function XCertToken()
    public
  {
    owner = msg.sender;
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = totalSupply_;
    Transfer(address(0x0), msg.sender, totalSupply_);
  }

  /**
    * @dev Enable transfers.
    */
  function enableTransfer()
    external
    onlyOwner
  {
    transferEnabled = true;
  }

  /**
   * @dev total number of tokens in existence. This function is based on BasicToken implementation
   * from goo.gl/GZEhaq
   * at goo.gl/GZEhaq
   */
  function totalSupply()
    public
    view
    returns (uint256)
  {
    return totalSupply_;
  }

  /**
   * @dev Transfer tokens to a specified address. This function is based on BasicToken
   * implementation from goo.gl/GZEhaq
   * @param _to The address to transfer to.
   * @param _value The amount to be transferred.
   */
  function transfer(address _to,
                    uint256 _value)
    public
    onlyWhenTransferAllowed
    validDestination(_to)
    returns (bool)
  {
    require(_value <= balances[msg.sender]);

    // SafeMath.sub will throw if there is not enough balance.
    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);
    Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
   * @dev Gets the balance of the specified address. This function is based on BasicToken
   * implementation from goo.gl/GZEhaq
   * @param _owner The address to query the the balance of.
   * @return An uint256 representing the amount owned by the passed address.
   */
  function balanceOf(address _owner)
    public
    view
    returns (uint256 balance) {
    return balances[_owner];
  }

  /**
   * @dev Transfer tokens from one address to another. This function is based on StandardToken
   * implementation from goo.gl/GZEhaq
   * @param _from address The address which you want to send tokens from
   * @param _to address The address which you want to transfer to
   * @param _value uint256 the amount of tokens to be transferred
   */
  function transferFrom(address _from,
                        address _to,
                        uint256 _value)
    public
    onlyWhenTransferAllowed
    validDestination(_to)
    returns (bool)
  {
    require(_value <= balances[_from]);
    require(_value <= allowed[_from][msg.sender]);

    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
    Transfer(_from, _to, _value);
    return true;
  }

  /**
   * @dev Approve the passed address to spend the specified amount of tokens on behalf
   * of msg.sender.
   * This function is based on StandardToken implementation from goo.gl/GZEhaq and goo.gl/fG8R4i
   *
   * NOTE: To change the approve amount you first have to reduce the spender's
   * allowance to zero by calling `approve(_spender, 0)` if it is not
   * already 0 to mitigate the race condition described here:
   * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
   *
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(address _spender,
                   uint256 _value)
    public
    returns (bool)
  {
    require((_value == 0) || (allowed[msg.sender][_spender] == 0));
    allowed[msg.sender][_spender] = _value;
    Approval(msg.sender, _spender, _value);
    return true;
  }

  /**
   * @dev Function to check the amount of tokens that an owner allowed to a spender.
   * This function is based on StandardToken implementation from goo.gl/GZEhaq
   *
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint256 specifying the amount of tokens still available for the spender.
   */
  function allowance(address _owner,
                     address _spender)
    public
    view
    returns (uint256)
  {
    return allowed[_owner][_spender];
  }

  /**
   * @dev Burns a specific amount of tokens. Only owner is allowed to do this.
   * This function is based on BurnableToken implementation from goo.gl/GZEhaq
   *
   * @param _value The amount of token to be burned.
   */
  function burn(uint256 _value)
    public
    onlyOwner
  {
    require(_value <= balances[msg.sender]);
    // no need to require value <= totalSupply, since that would imply the
    // sender's balance is greater than the totalSupply, which *should* be an assertion failure

    address burner = msg.sender;
    balances[burner] = balances[burner].sub(_value);
    totalSupply_ = totalSupply_.sub(_value);
    Burn(burner, _value);
    // This is going to be added in the future version of OpenZeppelin's BurnableToken
    // implementation. We add it now.
    Transfer(burner, address(0x0), _value);
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * This function is based on Ownable implementation from goo.gl/GZEhaq
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner)
    public
    onlyOwner
  {
    require(newOwner != address(0x0));
    OwnershipTransferred(owner, newOwner);
    owner = newOwner;
  }
}
