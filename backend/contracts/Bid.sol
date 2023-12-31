pragma solidity >=0.8.0 <0.9.0;

//SPDX-License-Identifier: MIT

contract Bid {
  address private _bidder;
  uint256 private _bidTime;
  address private _item;
  uint256 private _bidPrice;

  constructor(
    address bidder,
    uint256 bidTime,
    address item,
    uint256 bidPrice
  ) {
    _bidder = bidder;
    _bidTime = bidTime;
    _item = item;
    _bidPrice = bidPrice;
  }

  function getBidderAddress() public view returns (address) {
    return _bidder;
  }

  function getStartTime() public view returns (uint256) {
    return _bidTime;
  }

  function getItemAddress() public view returns (address) {
    return _item;
  }

  function getBidPrice() public view returns (uint256) {
    return _bidPrice;
  }
}
