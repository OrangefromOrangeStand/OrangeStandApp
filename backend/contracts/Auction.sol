pragma solidity >=0.8.0 <0.9.0;

//SPDX-License-Identifier: MIT
import "./Bid.sol";
import "./Item.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Auction is Ownable {
  event BidUpdate(uint256 _id, address _newBid, address _oldBid, address _newBidder, address _oldBidder);
  event AuctionSettled(uint256 _id, address _bidder, uint256 _finalPrice);

  uint256 private _id;
  Bid private _activeBid;
  Item private _item;
  uint256 private _currentCycleStartTime;
  uint256 private _currentCycleEndTime;
  uint256 private _cycleDuration;
  uint256 private _initialPrice;
  address private _originalOwner;
  bool private _settled;
  uint256 private _priceIncrease;
  address private _paymentToken;
  uint256 private _activePrice;

  constructor(
    uint256 id,
    Item item,
    uint256 auctionStartTime,
    uint256 cycleDuration,
    uint256 initialPrice,
    address originalOwner,
    uint256 priceIncrease,
    address paymentToken
  ) {
    _id = id;
    _item = item;
    _currentCycleStartTime = auctionStartTime;
    _cycleDuration = cycleDuration;
    _initialPrice = initialPrice;
    _originalOwner = originalOwner;
    _settled = false;
    _priceIncrease = priceIncrease;
    _paymentToken = paymentToken;
    _activePrice = initialPrice;
  }

  function getId() public view returns (uint256) {
    return _id;
  }

  function getItem() public view returns (Item) {
    return _item;
  }

  function getActiveBid() public view returns (Bid) {
    return _activeBid;
  }

  function getCurrentCycleStartTime() public view returns (uint256) {
    return _currentCycleStartTime;
  }

  function getCycleDuration() public view returns (uint256) {
    return _cycleDuration;
  }

  function getCurrentCycleEndTime() public view returns (uint256) {
    return _currentCycleStartTime + (_cycleDuration * 60);
  }

  function getInitialPrice() public view returns (uint256) {
    return _initialPrice;
  }

  function getPriceIncrease() public view returns (uint256) {
    return _priceIncrease;
  }

  function getOriginalOwner() public view returns (address) {
    return _originalOwner;
  }

  function getCurrentBlockTime() public view returns (uint256) {
    return block.timestamp;
  }

  function isFinished() public view returns (bool) {
    return block.timestamp > getCurrentCycleEndTime();
  }

  function getPaymentToken() public view returns (address) {
    return _paymentToken;
  }

  function getActivePrice() public view returns (uint256) {
    return _activePrice;
  }

  // anyone can call
  function makeNewBid(address newBidAddress) public onlyOwner {
    if (!isFinished()) {
      address oldBidAddress;
      address oldBidder;
      if(address(_activeBid) != address(0x0)){
        oldBidAddress = address(_activeBid);
        oldBidder = Bid(_activeBid).getBidderAddress();
        _activePrice += _priceIncrease;
      }
      _activeBid = Bid(newBidAddress);
      IERC20 paymentContract = IERC20(_paymentToken);
      paymentContract.transferFrom(_activeBid.getBidderAddress(), address(this), getPriceIncrease());
      _currentCycleStartTime = block.timestamp;
      emit BidUpdate(_id, newBidAddress, oldBidAddress, _activeBid.getBidderAddress(), oldBidder);
    }
  }

  function settle() public onlyOwner {
    if(!_settled && isFinished()) {
      _settled = true;
      IERC20 paymentContract = IERC20(_paymentToken);
      uint256 balance = paymentContract.balanceOf(address(this));
      paymentContract.transfer(getOriginalOwner(), balance);

      Bid finalBid = Bid(_activeBid);
      address bidderAddress = getOriginalOwner();
      uint256 finalBidPrice = 0;
      if(address(finalBid) != address(0x0)){
        bidderAddress = finalBid.getBidderAddress();
        finalBidPrice = _activePrice;
      }
      emit AuctionSettled(_id, bidderAddress, finalBidPrice);
    }
  }
}
