
pragma solidity 0.4.19;

/*
 * @dev based od: https://github.com/0xProject/contracts/blob/master/contracts/TokenTransferProxy.sol
 */


import "./base/Deed.sol";
import "./base/Ownable.sol";

/// @title TokenTransferProxy - Transfers tokens on behalf of contracts that have been approved via decentralized governance.
/// @author Amir Bandeali - <amir@0xProject.com>, Will Warren - <will@0xProject.com>
interface XcertProxy is Ownable {


    event LogAuthorizedAddressAdded(address indexed target, address indexed caller);
    event LogAuthorizedAddressRemoved(address indexed target, address indexed caller);

    /*
     * Public functions
     */

    /// @dev Authorizes an address.
    /// @param target Address to authorize.
    function addAuthorizedAddress(address target)
        public
        onlyOwner
        targetNotAuthorized(target)
    {
        authorized[target] = true;
        authorities.push(target);
        LogAuthorizedAddressAdded(target, msg.sender);
    }

    /// @dev Removes authorizion of an address.
    /// @param target Address to remove authorization from.
    function removeAuthorizedAddress(address target)
        public
        onlyOwner
        targetAuthorized(target)
    {
        delete authorized[target];
        for (uint i = 0; i < authorities.length; i++) {
            if (authorities[i] == target) {
                authorities[i] = authorities[authorities.length - 1];
                authorities.length -= 1;
                break;
            }
        }
        LogAuthorizedAddressRemoved(target, msg.sender);
    }

    /// @dev Calls into ERC721 Xcert contract, invoking transfer.
    /// @param token Address of token to transfer.
    /// @param from Address to transfer token from.
    /// @param to Address to transfer token to.
    /// @param value Amount of token to transfer.
    /// @return Success of transfer.
    function transfer(
        address _xcert,
        uint256 _id,
        address _to)
        public
        onlyAuthorized
        returns (bool)
    {
        return Xcert(_xcert).transfer(_to, _id);
    }

    /// @dev Calls into ERC721 Xcert contract, invoking mint.
    /// @param token Address of token to transfer.
    /// @param from Address to transfer token from.
    /// @param to Address to transfer token to.
    /// @param value Amount of token to transfer.
    /// @return Success of transfer.
    function mint(
        address _xcert,
        uint256 _id,
        string _uri,
        address _to)
        public
        onlyAuthorized
        returns (bool)
    {
        return Xcert(_xcert).mint(_to, _id, _uri);
    }


    /*
     * Public constant functions
     */

    /// @dev Gets all authorized addresses.
    /// @return Array of authorized addresses.
    function getAuthorizedAddresses()
        public
        constant
        returns (address[])
    {
        return authorities;
    }
}