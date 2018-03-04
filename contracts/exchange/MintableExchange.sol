pragma solidity ^0.4.19;


import "../math/SafeMath.sol";
import "../tokens/Xct.sol";
import "../tokens/Xcert.sol";
import "./TokenTransferProxy.sol";
import "./XcertMintProxy.sol";
import "./Exchange.sol";

/*
 * @dev based on: https://github.com/0xProject/contracts/blob/master/contracts/Exchange.sol
 */
contract MintableExchange is Exchange{

  /*
   * @dev Enum of possible errors.
   */
  enum ErrorsMint {
    MINT_ALREADY_PERFORMED, // Mint has already beed performed.
    MINT_CANCELLED // Mint was cancelled.
  }

  /*
   * @dev contract addresses
   */
  address public XCERT_MINT_PROXY_CONTRACT;

  /*
   * @dev Mapping of all canceled mints.
   */
  mapping(bytes32 => bool) public mintCancelled;

  /*
   * @dev Mapping of all performed mints.
   */
  mapping(bytes32 => bool) public mintPerformed;

  /*
   * @dev This event emmits when xcert gets mint directly to the taker.
   */
  event LogPerformMint(address _to,
                       address _xcert,
                       uint256 _xcertId,
                       string _xcertUri,
                       address[] _feeAddresses,
                       uint256[] _feeAmounts,
                       uint256 _timestamp,
                       bytes32 _xcertMintClaim);

  /*
   * @dev This event emmits when xcert mint order is canceled.
   */
  event LogCancelMint(address _to,
                      address _xcert,
                      uint256 _xcertId,
                      string _xcertUri,
                      address[] _feeAddresses,
                      uint256[] _feeAmounts,
                      uint256 _timestamp,
                      bytes32 _xcertMintClaim);

  /*
   * @dev Structure of data needed for mint.
   */
  struct MintData{
    address owner;
    address to;
    address xcert;
    uint256 xcertId;
    string xcertUri;
    address[] feeAddresses;
    uint256[] feeAmounts;
    uint256 timestamp;
    bytes32 claim;
  }

  /*
   * @dev Sets XCT token address, Token proxy address and xcert Proxy address.
   * @param _xcertToken Address pointing to XCT Token contract.
   * @param _tokenTransferProxy Address pointing to TokenTransferProxy contract.
   * @param _XcertProxy Address pointing to XcertProxy contract.
   */
  function MintableExchange(address _xctToken,
                            address _tokenTransferProxy,
                            address _nfTokenTransferProxy,
                            address _xcertMintProxy)
           Exchange (_xctToken,
                    _tokenTransferProxy,
                    _nfTokenTransferProxy)
    public
  {
    XCERT_MINT_PROXY_CONTRACT = _xcertMintProxy;
  }

  /*
   * @dev Get addresses to all associated contracts (token, tokenTransferProxy,
   * NFtokenTransferProxy, xcertMintProxy) .
   * @return Array of addresses (token, tokenTransferProxy, nfTokenTransferProxy, xcertMintProxy)
   */
  function getAddresses()
    external
    view
    returns (address[])
  {
    address[] memory addresses;
    addresses[0] = XCT_TOKEN_CONTRACT;
    addresses[1] = TOKEN_TRANSFER_PROXY_CONTRACT;
    addresses[2] = NFTOKEN_TRANSFER_PROXY_CONTRACT;
    addresses[3] = XCERT_MINT_PROXY_CONTRACT;
    return addresses;
  }


  /*
   * @dev Performs Xcert mint directly to the taker.
   * @param _to Address of Xcert reciever.
   * @param _xcert Address of Xcert contract.
   * @param _xcertId Id of Xcert (hashed certificate data that is transformed into uint256).
   * @param _xcertId Uri of Xcert (metadata uri).
   * @param _feeAddresses Addresses of all parties that need to get feeAmounts paid.
   * @param _feeAmounts Fee amounts of all the _feeAddresses (length of both have to be the same).
   * @param _timestamp Timestamp that represents the salt.
   * @param _v ECDSA signature parameter v.
   * @param _r ECDSA signature parameters r.
   * @param _s ECDSA signature parameters s.
   * @param _s _throwIfNotMintable Test the mint before performing.
   */
  function performMint(address _to,
                       address _xcert,
                       uint256 _xcertId,
                       string _xcertUri,
                       address[] _feeAddresses,
                       uint256[] _feeAmounts,
                       uint256 _timestamp,
                       uint8 _v,
                       bytes32 _r,
                       bytes32 _s,
                       bool _throwIfNotMintable)
    public
    returns (bool)
  {

    MintData memory mintData = MintData({
      owner: _getOwner(_xcert),
      to: _to,
      xcert: _xcert,
      xcertId: _xcertId,
      xcertUri: _xcertUri,
      feeAddresses: _feeAddresses,
      feeAmounts: _feeAmounts,
      timestamp: _timestamp,
      claim: getMintDataClaim(
        _to,
        _xcert,
        _xcertId,
        _xcertUri,
        _feeAddresses,
        _feeAmounts,
        _timestamp
      )
    });

    require(_feeAddresses.length == _feeAmounts.length);
    require(_to == msg.sender);
    require(mintData.owner != _to);

    require(isValidSignature(
      mintData.owner,
      mintData.claim,
      _v,
      _r,
      _s
    ));

    if(mintPerformed[mintData.claim])
    {
      LogError(uint8(ErrorsMint.MINT_ALREADY_PERFORMED), mintData.claim);
      return false;
    }

    if(mintCancelled[mintData.claim])
    {
      LogError(uint8(ErrorsMint.MINT_CANCELLED), mintData.claim);
      return false;
    }

    if (_throwIfNotMintable)
    {
      if(!_canPayFee(_to, _feeAmounts))
      {
        LogError(uint8(Errors.INSUFFICIENT_BALANCE_OR_ALLOWANCE), mintData.claim);
        return false;
      }

      if(!_canMint(_xcert))
      {
        LogError(uint8(Errors.NOT_XCERT_OWNER), mintData.claim);
        return false;
      }
    }

    mintPerformed[mintData.claim] = true;

    require(_mintViaXcertMintProxy(mintData));

    _payfeeAmounts(_feeAddresses, _feeAmounts, _to);

    LogPerformMint(
      _to,
      _xcert,
      _xcertId,
      _xcertUri,
      _feeAddresses,
      _feeAmounts,
      _timestamp,
      mintData.claim
    );

    return true;
  }


  /*
   * @dev Cancels xcert mint.
   * @param _to Address of Xcert reciever.
   * @param _xcert Address of Xcert contract.
   * @param _xcertId Id of Xcert (hashed certificate data that is transformed into uint256).
   * @param _xcertId Uri of Xcert (metadata uri).
   * @param _feeAddresses Addresses of all parties that need to get feeAmounts paid.
   * @param _feeAmounts Fee amounts of all the _feeAddresses (length of both have to be the same).
   * @param _timestamp Timestamp that represents the salt.
   */
  function cancelMint(address _to,
                      address _xcert,
                      uint256 _xcertId,
                      string _xcertUri,
                      address[] _feeAddresses,
                      uint256[] _feeAmounts,
                      uint256 _timestamp)
    public
  {
    require(msg.sender == _getOwner(_xcert));

    bytes32 claim = getMintDataClaim(
      _to,
      _xcert,
      _xcertId,
      _xcertUri,
      _feeAddresses,
      _feeAmounts,
      _timestamp
    );

    require(!mintPerformed[claim]);

    mintCancelled[claim] = true;

    LogCancelMint(
      _to,
      _xcert,
      _xcertId,
      _xcertUri,
      _feeAddresses,
      _feeAmounts,
      _timestamp,
      claim
    );
  }

  /*
   * @dev Calculates keccak-256 hash of mint data from parameters.
   * @param _to Address of Xcert reciever.
   * @param _xcert Address of Xcert contract.
   * @param _xcertId Id of Xcert (claimed certificate data that is transformed into uint256).
   * @param _xcertUri Uri poiting to Xcert metadata.
   * @param _feeAddresses Addresses of all parties that need to get feeAmounts paid.
   * @param _feeAmounts Fee amounts of all the _feeAddresses (length of both have to be the same).
   * @param _timestamp Timestamp that represents the salt.
   * @returns keccak-hash of mint data.
   */
  function getMintDataClaim(address _to,
                           address _xcert,
                           uint256 _xcertId,
                           string _xcertUri,
                           address[] _feeAddresses,
                           uint256[] _feeAmounts,
                           uint256 _timestamp)
    public
    constant
    returns (bytes32)
  {
    return keccak256(
      address(this),
      _to,
      _xcert,
      _xcertId,
      _xcertUri,
      _feeAddresses,
      _feeAmounts,
      _timestamp
    );
  }

  /*
   * @dev Mints new Xcert via XcertProxy using mint function.
   * @param _xcert Address of Xcert to mint.
   * @param _id Id of Xcert to mint.
   * @param _uri Uri of Xcert to mint.
   * @param _to Address receiving Xcert.
   * @return Success of Xcert mint.
   */
  function _mintViaXcertMintProxy(MintData _mintData)
    internal
    returns (bool)
  {
    return XcertMintProxy(XCERT_MINT_PROXY_CONTRACT)
      .mint(_mintData.xcert, _mintData.xcertId, _mintData.xcertUri, _mintData.to);
  }


  /**
   * @dev Checks if XcertMintProxy can mint specific _xcert.
   */
  function _canMint(address _xcert)
    internal
    constant
    returns (bool)
  {
    return Xcert(_xcert).isMintAuthorizedAddress(XCERT_MINT_PROXY_CONTRACT);
  }

  /*
   * @dev Gets xcert contract owner.
   * @param _xcert Contract address.
   */
  function _getOwner(address _xcert)
    internal
    constant
    returns (address)
  {
    return Xcert(_xcert).owner();
  }
}
