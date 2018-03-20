pragma solidity ^0.4.19;

import "./Xcert.sol";

contract BurnableXcert is Xcert {

  function BurnableXcert(string _name, string _symbol)
    Xcert(_name, _symbol)
    public
  {
    //TODO(Tadej): add for burnable Xcert
    //supportedInterfaces[0x5b5e139f] = true; // BurnableXcert
  }

  /*
   * @dev Burns a specified NFToken.
   * @param _tokenId Id of the NFToken we want to burn.
   */
  function burn(uint256 _tokenId)
    canOperate(_tokenId)
    validNFToken(_tokenId)
    external
  {
    if (getApproved(_tokenId) != 0) {
      clearApproval(msg.sender, _tokenId);
    }

    removeNFToken(msg.sender, _tokenId);
    delete idToUri[_tokenId];
    delete idToProof[_tokenId];

    Transfer(msg.sender, address(0), _tokenId);
  }

}