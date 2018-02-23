pragma solidity ^0.4.19;

contract Xcert {

  /**
   * @dev This event emits when ownership of any deed changes by any mechanism. This event
   * emits when deeds are created (`from` == 0) and destroyed (`to` == 0). During contract
   * creation, any transfers may occur without emitting `Transfer`. At the time of any transfer,
   * the "approved taker" is implicitly reset to the zero address.
   * @param _from The address sending a deed.
   * @param _to The address recieving a deed.
   * @param _deedId ID of the deed
   */
  event Transfer(address indexed _from, address indexed _to, uint256 indexed _deedId);

  /**
   * @dev The Approve event emits to log the "approved taker" for a deed - whether set for
   * the first time, reaffirmed by setting the same value, or setting to a new value. The
   * "approved taker" is the zero address if nobody can take the deed now or it is an address
   * if that address can call `takeOwnership` to attempt taking the deed. Any change to the
   * "approved taker" for a deed SHALL cause Approve to emit. However, an exception, the
   * Approve event will not emit when Transfer emits, this is because Transfer implicitly
   * denotes the "approved taker" is reset to the zero address.
   * @param _from The address of an owner.
   * @param _to Address to be approved for the given deed ID.
   * @param _deedId ID of the token to be approved.
   */
  event Approval(address indexed _from, address indexed _to, uint256 indexed _deedId);


  /*
   * @dev Returns a descriptive name for a collection of deeds.
   */
  function name()
    external
    view
    returns (string _name);

  /*
  * @notice Returns nn abbreviated name for deeds.
  */
  function symbol()
    external
    view
    returns (string _symbol);

  /*
   * @dev A distinct URI (RFC 3986) for a given deed.
   * @param _deedId Id for which we want uri.
   */
  function deedUri(uint256 _deedId)
    external
    view
    returns (string _deedUri);

  /*
   * @notice Find the owner of a deed.
   * @param _deedId The identifier for a deed we are inspecting.
   */
  function ownerOf(uint256 _deedId)
    public
    view
    returns (address _owner);

  /*
   * @dev Returns an address currently approved to take ownership of the given deed ID.
   * @param _deedId ID of the deed to query the approval of.
   */
  function approvedFor(uint256 _deedId)
    public
    view
    returns (address);

  /*
   * @dev Sets a new owner for your deed.
   * @param _to Address of a new owner.
   * @param _deedId The deed that is being transferred.
   */
  function transfer(address _to, uint256 _deedId)
    external
    payable
    returns(bool);

  /*
   * @dev Claims the ownership of a given deed ID.
   * @param _deedId ID of the deed being claimed by the msg.sender.
   */
  function takeOwnership(uint256 _deedId)
    external
    payable;

  /*
   * @dev Approves another address to claim for the ownership of the given deed ID.
   * @param _to Address to be approved for the given deed ID.
   * @param _deedId ID of the token to be approved.
   */
  function approve(address _to, uint256 _deedId)
    external
    payable;

  /*
   * @dev Mints a new deed.
   * @param _to The address that will own the minted deed.
   * @param _id of the deed to be minted by the msg.sender.
   * @param _uri that points to deed metadata (optional, max length 2083).
   */
  function mint(address _to,
                uint256 _id,
                string _uri)
    external
    returns (bool);

 /*
  * @dev Burns a specified deed.
  * @param _deedId Id of the deed we want to burn.
  */
 function burn(uint256 _deedId)
   external;

  /*
   * @dev Returns the count of deeds tracked by this contract.
   */
  function countOfDeeds()
    external
    view
    returns (uint256);

  /*
   * @dev Returns the count of all deeds assigent to owner.
   * @param _owner Address where we are interested in deeds owned by them.
   */
  function countOfDeedsByOwner(address _owner)
    public
    view
    returns (uint256 _count);

  /*
   * @dev Enumerate deeds assigned to an owner (sort order not specified).
   * @param _owner An address where we are interested in deed owned by them.
   * @param _index A counter less than `countOfDeedsByOwner(_owner)`.
   */
  function deedOfOwnerByIndex(address _owner, uint256 _index)
    external
    view
    returns (uint256 _deedId);

  /*
   * @dev Gets all deed IDs of the specified address.
   * @param _owner Address for the deed's owner.
   * @return _ownedDeedIds Eepresenting all deed IDs owned by the passed address.
   */
  function deedsOf(address _owner)
    external
    view
    returns (uint256[] _ownedDeedIds);
}
