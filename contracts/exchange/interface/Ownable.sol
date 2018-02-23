pragma solidity ^0.4.19;

/**
 * @title Ownable
 * @dev The contract has an owner address, and provides basic authorization control
 * whitch simplifies the implementation of user permissions. This contract is based
 * on the source code at https://goo.gl/n2ZGVt.
 */
contract Ownable {

  address public owner;

  /**
   * @dev An event which is triggered when the owner is changed.
   * @param previousOwner The address of the previous owner.
   * @param newOwner The address of the new owner.
   */
  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);


  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner)
    public;

}