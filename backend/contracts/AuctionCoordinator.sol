pragma solidity >=0.8.0 <0.9.0;

//SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "./Bid.sol";
import "./Item.sol";
import "./Auction.sol";
import "./OrangeStandTicket.sol";

contract AuctionCoordinator is AccessControl {
  event Erc721AuctionCreation(uint256 auctionId, address item, address originalOwner, uint256 tokenId, uint blockNumber);
  event Erc20AuctionCreation(uint256 auctionId, address item, address originalOwner, uint256 amount, uint blockNumber);
  event TicketIssued(address owner, uint256 amount, uint blockNumber);
  event TicketRedeemed(address owner, uint256 amount, uint blockNumber);

  using Counters for Counters.Counter;
  Counters.Counter private _auctionIds;
  using EnumerableSet for EnumerableSet.UintSet;
  EnumerableSet.UintSet private activeAuctions;
  mapping(uint256 => Auction) private auctions;
  address private paymentTicketAddress;

  // Create a new role identifier for the minter role
  bytes32 public constant ITEM_OWNER = keccak256("ITEM_OWNER");
  bytes32 public constant ACTIVE_BIDDER = keccak256("ACTIVE_BIDDER");

  /*function initialize() public initializer {
  }*/

  constructor(address ticketAddress){
    paymentTicketAddress = ticketAddress;
  }

  function getAllActiveAuctions() public view returns (uint256[] memory){
    return activeAuctions.values();
  }

  function makeBid(
    uint256 auctionId,
    address bidder
  ) public {
    Auction auction = Auction(auctions[auctionId]);
    Bid activeBid = Bid(auction.getActiveBid());
    address itemAddress = address(auction.getItem());

    uint256 newPrice = auction.getInitialPrice();
    if(address(activeBid) != address(0x0)){
      newPrice = activeBid.getBidPrice();
      //uint256 activeBidPrice = activeBid.getBidPrice();
      //newPrice = activeBidPrice + auction.getCycleDuration();
    }
    newPrice = newPrice + auction.getCycleDuration();
    Bid newBid = new Bid(bidder, block.timestamp, itemAddress, newPrice);
    auction.makeNewBid(address(newBid));
    _grantRole(ACTIVE_BIDDER, bidder);
  }

  function getAuction(uint256 auctionId) public view returns (Auction) {
    return Auction(auctions[auctionId]);
  }

  function createAuction(address erc721Address,
    uint256 tokenId,
    address originalOwner,
    uint256 auctionSpeed,
    uint256 initialBidPrice,
    address paymentToken,
    uint256 bidCost
  ) public {
    IERC721(erc721Address).transferFrom(address(originalOwner), address(this), tokenId);
    Item newItem = new Item();
    newItem.addErc721(erc721Address, tokenId);
    uint256 auctionId = setUpAuction(address(newItem), originalOwner, auctionSpeed, initialBidPrice, paymentToken, bidCost);
    emit Erc721AuctionCreation(auctionId,erc721Address,originalOwner,tokenId, block.number);
  }

  function createErc20Auction(address erc20Address,
    uint256 amount,
    address originalOwner,
    uint256 auctionSpeed,
    uint256 initialBidPrice,
    address paymentToken,
    uint256 bidCost
  ) public {
    Item newItem = new Item();
    IERC20(erc20Address).transferFrom(address(originalOwner), address(this), amount);
    newItem.addErc20(erc20Address, amount);
    uint256 auctionId = setUpAuction(address(newItem), originalOwner, auctionSpeed, initialBidPrice, paymentToken, bidCost);
    emit Erc20AuctionCreation(auctionId,erc20Address,originalOwner,amount, block.number);
  }

  function setUpAuction(
    address item,
    address originalOwner,
    uint256 auctionSpeed,
    uint256 initialBidPrice,
    address paymentToken,
    uint256 bidCost
  ) public returns (uint256){
    _auctionIds.increment();
    uint256 auctionId = _auctionIds.current();

    _grantRole(ITEM_OWNER, originalOwner);
    auctions[auctionId] = new Auction(auctionId, Item(item), block.timestamp, auctionSpeed, initialBidPrice, originalOwner, bidCost, paymentToken);
    activeAuctions.add(auctionId);
    return auctionId;
  }

  function settleAuction(
    uint256 auctionId
  ) public {
    require(hasRole(ITEM_OWNER, msg.sender) || hasRole(ACTIVE_BIDDER, msg.sender), "Caller is not allowed to settle auction");
    auctions[auctionId].settle();

    Item item = auctions[auctionId].getItem();
    Bid activeBid = auctions[auctionId].getActiveBid();
    address transferAddress = auctions[auctionId].getOriginalOwner();
    if(address(activeBid) != address(0x0)){
        transferAddress = activeBid.getBidderAddress();
    }
    if(item.numErc20Tokens() > 0) {
      SingleErc20Item erc20Item = SingleErc20Item(item.getItem(1));
      IERC20 erc20 = IERC20(erc20Item.getTokenAddress());
      erc20.transfer(transferAddress, erc20Item.getQuantity());
    } else {
      SingleErc721Item erc721Item = SingleErc721Item(item.getItem(1));
      IERC721 erc721 = IERC721(erc721Item.getTokenAddress());
      erc721.transferFrom(address(this), transferAddress, erc721Item.getTokenId());
    }
    activeAuctions.remove(auctionId);
  }

  function createTickets(uint256 amount, address ownerAddress) public {
    OrangeStandTicket ticketContract = OrangeStandTicket(paymentTicketAddress);
    ticketContract.mint(ownerAddress, amount);
    emit TicketIssued(ownerAddress, amount, block.number);
  }

  function redeemTickets(uint256 amount, address ownerAddress) public {
    OrangeStandTicket ticketContract = OrangeStandTicket(paymentTicketAddress);
    ticketContract.burn(ownerAddress, amount);
    emit TicketRedeemed(ownerAddress, amount, block.number);
  }
}
