pragma solidity ^0.4.19;

import "../tokens/BurnableXcert.sol";
import "../tokens/SettableTransferXcert.sol";

contract XcertMock is BurnableXcert, SettableTransferXcert {

function XcertMock(string _name, string _symbol)
    BurnableXcert(_name, _symbol)
    SettableTransferXcert(_name, _symbol)
    public
  {

  }
}