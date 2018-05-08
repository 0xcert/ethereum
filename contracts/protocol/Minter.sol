pragma solidity ^0.4.23;

import "../math/SafeMath.sol";
import "../tokens/Xct.sol";
import "../tokens/Xcert.sol";
import "../tokens/ERC20.sol";
import "./TokenTransferProxy.sol";
import "./XcertMintProxy.sol";
import "../tokens/ERC165implementation.sol";

/*
 * @dev based on: https://github.com/0xProject/contracts/blob/master/contracts/Exchange.sol
 */
contract Minter is ERC165implementation {

  using SafeMath for uint256;

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
  event PerformMint(address _to,
                    address indexed _xcert,
                    bytes32 _xcertMintClaim);

  /*
   * @dev This event emmits when xcert mint order is canceled.
   */
  event CancelMint(address _to,
                   address indexed _xcert,
                   bytes32 _xcertMintClaim);

  /*
   * @dev Structure of data needed for mint.
   */
  struct MintData{
    address owner;
    address to;
    address xcert;
    uint256 id;
    string proof;
    string uri;
    address[] feeAddresses;
    uint256[] feeAmounts;
    uint256 seed;
    uint256 expirationTimestamp;
    bytes32 claim;
  }

  /*
   * @dev Sets XCT token address, Token proxy address and xcert Proxy address.
   * @param _xcertToken Address pointing to XCT Token contract.
   * @param _tokenTransferProxy Address pointing to TokenTransferProxy contract.
   * @param _XcertProxy Address pointing to XcertProxy contract.
   */
  constructor(address _xctToken,
              address _tokenTransferProxy,
              address _xcertMintProxy)
    public
  {
    XCT_TOKEN_CONTRACT = _xctToken;
    TOKEN_TRANSFER_PROXY_CONTRACT = _tokenTransferProxy;
    XCERT_MINT_PROXY_CONTRACT = _xcertMintProxy;
    supportedInterfaces[0xca4a3079] = true; // Minter
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
   * @param _addresses Array of all addresses that go as following: 0 = Address of Xcert reciever,
   * 1 = Address of Xcert contract, 2 and more = Addresses of all parties that need to get
   * feeAmounts paid.
   * @param _uints Array of all uints that go as following: 0 = Id of Xcert, 1 = _seed Timestamp
   * that represents the salt, 2 = Timestamp of when the mint claim expires, 3 and more = Fee
   * amounts of all the _feeAddresses (length of both have to be the same).
   * @param _proof Proof of Xcert.
   * @param _uri Uri of Xcert (metadata uri).
   * @param _v ECDSA signature parameter v.
   * @param _r ECDSA signature parameters r.
   * @param _s ECDSA signature parameters s.
   * @param _throwIfNotMintable Test the mint before performing.
   */
  function performMint(address[] _addresses,
                       uint256[] _uints,
                       string _proof,
                       string _uri,
                       uint8 _v,
                       bytes32 _r,
                       bytes32 _s,
                       bool _throwIfNotMintable)
    public
  {

    require(_addresses.length.add(1) == _uints.length);

    MintData memory mintData = MintData({
      owner: _getOwner(_addresses[1]),
      to: _addresses[0],
      xcert: _addresses[1],
      id: _uints[0],
      proof: _proof,
      uri: _uri,
      feeAddresses: _getAddressSubArray(_addresses, 2),
      feeAmounts: _getUintSubArray(_uints, 3),
      seed: _uints[1],
      expirationTimestamp: _uints[2],
      claim: getMintDataClaim(
        _addresses,
        _uints,
        _proof,
        _uri
      )
    });

    require(mintData.to == msg.sender);
    require(mintData.owner != mintData.to);
    require(mintData.expirationTimestamp >= now);

    require(isValidSignature(
      mintData.owner,
      mintData.claim,
      _v,
      _r,
      _s
    ));

    require(!mintPerformed[mintData.claim],"Mint already performed.");
    require(!mintCancelled[mintData.claim], "Mint canceled.");

    if (_throwIfNotMintable)
    {
      require(_canPayFee(mintData.to, mintData.feeAmounts), "Insufficient balance or allowance.");
      require(_canMint(mintData.xcert), "Minting not approved.");
    }

    mintPerformed[mintData.claim] = true;

    _mintViaXcertMintProxy(mintData);

    _payfeeAmounts(mintData.feeAddresses, mintData.feeAmounts, mintData.to);

    emit PerformMint(
      mintData.to,
      mintData.xcert,
      mintData.claim
    );

  }

  /*
   * @dev Cancels xcert mint.
   * @param _addresses Array of all addresses that go as following: 0 = Address of Xcert reciever,
   * 1 = Address of Xcert contract, 2 and more = Addresses of all parties that need to get
   * feeAmounts paid.
   * @param _uints Array of all uints that go as following: 0 = Id of Xcert, 1 = _seed Timestamp
   * that represents the salt, 2 = Timestamp of when the mint claim expires, 3 and more = Fee
   * amounts of all the _feeAddresses (length of both have to be the same).
   * @param _proof Proof of Xcert.
   * @param _uri Uri of Xcert (metadata uri).
   */
  function cancelMint(address[] _addresses,
                      uint256[] _uints,
                      string _proof,
                      string _uri)
    public
  {
    require(msg.sender == _getOwner(_addresses[1]));

    bytes32 claim = getMintDataClaim(
      _addresses,
      _uints,
      _proof,
      _uri
    );

    require(!mintPerformed[claim]);

    mintCancelled[claim] = true;

    emit CancelMint(
      _addresses[0],
      _addresses[1],
      claim
    );
  }

  /*
   * @dev Calculates keccak-256 hash of mint data from parameters.
   * @param _addresses Array of all addresses that go as following: 0 = Address of Xcert reciever,
   * 1 = Address of Xcert contract, 2 and more = Addresses of all parties that need to get
   * feeAmounts paid.
   * @param _uints Array of all uints that go as following: 0 = Id of Xcert, 1 = _seed Timestamp
   * that represents the salt, 2 = Timestamp of when the mint claim expires, 3 and more = Fee
   * amounts of all the _feeAddresses (length of both have to be the same).
   * @param _proof Proof of Xcert.
   * @param _uri Uri of Xcert (metadata uri).
   * @returns keccak-hash of mint data.
   */
  function getMintDataClaim(address[] _addresses,
                            uint256[] _uints,
                            string _proof,
                            string _uri)
    public
    constant
    returns (bytes32)
  {
    return keccak256(
      address(this),
      _addresses[0],
      _addresses[1],
      _uints[0],
      _proof,
      _uri,
      _getAddressSubArray(_addresses, 2),
      _getUintSubArray(_uints, 3),
      _uints[1],
      _uints[2]
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
   * @param _mintData Structure of all mint data.
   * @return Success of Xcert mint.
   */
  function _mintViaXcertMintProxy(MintData _mintData)
    internal
  {
    XcertMintProxy(XCERT_MINT_PROXY_CONTRACT)
      .mint(_mintData.xcert, _mintData.id, _mintData.proof, _mintData.uri, _mintData.to);
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
   * @dev Creates a sub array from address array.
   * @param _array Array from which we will make a sub array.
   * @param _index Index from which our sub array will be made.
   */
  function _getAddressSubArray(address[] _array, uint256 _index)
    internal
    pure
    returns (address[])
  {
    require(_array.length >= _index);
    address[] memory subArray = new address[](_array.length.sub(_index));
    uint256 j = 0;
    for(uint256 i = _index; i < _array.length; i++)
    {
      subArray[j] = _array[i];
      j++;
    }

    return subArray;
  }

  /*
   * @dev Creates a sub array from uint256 array.
   * @param _array Array from which we will make a sub array.
   * @param _index Index from which our sub array will be made.
   */
  function _getUintSubArray(uint256[] _array,
                            uint256 _index)
    internal
    pure
    returns (uint256[])
  {
    require(_array.length >= _index);
    uint256[] memory subArray = new uint256[](_array.length.sub(_index));
    uint256 j = 0;
    for(uint256 i = _index; i < _array.length; i++)
    {
      subArray[j] = _array[i];
      j++;
    }

    return subArray;
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
