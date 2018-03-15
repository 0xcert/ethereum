pragma solidity ^0.4.19;

import "../math/SafeMath.sol";
import "../tokens/Xct.sol";
import "../tokens/Xcert.sol";
import "./TokenTransferProxy.sol";
import "./XcertMintProxy.sol";

/*
 * @dev based on: https://github.com/0xProject/contracts/blob/master/contracts/Exchange.sol
 */
contract Minter{

  using SafeMath for uint256;

  /*
   * @dev Enum of possible errors.
   */
  enum Errors {
    MINT_ALREADY_PERFORMED, // Mint has already beed performed.
    MINT_CANCELLED, // Mint was cancelled.
    INSUFFICIENT_BALANCE_OR_ALLOWANCE, // Insufficient balance or allowance for XCT transfer.
    XCERT_NOT_ALLOWED // Minting is not allowed
  }

  /*
   * @dev Changes to state require at least 5000 gas.
   */
  uint16 constant public EXTERNAL_QUERY_GAS_LIMIT = 4999;

  /*
   * @dev contract addresses
   */
  address XCERT_MINT_PROXY_CONTRACT;
  address XCT_TOKEN_CONTRACT;
  address TOKEN_TRANSFER_PROXY_CONTRACT;

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
   * @dev This event emmits when an error occurs.
   */
  event LogError(uint8 indexed errorId,
                 bytes32 indexed claim);

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
  function Minter(address _xctToken,
                  address _tokenTransferProxy,
                  address _xcertMintProxy)
    public
  {
    XCT_TOKEN_CONTRACT = _xctToken;
    TOKEN_TRANSFER_PROXY_CONTRACT = _tokenTransferProxy;
    XCERT_MINT_PROXY_CONTRACT = _xcertMintProxy;
  }


  /*
   * @dev Get address of token used in minter.
   */
  function getTokenAddress()
    external
    view
    returns (address)
  {
    return XCT_TOKEN_CONTRACT;
  }

  /*
   * @dev Get address of token transfer proxy used in minter.
   */
  function getTokenTransferProxyAddress()
    external
    view
    returns (address)
  {
    return TOKEN_TRANSFER_PROXY_CONTRACT;
  }


  /*
   * @dev Get address of xcert mint proxy used in minter.
   */
  function getXcertMintProxyAddress()
    external
    view
    returns (address)
  {
    return XCERT_MINT_PROXY_CONTRACT;
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
      LogError(uint8(Errors.MINT_ALREADY_PERFORMED), mintData.claim);
      return false;
    }

    if(mintCancelled[mintData.claim])
    {
      LogError(uint8(Errors.MINT_CANCELLED), mintData.claim);
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
        LogError(uint8(Errors.XCERT_NOT_ALLOWED), mintData.claim);
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
   * @dev Verifies if claim signature is valid.
   * @param _signer address of signer.
   * @param _claim Signed Keccak-256 hash.
   * @param _v ECDSA signature parameter v.
   * @param _r ECDSA signature parameters r.
   * @param _s ECDSA signature parameters s.
   * @return Validity of signature.
   */
  function isValidSignature(address _signer,
                            bytes32 _claim,
                            uint8 _v,
                            bytes32 _r,
                            bytes32 _s)
    public
    pure
    returns (bool)
  {
    return _signer == ecrecover(
      keccak256("\x19Ethereum Signed Message:\n32", _claim),
      _v,
      _r,
      _s
    );
  }

  /*
   * @dev Transfers XCT tokens via TokenTransferProxy using transferFrom function.
   * @param _token Address of token to transferFrom.
   * @param _from Address transfering token.
   * @param _to Address receiving token.
   * @param _value Amount of token to transfer.
   * @return Success of token transfer.
   */
  function _transferViaTokenTransferProxy(address _token,
                                          address _from,
                                          address _to,
                                          uint _value)
    internal
    returns (bool)
  {
    return TokenTransferProxy(TOKEN_TRANSFER_PROXY_CONTRACT).transferFrom(
      _token,
      _from,
      _to,
      _value
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

  /*
   * @dev Get token balance of an address.
   * The called token contract may attempt to change state, but will not be able to due to an added
   * gas limit. Gas is limited to prevent reentrancy.
   * @param _token Address of token.
   * @param _owner Address of owner.
   * @return Token balance of owner.
   */
  function _getBalance(address _token,
                       address _owner)
    internal
    constant
    returns (uint)
  {
    return ERC20(_token).balanceOf.gas(EXTERNAL_QUERY_GAS_LIMIT)(_owner);
  }

  /*
   * @dev Get allowance of token given to TokenTransferProxy by an address.
   * The called token contract may attempt to change state, but will not be able to due to an added
   * gas limit. Gas is limited to prevent reentrancy.
   * @param _token Address of token.
   * @param _owner Address of owner.
   * @return Allowance of token given to TokenTransferProxy by owner.
   */
  function _getAllowance(address _token,
                         address _owner)
    internal
    constant
    returns (uint)
  {
    return ERC20(_token).allowance.gas(EXTERNAL_QUERY_GAS_LIMIT)(
      _owner,
      TOKEN_TRANSFER_PROXY_CONTRACT
    );
  }

  /*
   * @dev Check is payer can pay the feeAmounts.
   * @param _to Address of the payer.
   * @param_ feeAmounts All the feeAmounts to be payed.
   * @return Confirmation if feeAmounts can be payed.
   */
  function _canPayFee(address _to,
                      uint256[] _feeAmounts)
    internal
    constant
    returns (bool)
  {
    uint256 feeAmountsum = 0;

    for(uint256 i; i < _feeAmounts.length; i++)
    {
      feeAmountsum = feeAmountsum.add(_feeAmounts[i]);
    }

    if(_getBalance(XCT_TOKEN_CONTRACT, _to) < feeAmountsum
      || _getAllowance(XCT_TOKEN_CONTRACT, _to) < feeAmountsum )
    {
      return false;
    }
    return true;
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

  /*
   * @dev Helper function that pays all the feeAmounts.
   * @param _feeAddresses Addresses of all parties that need to get feeAmounts paid.
   * @param _feeAmounts Fee amounts of all the _feeAddresses (length of both have to be the same).
   * @param _to Address of the fee payer.
   * @return Success of payments.
   */
  function _payfeeAmounts(address[] _feeAddresses,
                          uint256[] _feeAmounts,
                          address _to)
    internal
  {
    for(uint256 i; i < _feeAddresses.length; i++)
    {
      if(_feeAddresses[i] != address(0) && _feeAmounts[i] > 0)
      {
        require(_transferViaTokenTransferProxy(
          XCT_TOKEN_CONTRACT,
          _to,
          _feeAddresses[i],
          _feeAmounts[i]
        ));
      }
    }
  }
}
