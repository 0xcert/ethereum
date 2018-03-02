pragma solidity ^0.4.19;


import "../math/SafeMath.sol";
import "../tokens/ERC20.sol";
import "../tokens/ERC721.sol";
import "./TokenTransferProxy.sol";
import "./NFTokenTransferProxy.sol";

/*
 * @dev based on: https://github.com/0xProject/contracts/blob/master/contracts/Exchange.sol
 */
contract Exchange {

  using SafeMath for uint256;

  /*
   * @dev Enum of possible errors.
   */
  enum Errors {
    TRANSFER_ALREADY_PERFORMED, // Transfer has already beed performed.
    TRANSFER_CANCELLED, // Transfer was cancelled.
    INSUFFICIENT_BALANCE_OR_ALLOWANCE, // Insufficient balance or allowance for XCT transfer.
    NOT_XCERT_OWNER // Is not the owner of Xcert.
  }

  /*
   * @dev contract addresses
   */
  address public XCT_TOKEN_CONTRACT;
  address public TOKEN_TRANSFER_PROXY_CONTRACT;
  address public NFTOKEN_TRANSFER_PROXY_CONTRACT;

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
   * @dev This event emmits when xcert changes ownership.
   */
  event LogPerformTransfer(address _from,
                           address _to,
                           address _xcert,
                           uint256 _xcertId,
                           address[] _feeAddresses,
                           uint256[] _feeAmounts,
                           uint256 _timestamp,
                           bytes32 _xcertTransferClaim);

  /*
   * @dev This event emmits when xcert transfer order is canceled.
   */
  event LogCancelTransfer(address _from,
                          address _to,
                          address _xcert,
                          uint256 _xcertId,
                          address[] _feeAddresses,
                          uint256[] _feeAmounts,
                          uint256 _timestamp,
                          bytes32 _xcertTransferClaim);

  /*
   * @dev This event emmits when an error occurs.
   */
  event LogError(uint8 indexed errorId,
                 bytes32 indexed claim);


  /*
   * @dev Sets XCT token address, Token proxy address and xcert Proxy address.
   * @param _xcertToken Address pointing to XCT Token contract.
   * @param _tokenTransferProxy Address pointing to TokenTransferProxy contract.
   * @param _nfTokenTransferProxy Address pointing to none-fungible token transfer proxy contract.
   */
  function Exchange(address _xctToken,
                    address _tokenTransferProxy,
                    address _nfTokenTransferProxy)
    public
  {
    XCT_TOKEN_CONTRACT = _xctToken;
    TOKEN_TRANSFER_PROXY_CONTRACT = _tokenTransferProxy;
    NFTOKEN_TRANSFER_PROXY_CONTRACT = _nfTokenTransferProxy;
  }

  /*
   * @dev Get addresses to all associated contracts (token, tokenTransferProxy, xcertProxy) .
   * @return Array of addresses (token, tokenTransferProxy, nfTokenTransferProxy)
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
    return addresses;
  }


  /*
   * @dev Performs the Xcert transfer.
   * @param _from Address of Xcert sender.
   * @param _to Address of Xcert reciever.
   * @param _xcert Address of Xcert contract.
   * @param _xcertId Id of Xcert (hashed certificate data that is transformed into uint256).
   * @param _feeAddresses Addresses of all parties that need to get feeAmounts paid.
   * @param _feeAmounts Fee amounts of all the _feeAddresses (length of both have to be the same).
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
                           address[] _feeAddresses,
                           uint256[] _feeAmounts,
                           uint256 _timestamp,
                           uint8 _v,
                           bytes32 _r,
                           bytes32 _s,
                           bool _throwIfNotTransferable)
    public
    returns (bool)
  {
    require(_feeAddresses.length == _feeAmounts.length);
    require(_to == msg.sender);
    require(_from != _to);

    bytes32 claim = getTransferDataClaim(
      _from,
      _to,
      _xcert,
      _xcertId,
      _feeAddresses,
      _feeAmounts,
      _timestamp
    );

    require(isValidSignature(
      _from,
      claim,
      _v,
      _r,
      _s
    ));

    if(transferPerformed[claim])
    {
      LogError(uint8(Errors.TRANSFER_ALREADY_PERFORMED), claim);
      return false;
    }

    if(transferCancelled[claim])
    {
      LogError(uint8(Errors.TRANSFER_CANCELLED), claim);
      return false;
    }

    if (_throwIfNotTransferable)
    {
      if(!_canPayFee(_to, _feeAmounts))
      {
        LogError(uint8(Errors.INSUFFICIENT_BALANCE_OR_ALLOWANCE), claim);
        return false;
      }

      if(!_isAllowed(_from, _xcert, _xcertId))
      {
        LogError(uint8(Errors.NOT_XCERT_OWNER), claim);
        return false;
      }
    }

    transferPerformed[claim] = true;

    _transferViaNFTokenTransferProxy(_xcert, _from, _to, _xcertId);

    _payfeeAmounts(_feeAddresses, _feeAmounts, _to);

    LogPerformTransfer(
      _from,
      _to,
      _xcert,
      _xcertId,
      _feeAddresses,
      _feeAmounts,
      _timestamp,
      claim
    );

    return true;
  }

  /*
   * @dev Cancels xcert transfer.
   * @param _from Address of Xcert sender.
   * @param _to Address of Xcert reciever.
   * @param _xcert Address of Xcert contract.
   * @param _xcertId Id of Xcert (hashed certificate data that is transformed into uint256).
   * @param _feeAddresses Addresses of all parties that need to get feeAmounts paid.
   * @param _feeAmounts Fee amounts of all the _feeAddresses (length of both have to be the same).
   * @param _timestamp Timestamp that represents the salt.
   */
  function cancelTransfer(address _from,
                          address _to,
                          address _xcert,
                          uint256 _xcertId,
                          address[] _feeAddresses,
                          uint256[] _feeAmounts,
                          uint256 _timestamp)
    public
  {
    require(msg.sender == _from);

    bytes32 claim = getTransferDataClaim(
      _from,
      _to,
      _xcert,
      _xcertId,
      _feeAddresses,
      _feeAmounts,
      _timestamp
    );

    require(!transferPerformed[claim]);

    transferCancelled[claim] = true;

    LogCancelTransfer(
      _from,
      _to,
      _xcert,
      _xcertId,
      _feeAddresses,
      _feeAmounts,
      _timestamp,
      claim
    );
  }

  /*
   * @dev Calculates keccak-256 hlaim of mint data from parameters.
   * @param _from Address of Xcert sender.
   * @param _to Address of Xcert reciever.
   * @param _xcert Address of Xcert contract.
   * @param _xcertId Id of Xcert (hashed certificate data that is transformed into uint256).
   * @param _feeAddresses Addresses of all parties that need to get feeAmounts paid.
   * @param _feeAmounts Fee amounts of all the _feeAddresses (length of both have to be the same).
   * @param _timestamp Timestamp that represents the salt.
   * @returns keccak-hash of transfer data.
   */
  function getTransferDataClaim(address _from,
                               address _to,
                               address _xcert,
                               uint256 _xcertId,
                               address[] _feeAddresses,
                               uint256[] _feeAmounts,
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
      _feeAddresses,
      _feeAmounts,
      _timestamp
    );
  }

  /*
   * @dev Verifies if xcert signature is valid.
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
   * @param _from Address sending Xcert.
   * @param _to Address receiving Xcert.
   * @param _id Id of transfering Xcert.
   * @return Success of Xcert transfer.
   */
  function _transferViaNFTokenTransferProxy(address _xcert,
                                            address _from,
                                            address _to,
                                            uint256 _id)
    internal
  {
     NFTokenTransferProxy(NFTOKEN_TRANSFER_PROXY_CONTRACT)
      .transferFrom(_xcert, _from, _to, _id);
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
    if(ERC721(_xcert).getApproved(_xcertId) == NFTOKEN_TRANSFER_PROXY_CONTRACT)
    {
      return true;
    }

    if(ERC721(_xcert).isApprovedForAll(_from, NFTOKEN_TRANSFER_PROXY_CONTRACT))
    {
      return true;
    }

    return false;
  }

  /**
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
