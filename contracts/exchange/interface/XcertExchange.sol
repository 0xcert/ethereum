pragma solidity ^0.4.19;

/*
 * @dev based on: https://github.com/0xProject/contracts/blob/master/contracts/Exchange.sol
 */

contract XcertExchange {

  event LogPerformTransfer(address _from,
                           address _to,
                           address _xcert,
                           uint256 _xcertId,
                           address[] _feeRecipients,
                           uint256[] _fees,
                           uint256 _timestamp);

  event LogCancelTransfer(address _from,
                          address _to,
                          address _xcert,
                          uint256 _xcertId,
                          uint256 _xcertTransferHash);

  event LogPerformMint(address _to,
                       address _xcert,
                       uint256 _xcertId,
                       string _xcertUri,
                       address[] _feeRecipients,
                       uint256[] _fees,
                       uint256 _timestamp);

  event LogCancelMint(address _to,
                      address _xcert,
                      uint256 _xcertId,
                      string _xcertUri,
                      uint256 _xcertMintHash);

  event LogError(uint8 indexed errorId,
                 bytes32 indexed orderHash);

  /*
   * @dev Sets XCT token address, Token proxy address and xcert Proxy address.
   *//*
  function XcertExchange(address _xctToken,
                         address _tokenTransferProxy,
                         address _XcertProxy)
    public;


  /*
   * @dev Makes the xcert transfer.
   */
  function performTransfer(address _from,
                           address _to,
                           address _xcert,
                           uint256 _xcertId,
                           address[] _feeRecipients,
                           uint256[] _fees,
                           uint256 _timestamp,
                           uint8 _v,
                           bytes32 _r,
                           bytes32 _s)
    public
    returns (bool);

  /*
   * @dev Cancels xcert transfer.
   */
  function cancelTransfer(address _from,
                          address _to,
                          address _xcert,
                          uint256 _xcertId,
                          address[] _feeRecipients,
                          uint256[] _fees,
                          uint256 _timestamp)
    public
    returns(bool);

  /*
   * @dev Mints the xcert.
   */
  function performMint(address _to,
                       address _xcert,
                       uint256 _xcertId,
                       string _xcertUri,
                       address[] _feeRecipients,
                       uint256[] _fees,
                       uint256 _timestamp,
                       uint8 _v,
                       bytes32 _r,
                       bytes32 _s)
    public
    returns (bool);

  /*
   * @dev Cancels xcert mint.
   */
  function cancelMint(address _to,
                      address _xcert,
                      uint256 _xcertId,
                      string _xcertUri,
                      address[] _feeRecipients,
                      uint256[] _fees,
                      uint256 _timestamp)
    public
    returns (bool);

  /*
   * @dev Generate xcert mint hash.
   */
  function getMintDataHash(address _to,
                           address _xcert,
                           uint256 _xcertId,
                           string _xcertUri,
                           address[] _feeRecipients,
                           uint256[] _fees,
                           uint256 _timestamp)
    public
    constant
    returns (bytes32);


  /*
   * @dev Generate xcert transfer hash.
   */
  function getTransferDataHash(address _from,
                               address _to,
                               address _xcert,
                               uint256 _xcertId,
                               address[] _feeRecipients,
                               uint256[] _fees,
                               uint256 _timestamp)
    public
    constant
    returns (bytes32);

  /*
   * @dev Verifies if xcert transfer signature is valid.
   */
  function isValidSignature(address _signer,
                            bytes32 _hash,
                            uint8 _v,
                            bytes32 _r,
                            bytes32 _s)
    public
    constant
    returns (bool);


  /*
   * @dev Transfers XCT tokens via proxy.
   */
  function _transferViaTokenTransferProxy(address _token,
                                          address _from,
                                          address _to,
                                          uint _value)
    internal
    returns (bool);


  /*
   * @dev Transfers xcert via proxy.
   */
  function _transferViaXcertProxy(address _xcert,
                                  uint256 _id,
                                  address _to)
    internal
    returns (bool);

  /*
   * @dev Transfers xcert via proxy.
   */
  function _mintViaXcertProxy(address _xcert,
                              uint256 _id,
                              string _uri,
                              address _to)
    internal
    returns (bool);


  /*
   * @dev Checks if any xcert or token transfer will fail.
   *//*
  function _isTransferable(TransferData _xcertTransfer)
    internal
    constant
    returns (bool);

  /*
   * @dev Checks if xcert is mintable and if any token transfer will fail.
   *//*
  function _isMintable(MintData _xcertMint)
    internal
    constant
    returns (bool);

  /*
   * @dev Get token balance of an address.
   */
  function _getBalance(address _token,
                       address _owner)
    internal
    constant  // The called token contract may attempt to change state, but will not be able to due to an added gas limit.
    returns (uint);


  /*
   * @dev Get allowance of token given to TokenTransferProxy by an address.
   */
  function _getAllowance(address _token,
                         address _owner)
    internal
    constant  // The called token contract may attempt to change state, but will not be able to due to an added gas limit.
    returns (uint);


  /*
   * @dev Checks if XcertProxy can transfer xcert.
   */
  function _isOperator(address _xcert,
                       uint256 _xcertId)
    internal
    constant
    returns (bool);

  /*
   * @dev Checks if XcertProxy can mint xcerts.
   */
  function _isAdmin(address _xcert)
    internal
    constant
    returns (bool);

  /*
   * @dev Gets xcert owner.
   */
  function _getOwner(address _xcert)
    internal
    constant
    returns (address);

}