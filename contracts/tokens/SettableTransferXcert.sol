pragma solidity ^0.4.19;

import "./Xcert.sol";

contract SettableTransferXcert is Xcert {

  /*
   * @dev This emits when ability of beeing able to transfer NFTokens changes.
   */
  event TransferStatusChange(bool _isTransferable);

  /*
   * @dev Are NFTokens transferable or not.
   */
  bool public isTransferable;

  function SettableTransferXcert(string _name, string _symbol)
    Xcert(_name, _symbol)
    public
  {
    supportedInterfaces[0x9cd23707] = true; // SettableTransferXcert
    isTransferable = true;
  }

  /*
   * @dev Guarantees that the msg.sender is allowed to transfer NFToken.
   * @param _tokenId ID of the NFToken to transfer.
   */
  modifier canTransfer(uint256 _tokenId) {
    address owner = idToOwner[_tokenId];
    require(isTransferable && (
      owner == msg.sender
      || getApproved(_tokenId) == msg.sender
      || ownerToOperators[owner][msg.sender])
    );

    _;
  }

  /*
   * @dev Sets if NFTokens are transferable or not.
   * @param _isTransferable Transferable status.
   */
  function setTransferable(bool _isTransferable)
    external
    onlyOwner
  {
    require(isTransferable != _isTransferable);
    isTransferable = _isTransferable;
    TransferStatusChange(_isTransferable);
  }

}