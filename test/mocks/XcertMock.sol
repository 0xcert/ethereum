pragma solidity ^0.4.19;

import "../../contracts/tokens/BurnableXcert.sol";
import "../../contracts/tokens/SettableTransferXcert.sol";
import "../../contracts/tokens/ChainableXcert.sol";

contract XcertMock is BurnableXcert, SettableTransferXcert, ChainableXcert {

function XcertMock(string _name, string _symbol)
    BurnableXcert(_name, _symbol)
    SettableTransferXcert(_name, _symbol)
    ChainableXcert(_name, _symbol)
    public
  {

  }
}