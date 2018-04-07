pragma solidity ^0.4.19;

import "../tokens/Xcert.sol";
import "../tokens/BurnableXcert.sol";
import "../tokens/SettableTransferXcert.sol";
import "../tokens/ChainableXcert.sol";

contract Selector {

    function calculateXcertSelector() public pure returns (bytes4) {
        Xcert i;
        return i.mint.selector
           ^ i.getProof.selector
           ^ i.setMintAuthorizedAddress.selector
           ^ i.isMintAuthorizedAddress.selector;
    }

    function calculateBurnableXcertSelector() public pure returns (bytes4) {
        BurnableXcert i;
        return i.burn.selector;
    }

    function calculateSettableTransferXcertSelector() public pure returns (bytes4) {
        SettableTransferXcert i;
        return i.setTransferable.selector;
    }

     function calculateChainableXcertSelector() public pure returns (bytes4) {
        ChainableXcert i;
        return i.chain.selector
           ^ i.getProofByIndex.selector
           ^ i.getProofCount.selector;
    }
}