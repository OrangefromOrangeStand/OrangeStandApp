pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Bid.sol";
import "./Item.sol";
import "./Auction.sol";
import "./OrangeStandTicket.sol";
import "./OrangeStandSpentTicket.sol";
import "./StructuredLinkedList.sol";

struct TokenOccurrence {
  string tokenSymbol;
  uint lastUsageTimestamp;
  uint pastUsageMovingAverage;
}

contract AuctionTracker is AccessControl, Ownable {
  using EnumerableSet for EnumerableSet.UintSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;
  using StructuredLinkedList for StructuredLinkedList.List;
  EnumerableSet.UintSet private activeAuctions;
  EnumerableSet.Bytes32Set private categories;
  mapping(string symbol => EnumerableSet.UintSet) private activeAuctionsForSymbol;
  mapping(string symbol => StructuredLinkedList.List) private activeAuctionsForSymbolInOrder;
  mapping(string symbol => mapping(address user => EnumerableSet.UintSet)) private activeAuctionsForSymbolByUser;
  mapping(uint256 => Auction) private auctions;
  mapping(string => uint256) private tokenIndex;
  TokenOccurrence[] private tokenOccurrence;
  uint private k = 40;
  uint private startingPastAverageMovingAverage = 100000000;

  constructor(){
  }

  function calculatePastMovingAverage(uint lastExecutionTime, uint pastUsageMovingAverage) private view returns(uint256){
    return ((block.timestamp - lastExecutionTime) * 40 + pastUsageMovingAverage * (60)) / 100;
  }

  function getTokenOccurrence() public view returns (TokenOccurrence[] memory){
    return tokenOccurrence;
  }

  function getAuction(uint256 id) public view returns (Auction) {
    return auctions[id];
  }

  function insertForStatistics(string memory symbol) private {
    if(tokenIndex[symbol] == 0){
      tokenOccurrence.push(TokenOccurrence(symbol, block.timestamp, startingPastAverageMovingAverage));
      tokenIndex[symbol] = tokenOccurrence.length;
    }
    tokenOccurrence[tokenIndex[symbol] - 1].pastUsageMovingAverage = calculatePastMovingAverage(tokenOccurrence[tokenIndex[symbol] - 1].lastUsageTimestamp, tokenOccurrence[tokenIndex[symbol] - 1].pastUsageMovingAverage);
    tokenOccurrence[tokenIndex[symbol] - 1].lastUsageTimestamp = block.timestamp;
  }

  function updateOccurrence(uint256 auctionId) public onlyOwner {
    Auction auction = auctions[auctionId];
    Item item = auction.getItem();
    uint256 numErc20Tokens = item.numErc20Tokens();
    for(uint i = 0; i < numErc20Tokens; i++){
      SingleErc20Item erc20Item = SingleErc20Item(item.getErc20Item(i+1));
      insertForStatistics(ERC20(erc20Item.getTokenAddress()).symbol());
    }
    uint256 numErc721Tokens = item.numErc721Tokens();
    for(uint i = 0; i < numErc721Tokens; i++){
      SingleErc721Item erc721Item = SingleErc721Item(item.getErc721Item(i+1));
      insertForStatistics(ERC721(erc721Item.getTokenAddress()).symbol());
    }
  }

  function getAllActiveAuctions(string memory symbol) public view returns (uint256[] memory){
    return activeAuctionsForSymbol[symbol].values();
  }

  function getActiveAuctionsForWindow(string memory symbol, uint256 windowIter) public view returns (uint256[] memory){
    return activeAuctionsForSymbolInOrder[symbol].getNodesInNthAnchor(0, windowIter);
  }

  function getAllFinishedAuctions(string memory symbol, address user) public view returns (uint256[] memory){
    return activeAuctionsForSymbolByUser[symbol][user].values();
  }

  function getAllCategories() public view returns (bytes32[] memory){
    return categories.values();
  }

  function generateBid(uint256 auctionId, address bidder) public onlyOwner returns(Auction auction, address bidAdderss) {
    Auction auction = auctions[auctionId];
    address newBidAddress = address(0x0);
    if(!auction.isFinished()){
      Bid activeBid = Bid(auction.getActiveBid());
      uint256 newPrice = auction.getInitialPrice();
      address oldBidder = getAuctionTransferAddress(auctionId);
      if(address(activeBid) != address(0x0)){
        newPrice = activeBid.getBidPrice();
      }
      Bid newBid = new Bid(bidder, block.timestamp, address(auction.getItem()), newPrice + auction.getCycleDuration());
      newBidAddress = address(newBid);
      updateActiveAuctionsForUser(auctionId, bidder, oldBidder, auction);
    }
    return (auction, newBidAddress);
  }

  function updateActiveAuctionsForUser(uint256 auctionId, address newBidder, address oldBidder, Auction auction) public onlyOwner {
    Item item = Item(auction.getItem());
    uint256 numErc20Tokens = item.numErc20Tokens();
    for(uint i = 0; i < numErc20Tokens; i++){
      SingleErc20Item erc20Item = SingleErc20Item(item.getErc20Item(i+1));
      moveBidder(ERC20(erc20Item.getTokenAddress()).symbol(), oldBidder, newBidder, auction);
    }
    uint256 numErc721Tokens = item.numErc721Tokens();
    for(uint i = 0; i < numErc721Tokens; i++){
      SingleErc721Item erc721Item = SingleErc721Item(item.getErc721Item(i+1));
      moveBidder(ERC721(erc721Item.getTokenAddress()).symbol(), oldBidder, newBidder, auction);
    }
  }

  function getAuctionTransferAddress(uint256 auctionId) public view returns(address){
    Auction auction = auctions[auctionId];
    Bid activeBid = auction.getActiveBid();
    address transferAddress = auction.getOriginalOwner();
    if(address(activeBid) != address(0x0)){
        transferAddress = activeBid.getBidderAddress();
    }
    return transferAddress;
  }

  function addActiveAuction(uint256 auctionId, Auction auction) public onlyOwner {
    auctions[auctionId] = auction;
    Item item = Item(auction.getItem());
    uint256 numErc20Tokens = item.numErc20Tokens();
    for(uint i = 0; i < numErc20Tokens; i++){
      SingleErc20Item erc20Item = SingleErc20Item(item.getErc20Item(i+1));
      addAuctionToTrackers(ERC20(SingleErc20Item(item.getErc20Item(i+1)).getTokenAddress()).symbol(), auction);
    }
    uint256 numErc721Tokens = item.numErc721Tokens();
    for(uint i = 0; i < numErc721Tokens; i++){
      SingleErc721Item erc721Item = SingleErc721Item(item.getErc721Item(i+1));
      addAuctionToTrackers(ERC721(erc721Item.getTokenAddress()).symbol(), auction);
    }
  }

  function removeAuction(uint256 auctionId) public onlyOwner {
    Auction auction = auctions[auctionId];
    Item item = auction.getItem();
    address transferAddress = getAuctionTransferAddress(auctionId);
    if(item.numErc20Tokens() > 0) {
      SingleErc20Item erc20Item = SingleErc20Item(item.getItem(1));
      IERC20(erc20Item.getTokenAddress()).transfer(transferAddress, erc20Item.getQuantity());
    } else {
      SingleErc721Item erc721Item = SingleErc721Item(item.getItem(1));
      IERC721(erc721Item.getTokenAddress()).transferFrom(address(this), transferAddress, erc721Item.getTokenId());
    }
    uint256 numErc20Tokens = item.numErc20Tokens();
    for(uint i = 0; i < numErc20Tokens; i++){
      SingleErc20Item erc20Item = SingleErc20Item(item.getErc20Item(i+1));
      ERC20 erc20 = ERC20(erc20Item.getTokenAddress());
      removeAuctionFromTrackers(auctionId, ERC20(erc20).symbol(), transferAddress);
    }
    uint256 numErc721Tokens = item.numErc721Tokens();
    for(uint i = 0; i < numErc721Tokens; i++){
      SingleErc721Item erc721Item = SingleErc721Item(item.getErc721Item(i+1));
      removeAuctionFromTrackers(auctionId, ERC721(erc721Item.getTokenAddress()).symbol(), transferAddress);
    }
  }

  function removeAuctionFromTrackers(uint256 auctionId, string memory symbol, address transferAddress) private {
    activeAuctionsForSymbol[symbol].remove(auctionId);
    activeAuctionsForSymbolInOrder[symbol].remove(auctionId);
    activeAuctionsForSymbolByUser[symbol][transferAddress].remove(auctionId);
    address origOwner = auctions[auctionId].getOriginalOwner();
    if(transferAddress != origOwner){
      activeAuctionsForSymbolByUser[symbol][origOwner].remove(auctionId);
    }
    insertForStatistics(symbol);
  }

  function addAuctionToTrackers(string memory symbol, Auction auction) private {
    activeAuctionsForSymbol[symbol].add(auction.getId());
    activeAuctionsForSymbolInOrder[symbol].pushFront(auction.getId());
    addUserToTrackers(symbol, auction, auction.getOriginalOwner());
    categories.add(bytes32(bytes(symbol)));
  }

  function addUserToTrackers(string memory symbol, Auction auction, address tmpOwner) private {
    activeAuctionsForSymbolByUser[symbol][tmpOwner].add(auction.getId());
  }

  function removeUserFromTrackers(string memory symbol, Auction auction, address oldBidder) private {
    activeAuctionsForSymbolByUser[symbol][oldBidder].remove(auction.getId());
  }

  function moveBidder(string memory symbol, address oldBidder, address newBidder, Auction auction) private {
    // will acidentally remove original owner
    if(auction.getOriginalOwner() != oldBidder){
      activeAuctionsForSymbolByUser[symbol][oldBidder].remove(auction.getId());
    }
    activeAuctionsForSymbolByUser[symbol][newBidder].add(auction.getId());
  }
}