pragma solidity >=0.8.0 <0.9.0;

//SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
contract Item is Ownable {
  using EnumerableMap for EnumerableMap.UintToAddressMap;
  using Counters for Counters.Counter;
  
  // Declare a set state variable
  EnumerableMap.UintToAddressMap private _fungibleTokens;
  EnumerableMap.UintToAddressMap private _nonFungibleTokens;
  Counters.Counter private _indices;

  function numErc20Tokens() public view returns (uint256){
    return _fungibleTokens.length();
  }
  
  function addErc20(address itemAddress, uint256 quantity) onlyOwner public {
    _indices.increment();
    uint256 index = _indices.current();
    SingleErc20Item erc20Item = new SingleErc20Item(itemAddress, quantity);
    _fungibleTokens.set(index, address(erc20Item));
  }

  function numErc721Tokens() public view returns (uint256){
    return _nonFungibleTokens.length();
  }

  function addErc721(address itemAddress, uint256 tokenId) onlyOwner public {
    _indices.increment();
    uint256 index = _indices.current();
    SingleErc721Item erc721Item = new SingleErc721Item(itemAddress, tokenId);
    _nonFungibleTokens.set(index, address(erc721Item));
  }

  function getItem(uint256 id) public view returns (address) {
    if(_fungibleTokens.contains(id)){
      return _fungibleTokens.get(id);
    } else if(_nonFungibleTokens.contains(id)){
      return _nonFungibleTokens.get(id);
    }
    return address(0);
  }

  function getErc20Item(uint256 id) public view returns (address) {
    if(_fungibleTokens.contains(id)){
      return _fungibleTokens.get(id);
    }
    return address(0);
  }

  function getErc721Item(uint256 id) public view returns (address) {
    if(_nonFungibleTokens.contains(id)){
      return _nonFungibleTokens.get(id);
    }
    return address(0);
  }
}

contract SingleErc20Item {
  address private _tokenAddress;
  uint256 private _quantity;

  constructor(address tokenAddress, uint256 quantity){
    _tokenAddress = tokenAddress;
    _quantity = quantity;
  }

  function getTokenAddress() public view returns (address) {
    return _tokenAddress;
  }

  function getQuantity() public view returns (uint256) {
    return _quantity;
  }
}

contract SingleErc721Item {
  address private _tokenAddress;
  uint256 private _tokenId;

  constructor(address tokenAddress, uint256 tokenId){
    _tokenAddress = tokenAddress;
    _tokenId = tokenId;
  }

  function getTokenAddress() public view returns (address) {
    return _tokenAddress;
  }

  function getTokenId() public view returns (uint256) {
    return _tokenId;
  }
}