pragma solidity ^0.4.19;

import "../tokens/Xcert.sol";
import "../tokens/BurnableXcert.sol";
import "../tokens/PausableXcert.sol";
import "../tokens/ChainableXcert.sol";
import "../protocol/Minter.sol";
import "../protocol/Trader.sol";
import "../protocol/Swapper.sol";

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

    function calculatePausableXcertSelector() public pure returns (bytes4) {
      PausableXcert i;
      return i.setPause.selector;
    }

    function calculateChainableXcertSelector() public pure returns (bytes4) {
      ChainableXcert i;
      return i.chain.selector
         ^ i.getProofByIndex.selector
         ^ i.getProofCount.selector;
    }

    function calculateMinterSelector() public pure returns (bytes4) {
      Minter i;
      return i.getTokenAddress.selector
         ^ i.getTokenTransferProxyAddress.selector
         ^ i.getXcertMintProxyAddress.selector
         ^ i.performMint.selector
         ^ i.cancelMint.selector
         ^ i.getMintDataClaim.selector
         ^ i.isValidSignature.selector;
    }

    function calculateTraderSelector() public pure returns (bytes4) {
      Trader i;
      return i.getTokenAddress.selector
         ^ i.getTokenTransferProxyAddress.selector
         ^ i.getNFTokenTransferProxyAddress.selector
         ^ i.performTransfer.selector
         ^ i.cancelTransfer.selector
         ^ i.getTransferDataClaim.selector
         ^ i.isValidSignature.selector;
    }

    function calculateSwapperSelector() public pure returns (bytes4) {
      Swapper i;
      return i.getTokenAddress.selector
         ^ i.getTokenTransferProxyAddress.selector
         ^ i.getNFTokenTransferProxyAddress.selector
         ^ i.performSwap.selector
         ^ i.cancelSwap.selector
         ^ i.getSwapDataClaim.selector
         ^ i.isValidSignature.selector;
    }
}