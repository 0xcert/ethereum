
pragma solidity 0.4.19;

/*
 * @dev based od: https://github.com/0xProject/contracts/blob/master/contracts/TokenTransferProxy.sol
 */


import "../tokens/Xcert.sol";
import "../ownership/Ownable.sol";

/// @title TokenTransferProxy - Transfers tokens on behalf of contracts that have been approved via decentralized governance.
contract XcertProxy is Ownable {

  /// @dev Only authorized addresses can invoke functions with this modifier.
  modifier onlyAuthorized {
    require(authorized[msg.sender]);
    _;
  }

  modifier targetAuthorized(address target) {
    require(authorized[target]);
    _;
  }

  modifier targetNotAuthorized(address target) {
    require(!authorized[target]);
    _;
  }

  mapping (address => bool) public authorized;
  address[] public authorities;

  event LogAuthorizedAddressAdded(address indexed target, address indexed caller);
  event LogAuthorizedAddressRemoved(address indexed target, address indexed caller);

  /*
   * Public functions
   */

  /// @dev Authorizes an address.
  /// @param target Address to authorize.
  function addAuthorizedAddress(address target)
    public
    onlyOwner
    targetNotAuthorized(target)
  {
    authorized[target] = true;
    authorities.push(target);
    LogAuthorizedAddressAdded(target, msg.sender);
  }

  /// @dev Removes authorizion of an address.
  /// @param target Address to remove authorization from.
  function removeAuthorizedAddress(address target)
    public
    onlyOwner
    targetAuthorized(target)
  {
    delete authorized[target];
    for (uint i = 0; i < authorities.length; i++) {
        if (authorities[i] == target) {
            authorities[i] = authorities[authorities.length - 1];
            authorities.length -= 1;
            break;
        }
    }
    LogAuthorizedAddressRemoved(target, msg.sender);
  }

  function transfer(
    address _xcert,
    uint256 _id,
    address _to)
    external
    onlyAuthorized
    returns (bool)
  {
    return Xcert(_xcert).takeOwnership(_id);
    //return Xcert(_xcert).transfer(_to, _id);
  }

  function mint(
    address _xcert,
    uint256 _id,
    string _uri,
    address _to)
    external
    onlyAuthorized
    returns (bool)
  {
    return Xcert(_xcert).mint(_to, _id, _uri);
  }


  /*
   * Public constant functions
   */

  /// @dev Gets all authorized addresses.
  /// @return Array of authorized addresses.
  function getAuthorizedAddresses()
    public
    constant
    returns (address[])
  {
    return authorities;
  }
}