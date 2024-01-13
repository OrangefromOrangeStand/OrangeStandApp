pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Bid.sol";
import "./Item.sol";
import "./Auction.sol";
import "./OrangeStandTicket.sol";
import "./OrangeStandSpentTicket.sol";
import "./AuctionTracker.sol";

contract AuctionCoordinator is AccessControl {
  event Erc721AuctionCreation(uint256 auctionId, address item, address originalOwner, uint256 tokenId, uint blockNumber);
  event Erc20AuctionCreation(uint256 auctionId, address item, address originalOwner, uint256 amount, uint blockNumber);
  using Counters for Counters.Counter;
  Counters.Counter private _auctionIds;
  address private paymAddr;
  address private redemptionAddr;
  address private acTreasuryAddress;
  bytes32 public constant ITEM_OWNER = keccak256("ITEM_OWNER");
  bytes32 public constant ACTIVE_BIDDER = keccak256("ACTIVE_BIDDER");
  AuctionTracker private auctionTracker;

  constructor(address ticketAddress, address trsyAddress, address redemptionTicketAddress){
    paymAddr = ticketAddress;
    acTreasuryAddress = trsyAddress;
    redemptionAddr = redemptionTicketAddress;
    auctionTracker = new AuctionTracker();
  }

  function getAllCategories() public view returns (bytes32[] memory){
    return auctionTracker.getAllCategories();
  }

  function getAllActiveAuctions(string memory symbol) public view returns (uint256[] memory){
    return auctionTracker.getAllActiveAuctions(symbol);
  }

  function makeBid(uint256 auctionId, address bidder) public {
    auctionTracker.generateBid(auctionId, bidder);
    _grantRole(ACTIVE_BIDDER, bidder);
  }

  function getAuction(uint256 auctionId) public view returns (Auction) {
    return auctionTracker.getAuction(auctionId);
  }

  function createErc721Auction(address erc721Address,
    uint256 tokenId,
    address originalOwner,
    uint256 auctionSpeed,
    uint256 initialBidPrice,
    address paymentToken,
    uint256 bidCost,
    address settlementToken
  ) public {
    IERC721(erc721Address).transferFrom(address(originalOwner), address(address(auctionTracker)), tokenId);
    Item newItem = new Item();
    newItem.addErc721(erc721Address, tokenId);
    uint256 auctionId = setUpAuction(address(newItem), originalOwner, auctionSpeed, initialBidPrice, paymentToken, bidCost, settlementToken);
    emit Erc721AuctionCreation(auctionId,erc721Address,originalOwner,tokenId, block.number);
    //emit Erc721AuctionCreation(1,1,1,1, 1);
  }

  function createErc20Auction(address erc20Address,
    uint256 amount,
    address originalOwner,
    uint256 auctionSpeed,
    uint256 initialBidPrice,
    address paymentToken,
    uint256 bidCost,
    address settlementToken
  ) public {
    Item newItem = new Item();
    IERC20(erc20Address).transferFrom(address(originalOwner), address(address(auctionTracker)), amount);
    newItem.addErc20(erc20Address, amount);
    uint256 auctionId = setUpAuction(address(newItem), originalOwner, auctionSpeed, initialBidPrice, paymentToken, bidCost, settlementToken);
    emit Erc20AuctionCreation(auctionId,erc20Address,originalOwner,amount, block.number);
  }

  function setUpAuction(
    address item,
    address originalOwner,
    uint256 auctionSpeed,
    uint256 initialBidPrice,
    address paymentToken,
    uint256 bidCost,
    address settledTicketAddress
  ) private returns (uint256){
    _auctionIds.increment();
    uint256 auctionId = _auctionIds.current();
    _grantRole(ITEM_OWNER, originalOwner);
    Auction auction = new Auction(auctionId, Item(item), block.timestamp, 
        auctionSpeed, initialBidPrice, originalOwner, bidCost, paymentToken, 
        acTreasuryAddress, settledTicketAddress);
    //auctionTracker.addToAuction(auctionId, auction);
    OrangeStandTicket(paymentToken).addBurner(address(auction));
    OrangeStandSpentTicket(settledTicketAddress).addMinter(address(auction));
    //Item retrievedItem = Item(auction.getItem());
    //auctionTracker.addToActiveAuction(auctionId, retrievedItem);
    auctionTracker.addActiveAuction(auctionId, auction);
    return auctionId;
  }

  function settleAuction(uint256 auctionId) public {
    require(hasRole(ITEM_OWNER, msg.sender) || hasRole(ACTIVE_BIDDER, msg.sender), "Caller is not allowed to settle auction");
    Auction auction = getAuction(auctionId);
    auction.settle();
    //address transferAddress = auctionTracker.getAuctionTransferAddress(auctionId);
    Item item = auction.getItem();
    /*if(item.numErc20Tokens() > 0) {
      SingleErc20Item erc20Item = SingleErc20Item(item.getItem(1));
      IERC20(erc20Item.getTokenAddress()).transfer(transferAddress, erc20Item.getQuantity());
    } else {
      SingleErc721Item erc721Item = SingleErc721Item(item.getItem(1));
      IERC721(erc721Item.getTokenAddress()).transferFrom(address(this), transferAddress, erc721Item.getTokenId());
    }*/
    auctionTracker.removeAuction(auctionId, item);
  }

  function getTokenOccurrence() public view returns (TokenOccurrence[] memory){
    return auctionTracker.getTokenOccurrence();
  }
}
