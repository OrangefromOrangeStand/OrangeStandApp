pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
//import "./Bid.sol";
import "./Item.sol";
import "./Auction.sol";
import "./OrangeStandTicket.sol";
import "./OrangeStandSpentTicket.sol";
import "./AuctionTracker.sol";

contract AuctionCoordinator {
  event Erc721AuctionCreation(uint256 auctionId, address item, address originalOwner, uint256 tokenId, uint blockNumber, uint bidCost);
  event Erc20AuctionCreation(uint256 auctionId, address item, address originalOwner, uint256 amount, uint blockNumber, uint bidCost);
  using Counters for Counters.Counter;
  Counters.Counter private _auctionIds;
  address private paymAddr;
  address private trsyAddr;
  AuctionTracker private auctionTracker;

  constructor(address ticketAddress, address trsyAddress, address redemptionTicketAddress, address auctionTrackerAddress){
    paymAddr = ticketAddress;
    trsyAddr = trsyAddress;
    auctionTracker = AuctionTracker(auctionTrackerAddress);
  }

  function getAllCategories() public view returns (bytes32[] memory){
    return auctionTracker.getAllCategories();
  }

  function getAllActiveAuctionsCount(string memory symbol) public view returns (uint256){
    return auctionTracker.getAllActiveAuctions(symbol).length;
  }

  function getActiveAuctionsForWindow(string memory symbol, uint256 windowIter) public view returns (uint256[] memory){
    return auctionTracker.getActiveAuctionsForWindow(symbol, windowIter);
  }

// has to be made into iterable list as well
// have to have number of finished auctions
  function getAllFinishedAuctions(string memory symbol, address user) public view returns (uint256[] memory){
    return auctionTracker.getAllFinishedAuctions(symbol, user);
  }

  function makeBid(uint256 auctionId, address bidder) public {
    (Auction auction, address bidAddress) = auctionTracker.generateBid(auctionId, bidder);
    auction.makeNewBid(bidAddress);
  }

  function getAuction(uint256 auctionId) public view returns (Auction) {
    return auctionTracker.getAuction(auctionId);
  }

  function createErc721Auction(address erc721Address,
    uint256 tokenId,
    address originalOwner,
    uint256 biddingCycleDuration,
    uint256 initialBidPrice,
    address paymentToken,
    uint256 bidCost,
    address settlementToken
  ) public {
    IERC721(erc721Address).transferFrom(address(originalOwner), address(address(auctionTracker)), tokenId);
    Item newItem = new Item();
    newItem.addErc721(erc721Address, tokenId);
    uint256 auctionId = setUpAuction(address(newItem), originalOwner, biddingCycleDuration, initialBidPrice, paymentToken, bidCost, settlementToken);
    emit Erc721AuctionCreation(auctionId,erc721Address,originalOwner,tokenId, block.number,bidCost);
  }

  function createErc20Auction(address erc20Address,
    uint256 amount,
    address originalOwner,
    uint256 biddingCycleDuration,
    uint256 initialBidPrice,
    address paymentToken,
    uint256 bidCost,
    address settlementToken
  ) public {
    Item newItem = new Item();
    IERC20(erc20Address).transferFrom(address(originalOwner), address(address(auctionTracker)), amount);
    newItem.addErc20(erc20Address, amount);
    uint256 auctionId = setUpAuction(address(newItem), originalOwner, biddingCycleDuration, initialBidPrice, paymentToken, bidCost, settlementToken);
    emit Erc20AuctionCreation(auctionId,erc20Address,originalOwner,amount, block.number,bidCost);
  }

  function setUpAuction(
    address item,
    address originalOwner,
    uint256 biddingCycleDuration,
    uint256 initialBidPrice,
    address paymentToken,
    uint256 bidCost,
    address settledTicketAddress
  ) private returns (uint256){
    _auctionIds.increment();
    uint256 auctionId = _auctionIds.current();
    Auction auction = new Auction(auctionId, Item(item), block.timestamp, 
        biddingCycleDuration, initialBidPrice, originalOwner, bidCost, paymentToken, 
        trsyAddr, settledTicketAddress);
    OrangeStandTicket(paymentToken).addBurner(address(auction));
    OrangeStandSpentTicket(settledTicketAddress).addMinter(address(auction));
    auctionTracker.addActiveAuction(auctionId, auction);
    return auctionId;
  }

  function settleAuction(uint256 auctionId) public {
    Auction auction = getAuction(auctionId);
    if(!auction.isSettled()){
      auction.settle(msg.sender);
      auctionTracker.removeAuction(auctionId);
    }
  }

  function getTokenOccurrence() public view returns (TokenOccurrence[] memory){
    return auctionTracker.getTokenOccurrence();
  }
}
