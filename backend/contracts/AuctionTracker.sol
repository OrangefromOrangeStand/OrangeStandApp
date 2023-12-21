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

struct TokenOccurrence {
  string tokenSymbol;
  uint lastUsageTimestamp;
  uint pastUsageMovingAverage;
}

contract AuctionTracker is AccessControl, Ownable {
  using EnumerableSet for EnumerableSet.UintSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;
  EnumerableSet.UintSet private activeAuctions;
  EnumerableSet.Bytes32Set private categories;
  mapping(string symbol => EnumerableSet.UintSet) private activeAuctionsForSymbol;
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
      ERC20 erc20 = ERC20(erc20Item.getTokenAddress());
      string memory symbol = ERC20(erc20).symbol();
      insertForStatistics(symbol);
    }
    uint256 numErc721Tokens = item.numErc721Tokens();
    for(uint i = 0; i < numErc721Tokens; i++){
      SingleErc721Item erc721Item = SingleErc721Item(item.getErc721Item(i+1));
      string memory symbol = ERC721(erc721Item.getTokenAddress()).symbol();
      insertForStatistics(symbol);
    }
  }

  function getAllActiveAuctions(string memory symbol) public view returns (uint256[] memory){
    return activeAuctionsForSymbol[symbol].values();
  }

  function getAllCategories() public view returns (bytes32[] memory){
    return categories.values();
  }

  function generateBid(uint256 auctionId,
    address bidder) public onlyOwner {
    Auction auction = auctions[auctionId];
    Bid activeBid = Bid(auction.getActiveBid());
    uint256 newPrice = auction.getInitialPrice();
    if(address(activeBid) != address(0x0)){
      newPrice = activeBid.getBidPrice();
    }
    Bid newBid = new Bid(bidder, block.timestamp, address(auction.getItem()), newPrice + auction.getCycleDuration());
    auction.makeNewBid(address(newBid));
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

  /*function addToAuction(uint256 id, Auction auction) public onlyOwner {
    auctions[id] = auction;
  }*/

  function addActiveAuction(uint256 auctionId, Auction auction) public onlyOwner {
    auctions[auctionId] = auction;
    Item item = Item(auction.getItem());
    uint256 numErc20Tokens = item.numErc20Tokens();
    for(uint i = 0; i < numErc20Tokens; i++){
      SingleErc20Item erc20Item = SingleErc20Item(item.getErc20Item(i+1));
      ERC20 erc20 = ERC20(erc20Item.getTokenAddress());
      string memory symbol = ERC20(erc20).symbol();
      activeAuctionsForSymbol[symbol].add(auctionId);
      categories.add(bytes32(bytes(symbol)));
    }
    uint256 numErc721Tokens = item.numErc721Tokens();
    for(uint i = 0; i < numErc721Tokens; i++){
      SingleErc721Item erc721Item = SingleErc721Item(item.getErc721Item(i+1));
      string memory symbol = ERC721(erc721Item.getTokenAddress()).symbol();
      activeAuctionsForSymbol[symbol].add(auctionId);
      categories.add(bytes32(bytes(symbol)));
    }
  }

  function removeAuction(uint256 auctionId, Item item) public onlyOwner {

    address transferAddress = getAuctionTransferAddress(auctionId);
    //Item item = auction.getItem();
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
      string memory symbol = ERC20(erc20).symbol();
      activeAuctionsForSymbol[symbol].remove(auctionId);
      insertForStatistics(symbol);
    }
    uint256 numErc721Tokens = item.numErc721Tokens();
    for(uint i = 0; i < numErc721Tokens; i++){
      SingleErc721Item erc721Item = SingleErc721Item(item.getErc721Item(i+1));
      string memory symbol = ERC721(erc721Item.getTokenAddress()).symbol();
      activeAuctionsForSymbol[symbol].remove(auctionId);
      insertForStatistics(symbol);
    }
  }
}