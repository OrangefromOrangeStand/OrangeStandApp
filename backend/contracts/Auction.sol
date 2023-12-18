pragma solidity >=0.8.0 <0.9.0;

//SPDX-License-Identifier: MIT
import "./Bid.sol";
import "./Item.sol";
import "./OrangeStandTicket.sol";
import "./OrangeStandSpentTicket.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Auction is Ownable {
  event BidUpdate(uint256 _id, address _newBid, address _oldBid, address _newBidder, address _oldBidder);
  event AuctionSettled(uint256 _id, address _bidder, uint256 _finalPrice);
  event AuctionOnGoing(uint256 _id);
  event AuctionFinished(uint256 _id);

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
  address private _settlementToken;
  uint256 private _activePrice;
  address private _treasuryAddress;

  constructor(
    uint256 id,
    Item item,
    uint256 auctionStartTime,
    uint256 cycleDuration,
    uint256 initialPrice,
    address originalOwner,
    uint256 priceIncrease,
    address paymentToken,
    address treasuryAddress,
    address settlementToken
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
    _treasuryAddress = treasuryAddress;
    _settlementToken = settlementToken;
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

  function makeNewBid(address newBidAddress) public {
    if (!isFinished()) {
      address oldBidAddress;
      address oldBidder;
      if(address(_activeBid) != address(0x0)){
        oldBidAddress = address(_activeBid);
        oldBidder = Bid(_activeBid).getBidderAddress();
        _activePrice += _priceIncrease;
      }
      _activeBid = Bid(newBidAddress);
      OrangeStandTicket paymentContract = OrangeStandTicket(_paymentToken);
      paymentContract.transferFrom(_activeBid.getBidderAddress(), address(this), getPriceIncrease());
      _currentCycleStartTime = block.timestamp;
      emit BidUpdate(_id, newBidAddress, oldBidAddress, _activeBid.getBidderAddress(), oldBidder);
    } else {
      emit AuctionFinished(_id);
    }
  }

  function settle() public onlyOwner {
    if(!isFinished()){
      emit AuctionOnGoing(_id);
    } else {
      if(!_settled){
        _settled = true;
        OrangeStandTicket paymentContract = OrangeStandTicket(_paymentToken);
        uint256 balance = paymentContract.balanceOf(address(this));
        // will have to be modified
        paymentContract.transfer(getOriginalOwner(), (balance * 99) / 100);
        paymentContract.transfer(_treasuryAddress, (balance * 1) / 100);

        // new code to be used
        paymentContract.burn(address(this), balance);
        OrangeStandSpentTicket settledContract = OrangeStandSpentTicket(_settlementToken);
        settledContract.mint(getOriginalOwner(), (balance * 99) / 100);
        settledContract.mint(_treasuryAddress, (balance * 1) / 100);
      }
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
