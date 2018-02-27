pragma solidity ^0.4.19;


import "../math/SafeMath.sol";
import "../tokens/Xct.sol";
import "../tokens/Xcert.sol";
import "./TokenTransferProxy.sol";
import "./XcertProxy.sol";

/*
 * @dev based on: https://github.com/0xProject/contracts/blob/master/contracts/Exchange.sol
 */
contract XcertExchange {

  using SafeMath for uint256;

  /*
   * @dev Enum of possible errors.
   */
  enum Errors {
    TRANSFER_ALREADY_PERFORMED, // Transfer has already beed performed.
    TRANSFER_CANCELLED, // Transfer was cancelled.
    MINT_ALREADY_PERFORMED, // Mint has already beed performed.
    MINT_CANCELLED, // Mint was cancelled.
    INSUFFICIENT_BALANCE_OR_ALLOWANCE, // Insufficient balance or allowance for XCT transfer.
    NOT_XCERT_OWNER // Is not the owner of Xcert.
  }

  /*
   * @dev contract addresses
   */
  address public XCT_TOKEN_CONTRACT;
  address public TOKEN_TRANSFER_PROXY_CONTRACT;
  address public XCERT_PROXY_CONTRACT;

  /*
   * @dev Changes to state require at least 5000 gas.
   */
  uint16 constant public EXTERNAL_QUERY_GAS_LIMIT = 4999;

  /*
   * @dev Mapping of all canceled transfers.
   */
  mapping(bytes32 => bool) public transferCancelled;

  /*
   * @dev Mapping of all performed transfers.
   */
  mapping(bytes32 => bool) public transferPerformed;

  /*
   * @dev Mapping of all canceled mints.
   */
  mapping(bytes32 => bool) public mintCancelled;

  /*
   * @dev Mapping of all performed mints.
   */
  mapping(bytes32 => bool) public mintPerformed;

  /*
   * @dev This event emmits when xcert changes ownership.
   */
  event LogPerformTransfer(address _from,
                           address _to,
                           address _xcert,
                           uint256 _xcertId,
                           address[] _feeRecipients,
                           uint256[] _fees,
                           uint256 _timestamp,
                           bytes32 _xcertTransferHash);

  /*
   * @dev This event emmits when xcert transfer order is canceled.
   */
  event LogCancelTransfer(address _from,
                          address _to,
                          address _xcert,
                          uint256 _xcertId,
                          address[] _feeRecipients,
                          uint256[] _fees,
                          uint256 _timestamp,
                          bytes32 _xcertTransferHash);

  /*
   * @dev This event emmits when xcert gets mint directly to the taker.
   */
  event LogPerformMint(address _to,
                       address _xcert,
                       uint256 _xcertId,
                       string _xcertUri,
                       address[] _feeRecipients,
                       uint256[] _fees,
                       uint256 _timestamp,
                       bytes32 _xcertMintHash);

  /*
   * @dev This event emmits when xcert mint order is canceled.
   */
  event LogCancelMint(address _to,
                      address _xcert,
                      uint256 _xcertId,
                      string _xcertUri,
                      address[] _feeRecipients,
                      uint256[] _fees,
                      uint256 _timestamp,
                      bytes32 _xcertMintHash);

  /*
   * @dev This event emmits when an error occurs.
   */
  event LogError(uint8 indexed errorId,
                 bytes32 indexed orderHash);

  /*
   * @dev Structure of data needed for mint.
   */
  struct MintData{
    address owner;
    address to;
    address xcert;
    uint256 xcertId;
    string xcertUri;
    address[] feeRecipients;
    uint256[] fees;
    uint256 timestamp;
    bytes32 hash;
  }

  /*
   * @dev Sets XCT token address, Token proxy address and xcert Proxy address.
   * @param _xcertToken Address pointing to XCT Token contract.
   * @param _tokenTransferProxy Address pointing to TokenTransferProxy contract.
   * @param _XcertProxy Address pointing to XcertProxy contract.
   */
  function XcertExchange(address _xctToken,
                         address _tokenTransferProxy,
                         address _XcertProxy)
    public
  {
    XCT_TOKEN_CONTRACT = _xctToken;
    TOKEN_TRANSFER_PROXY_CONTRACT = _tokenTransferProxy;
    XCERT_PROXY_CONTRACT = _XcertProxy;
  }

  /*
   * @dev Performs the Xcert transfer.
   * @param _from Address of Xcert sender.
   * @param _to Address of Xcert reciever.
   * @param _xcert Address of Xcert contract.
   * @param _xcertId Id of Xcert (hashed certificate data that is transformed into uint256).
   * @param _feeRecipients Addresses of all parties that need to get fees paid.
   * @param _fees Fee amounts of all the _feeRecipients (length of both have to be the same).
   * @param _timestamp Timestamp that represents the salt.
   * @param _v ECDSA signature parameter v.
   * @param _r ECDSA signature parameters r.
   * @param _s ECDSA signature parameters s.
   * @param _s _throwIfNotTransferable Test the transfer before performing.
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
                           bytes32 _s,
                           bool _throwIfNotTransferable)
    public
    returns (bool)
  {
    require(_feeRecipients.length == _fees.length);
    require(_to == msg.sender);
    require(_from != _to);

    bytes32 hash = getTransferDataHash(
      _from,
      _to,
      _xcert,
      _xcertId,
      _feeRecipients,
      _fees,
      _timestamp
    );

    require(isValidSignature(
      _from,
      hash,
      _v,
      _r,
      _s
    ));

    if(transferPerformed[hash])
    {
      LogError(uint8(Errors.TRANSFER_ALREADY_PERFORMED), hash);
      return false;
    }

    if(transferCancelled[hash])
    {
      LogError(uint8(Errors.TRANSFER_CANCELLED), hash);
      return false;
    }

    if (_throwIfNotTransferable)
    {
      if(!_canPayFee(_to, _fees))
      {
        LogError(uint8(Errors.INSUFFICIENT_BALANCE_OR_ALLOWANCE), hash);
        return false;
      }

      if(!_isAllowed(_from, _xcert, _xcertId))
      {
        LogError(uint8(Errors.NOT_XCERT_OWNER), hash);
        return false;
      }
    }

    transferPerformed[hash] = true;

    require(_transferViaXcertProxy(_xcert, _xcertId, _to));

    _payFees(_feeRecipients, _fees, _to);

    LogPerformTransfer(
      _from,
      _to,
      _xcert,
      _xcertId,
      _feeRecipients,
      _fees,
      _timestamp,
      hash
    );

    return true;
  }

  /*
   * @dev Cancels xcert transfer.
   * @param _from Address of Xcert sender.
   * @param _to Address of Xcert reciever.
   * @param _xcert Address of Xcert contract.
   * @param _xcertId Id of Xcert (hashed certificate data that is transformed into uint256).
   * @param _feeRecipients Addresses of all parties that need to get fees paid.
   * @param _fees Fee amounts of all the _feeRecipients (length of both have to be the same).
   * @param _timestamp Timestamp that represents the salt.
   */
  function cancelTransfer(address _from,
                          address _to,
                          address _xcert,
                          uint256 _xcertId,
                          address[] _feeRecipients,
                          uint256[] _fees,
                          uint256 _timestamp)
    public
  {
    require(msg.sender == _from);

    bytes32 hash = getTransferDataHash(
      _from,
      _to,
      _xcert,
      _xcertId,
      _feeRecipients,
      _fees,
      _timestamp
    );

    require(!transferPerformed[hash]);

    transferCancelled[hash] = true;

    LogCancelTransfer(
      _from,
      _to,
      _xcert,
      _xcertId,
      _feeRecipients,
      _fees,
      _timestamp,
      hash
    );
  }

  /*
   * @dev Performs Xcert mint directly to the taker.
   * @param _to Address of Xcert reciever.
   * @param _xcert Address of Xcert contract.
   * @param _xcertId Id of Xcert (hashed certificate data that is transformed into uint256).
   * @param _xcertId Uri of Xcert (metadata uri).
   * @param _feeRecipients Addresses of all parties that need to get fees paid.
   * @param _fees Fee amounts of all the _feeRecipients (length of both have to be the same).
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
                       address[] _feeRecipients,
                       uint256[] _fees,
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
      feeRecipients: _feeRecipients,
      fees: _fees,
      timestamp: _timestamp,
      hash: getMintDataHash(
        _to,
        _xcert,
        _xcertId,
        _xcertUri,
        _feeRecipients,
        _fees,
        _timestamp
      )
    });

    require(_feeRecipients.length == _fees.length);
    require(_to == msg.sender);
    require(mintData.owner != _to);

    require(isValidSignature(
      mintData.owner,
      mintData.hash,
      _v,
      _r,
      _s
    ));

    if(mintPerformed[mintData.hash])
    {
      LogError(uint8(Errors.MINT_ALREADY_PERFORMED), mintData.hash);
      return false;
    }

    if(mintCancelled[mintData.hash])
    {
      LogError(uint8(Errors.MINT_CANCELLED), mintData.hash);
      return false;
    }

    if (_throwIfNotMintable)
    {
      if(!_canPayFee(_to, _fees))
      {
        LogError(uint8(Errors.INSUFFICIENT_BALANCE_OR_ALLOWANCE), mintData.hash);
        return false;
      }

      //TODO(Tadej): Check if we can mint
      if(_canMint(_xcert))
      {
        LogError(uint8(Errors.NOT_XCERT_OWNER), mintData.hash);
        return false;
      }
    }

    mintPerformed[mintData.hash] = true;

    require(_mintViaXcertProxy(mintData));

    _payFees(_feeRecipients, _fees, _to);

    LogPerformMint(
      _to,
      _xcert,
      _xcertId,
      _xcertUri,
      _feeRecipients,
      _fees,
      _timestamp,
      mintData.hash
    );

    return true;
  }


  /*
   * @dev Cancels xcert mint.
   * @param _to Address of Xcert reciever.
   * @param _xcert Address of Xcert contract.
   * @param _xcertId Id of Xcert (hashed certificate data that is transformed into uint256).
   * @param _xcertId Uri of Xcert (metadata uri).
   * @param _feeRecipients Addresses of all parties that need to get fees paid.
   * @param _fees Fee amounts of all the _feeRecipients (length of both have to be the same).
   * @param _timestamp Timestamp that represents the salt.
   */
  function cancelMint(address _to,
                      address _xcert,
                      uint256 _xcertId,
                      string _xcertUri,
                      address[] _feeRecipients,
                      uint256[] _fees,
                      uint256 _timestamp)
    public
  {
    require(msg.sender == _getOwner(_xcert));

    bytes32 hash = getMintDataHash(
      _to,
      _xcert,
      _xcertId,
      _xcertUri,
      _feeRecipients,
      _fees,
      _timestamp
    );

    require(!mintPerformed[hash]);

    mintCancelled[hash] = true;

    LogCancelMint(
      _to,
      _xcert,
      _xcertId,
      _xcertUri,
      _feeRecipients,
      _fees,
      _timestamp,
      hash
    );
  }

  /*
   * @dev Calculates keccak-256 hash of mint data from parameters.
   * @param _to Address of Xcert reciever.
   * @param _xcert Address of Xcert contract.
   * @param _xcertId Id of Xcert (hashed certificate data that is transformed into uint256).
   * @param _xcertUri Uri poiting to Xcert metadata.
   * @param _feeRecipients Addresses of all parties that need to get fees paid.
   * @param _fees Fee amounts of all the _feeRecipients (length of both have to be the same).
   * @param _timestamp Timestamp that represents the salt.
   * @returns keccak-hash of mint data.
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
    returns (bytes32)
  {
    return keccak256(
      address(this),
      _to,
      _xcert,
      _xcertId,
      _xcertUri,
      _feeRecipients,
      _fees,
      _timestamp
    );
  }

  /*
   * @dev Calculates keccak-256 hash of mint data from parameters.
   * @param _from Address of Xcert sender.
   * @param _to Address of Xcert reciever.
   * @param _xcert Address of Xcert contract.
   * @param _xcertId Id of Xcert (hashed certificate data that is transformed into uint256).
   * @param _feeRecipients Addresses of all parties that need to get fees paid.
   * @param _fees Fee amounts of all the _feeRecipients (length of both have to be the same).
   * @param _timestamp Timestamp that represents the salt.
   * @returns keccak-hash of transfer data.
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
    returns (bytes32)
  {
    return keccak256(
      address(this),
      _from,
      _to,
      _xcert,
      _xcertId,
      _feeRecipients,
      _fees,
      _timestamp
    );
  }

  /*
   * @dev Verifies if xcert signature is valid.
   * @param signer address of signer.
   * @param hash Signed Keccak-256 hash.
   * @param v ECDSA signature parameter v.
   * @param r ECDSA signature parameters r.
   * @param s ECDSA signature parameters s.
   * @return Validity of signature.
   */
  function isValidSignature(address _signer,
                            bytes32 _hash,
                            uint8 _v,
                            bytes32 _r,
                            bytes32 _s)
    public
    constant
    returns (bool)
  {
    return _signer == ecrecover(
      keccak256("\x19Ethereum Signed Message:\n32", _hash),
      _v,
      _r,
      _s
    );
  }

  /*
   * @dev Check is payer can pay the fees.
   * @param _to Address of the payer.
   * @param_ fees All the fees to be payed.
   * @return Confirmation if fees can be payed.
   */
  function _canPayFee(address _to,
                      uint256[] _fees)
    internal
    constant
    returns (bool)
  {
    uint256 feeSum = 0;

    for(uint256 i; i < _fees.length; i++)
    {
      feeSum = feeSum.add(_fees[i]);
    }

    if(_getBalance(XCT_TOKEN_CONTRACT, _to) < feeSum
      || _getAllowance(XCT_TOKEN_CONTRACT, _to) < feeSum )
    {
      return false;
    }
    return true;
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
   * @dev Transfers Xcert via XcertProxy using transfer function.
   * @param _xcert Address of Xcert to transfer.
   * @param _id Id of transfering Xcert.
   * @param _to Address receiving Xcert.
   * @return Success of Xcert transfer.
   */
  function _transferViaXcertProxy(address _xcert,
                                  uint256 _id,
                                  address _to)
    internal
    returns (bool)
  {
    return XcertProxy(XCERT_PROXY_CONTRACT).transfer(_xcert, _id, _to);
  }
  /*
   * @dev Mints new Xcert via XcertProxy using mint function.
   * @param _xcert Address of Xcert to mint.
   * @param _id Id of Xcert to mint.
   * @param _uri Uri of Xcert to mint.
   * @param _to Address receiving Xcert.
   * @return Success of Xcert mint.
   */
  function _mintViaXcertProxy(MintData _mintData)
    internal
    returns (bool)
  {
    return XcertProxy(XCERT_PROXY_CONTRACT).mint(_mintData.xcert, _mintData.xcertId, _mintData.xcertUri, _mintData.to);
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
    return Xct(_token).balanceOf.gas(EXTERNAL_QUERY_GAS_LIMIT)(_owner);
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
    return Xct(_token).allowance.gas(EXTERNAL_QUERY_GAS_LIMIT)(
      _owner,
      TOKEN_TRANSFER_PROXY_CONTRACT
    );
  }

  /*
   * @dev Checks if we can transfer xcert.
   * @param _from Address of Xcert sender.
   * @param _xcert Address of Xcert contract.
   * @param _xcertId Id of Xcert (hashed certificate data that is transformed into uint256).
   + @return Permission if we can transfer xcert.
   */
  function _isAllowed(address _from,
                      address _xcert,
                      uint256 _xcertId)
    internal
    constant
    returns (bool)
  {
    //TODO(Tadej): implement the method.
    //Xcert(_xcert)
    return true;
  }

  /**
   * @dev TODO!
   */
  function _canMint(address _xcert)
    internal
    constant
    returns (bool)
  {
    //TODO(Tadej): implement the method.
    //Xcert(_xcert)
    return true;
  }

  /**
   * @dev Helper function that pays all the fees.
   * @param _feeRecipients Addresses of all parties that need to get fees paid.
   * @param _fees Fee amounts of all the _feeRecipients (length of both have to be the same).
   * @param _to Address of the fee payer.
   * @return Success of payments.
   */
  function _payFees(address[] _feeRecipients,
                    uint256[] _fees,
                    address _to)
    internal
  {
    for(uint256 i; i < _feeRecipients.length; i++)
    {
      if(_feeRecipients[i] != address(0) && _fees[i] > 0)
      {
        require(_transferViaTokenTransferProxy(
          XCT_TOKEN_CONTRACT,
          _to,
          _feeRecipients[i],
          _fees[i]
        ));
      }
    }
  }

  /*
   * @dev Checks if XcertProxy can mint xcerts.
   */
  function _isAdmin(address _xcert)
    internal
    constant
    returns (bool)
  {
    //TODO(Tadej): implement the method.
    //Xcert(_xcert)
    return true;
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
