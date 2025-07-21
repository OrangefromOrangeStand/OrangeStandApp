import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer } from "ethers";
const { mine } = require("@nomicfoundation/hardhat-network-helpers");

describe("Auction", function () {
  let Auction: any;
  let Bid: any;
  let Item: any;
  let OrangeStandTicket: any;
  let OrangeStandSpentTicket: any;
  let CollectionErc20: any;

  let auction: Contract;
  let bid: Contract;
  let bid2: Contract;
  let item: Contract;
  let paymentToken: Contract;
  let spentTicket: Contract;
  let userToken: Contract;

  let owner: Signer;
  let originalOwner: Signer;
  let bidder: Signer;
  let bidder2: Signer;
  let treasury: Signer;
  let ownerAddr: string;
  let originalOwnerAddr: string;
  let bidderAddr: string;
  let bidder2Addr: string;
  let treasuryAddr: string;

  const auctionId = 1;
  var auctionStartTime = 10000;
  const cycleDuration = 2; // minutes
  const initialPrice = 50;
  const priceIncrease = 10;

  beforeEach(async function () {
    [owner, originalOwner, bidder, bidder2, treasury] = await ethers.getSigners();
    ownerAddr = await owner.getAddress();
    originalOwnerAddr = await originalOwner.getAddress();
    bidderAddr = await bidder.getAddress();
    bidder2Addr = await bidder2.getAddress();
    treasuryAddr = await treasury.getAddress();

    CollectionErc20 = await ethers.getContractFactory("CollectionErc20");
    userToken = await CollectionErc20.deploy("usdTCollection", "USDT", 9);
    OrangeStandSpentTicket = await ethers.getContractFactory("OrangeStandSpentTicket");
    spentTicket = await OrangeStandSpentTicket.deploy(await userToken.getAddress());
    OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
    paymentToken = await OrangeStandTicket.deploy(await userToken.getAddress(), await spentTicket.getAddress());
    Item = await ethers.getContractFactory("Item");
    //item = await Item.deploy("TestItem", "TI", ownerAddr);
    item = await Item.deploy();

    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    auctionStartTime = block?.timestamp;

    Auction = await ethers.getContractFactory("Auction");
    auction = await Auction.deploy(
      auctionId,
      item,
      auctionStartTime,
      cycleDuration,
      initialPrice,
      originalOwnerAddr,
      priceIncrease,
      await paymentToken.getAddress(),
      treasuryAddr,
      await spentTicket.getAddress()
    );
  });

  describe("Deployment", function () {
    it("should set correct auction parameters", async function () {
      expect(await auction.getId()).to.equal(auctionId);
      expect(await auction.getItem()).to.equal(item.target);
      expect(await auction.getCurrentCycleStartTime()).to.equal(auctionStartTime);
      expect(await auction.getCycleDuration()).to.equal(cycleDuration);
      expect(await auction.getInitialPrice()).to.equal(initialPrice);
      expect(await auction.getPriceIncrease()).to.equal(priceIncrease);
      expect(await auction.getOriginalOwner()).to.equal(originalOwnerAddr);
      expect(await auction.getPaymentToken()).to.equal(await paymentToken.getAddress());
      expect(await auction.getActivePrice()).to.equal(initialPrice);
      expect(await auction.isSettled()).to.equal(false);
    });

    it("should have no active bid initially", async function () {
      expect(await auction.getActiveBid()).to.equal(ethers.ZeroAddress);
    });

    it("should calculate cycle end time correctly", async function () {
      const expectedEnd = auctionStartTime + cycleDuration * 60;
      expect(await auction.getCurrentCycleEndTime()).to.equal(expectedEnd);
    });

    it("should report auction as unfinished at deployment", async function () {
      expect(await auction.isFinished()).to.equal(false);
    });
  });

  describe("Bidding", function () {
    let bidPrice: number;
    let blockTimestamp: number;

    beforeEach(async function () {
      bidPrice = initialPrice;
      await userToken.mint(bidderAddr, bidPrice);
      await userToken.connect(bidder).approve(await paymentToken.getAddress(), bidPrice);
      await paymentToken.connect(bidder).mint(bidderAddr, bidPrice);

      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      blockTimestamp = block.timestamp + 1;

      Bid = await ethers.getContractFactory("Bid");
      bid = await Bid.deploy(bidderAddr, blockTimestamp, item.target, bidPrice);
    });

    it("should allow owner to make a new bid and update state", async function () {
      await paymentToken.connect(bidder).approve(auction.target, bidPrice);
      await expect(auction.makeNewBid(bid.target))
        .to.emit(auction, "BidUpdate")
        .withArgs(
          auctionId,
          bid.target,
          ethers.ZeroAddress,
          bidderAddr,
          originalOwnerAddr
        );
      expect(await auction.getActiveBid()).to.equal(bid.target);
      expect(await auction.getActivePrice()).to.equal(initialPrice);
    });

    it("should increase price and update bidder on consecutive bids", async function () {
      // First bid
      await paymentToken.connect(bidder).approve(auction.target, bidPrice);
      await auction.makeNewBid(bid.target);

      // Second bid
      await userToken.mint(bidder2Addr, bidPrice);
      await userToken.connect(bidder2).approve(await paymentToken.getAddress(), bidPrice);
      await paymentToken.connect(bidder2).mint(bidder2Addr, bidPrice);

      const bid2BlockNum = await ethers.provider.getBlockNumber();
      const bid2Block = await ethers.provider.getBlock(bid2BlockNum);
      const bid2Timestamp = bid2Block.timestamp + 1;
      bid2 = await Bid.deploy(bidder2Addr, bid2Timestamp, item.target, bidPrice);

      await paymentToken.connect(bidder2).approve(auction.target, bidPrice);
      await expect(auction.makeNewBid(bid2.target))
        .to.emit(auction, "BidUpdate")
        .withArgs(
          auctionId,
          bid2.target,
          bid.target,
          bidder2Addr,
          bidderAddr
        );
      expect(await auction.getActiveBid()).to.equal(bid2.target);
      expect(await auction.getActivePrice()).to.equal(initialPrice + priceIncrease);
    });

    it("should emit AuctionFinished if bidding after auction end", async function () {
      await mine(200); // advance blocks to simulate time passing
      await paymentToken.connect(bidder).approve(auction.target, bidPrice);
      await expect(auction.makeNewBid(bid.target))
        .to.emit(auction, "AuctionFinished")
        .withArgs(auctionId);
    });

    it("should only allow owner to make a new bid", async function () {
      await paymentToken.connect(bidder).approve(auction.target, bidPrice);
      await expect(auction.connect(bidder).makeNewBid(bid.target)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Settlement", function () {
    let bidPrice: number;
    beforeEach(async function () {
      bidPrice = initialPrice;
      await userToken.mint(bidderAddr, bidPrice);
      await userToken.connect(bidder).approve(await paymentToken.getAddress(), bidPrice);
      await paymentToken.connect(bidder).mint(bidderAddr, bidPrice);

      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      const blockTimestamp = block.timestamp + 1;

      Bid = await ethers.getContractFactory("Bid");
      bid = await Bid.deploy(bidderAddr, blockTimestamp, item.target, bidPrice);

      await paymentToken.connect(bidder).approve(auction.target, bidPrice);
      await auction.makeNewBid(bid.target);
    });

    it("should emit AuctionOnGoing if auction not finished", async function () {
      await expect(auction.settle(originalOwnerAddr))
        .to.emit(auction, "AuctionOnGoing")
        .withArgs(auctionId);
      expect(await auction.isSettled()).to.equal(false);
    });

    it("should settle auction and distribute spent tickets after auction end", async function () {
      await spentTicket.addMinter(auction.target);
      await paymentToken.addBurner(auction.target);
      await mine(200);

      const balanceBefore = await paymentToken.balanceOf(auction.target);
      await expect(auction.settle(originalOwnerAddr))
        .to.emit(auction, "AuctionSettled")
        .withArgs(auctionId, bidderAddr, initialPrice);

      expect(await auction.isSettled()).to.equal(true);
      expect(await spentTicket.balanceOf(originalOwnerAddr)).to.equal((balanceBefore * 99n) / 100n);
      expect(await spentTicket.balanceOf(treasuryAddr)).to.equal((balanceBefore * 1n) / 100n);
    });

    it("should emit AuctionCompleted if settled twice", async function () {
      await spentTicket.addMinter(auction.target);
      await paymentToken.addBurner(auction.target);
      await mine(200);

      await auction.settle(originalOwnerAddr);
      await expect(auction.settle(originalOwnerAddr))
        .to.emit(auction, "AuctionCompleted")
        .withArgs(auctionId);
    });

    it("should revert if non-owner or non-active bidder tries to settle", async function () {
      await expect(auction.settle(bidder2Addr)).to.be.revertedWith("Caller is not allowed to settle auction");
    });
  });

  describe("Edge Cases", function () {
    it("should handle zero address for payment and settlement tokens", async function () {
      const zeroAddress = ethers.ZeroAddress;
      const auction2 = await Auction.deploy(
        auctionId + 1,
        item,
        auctionStartTime,
        cycleDuration,
        initialPrice,
        originalOwnerAddr,
        priceIncrease,
        zeroAddress,
        treasuryAddr,
        zeroAddress
      );
      expect(await auction2.getPaymentToken()).to.equal(zeroAddress);
      expect(await auction2.isSettled()).to.equal(false);
    });

    it("should handle no bids and settle auction", async function () {
      await spentTicket.addMinter(auction.target);
      await paymentToken.addBurner(auction.target);
      await mine(200);

      await expect(auction.settle(originalOwnerAddr))
        .to.emit(auction, "AuctionSettled")
        .withArgs(auctionId, originalOwnerAddr, 0);
      expect(await auction.isSettled()).to.equal(true);
    });
  });

  describe("Time and Price Logic", function () {
    it("should update cycle start time on new bid", async function () {
      await userToken.mint(bidderAddr, initialPrice);
      await userToken.connect(bidder).approve(await paymentToken.getAddress(), initialPrice);
      await paymentToken.connect(bidder).mint(bidderAddr, initialPrice);

      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      const blockTimestamp = block.timestamp + 1;

      Bid = await ethers.getContractFactory("Bid");
      bid = await Bid.deploy(bidderAddr, blockTimestamp, item.target, initialPrice);

      await paymentToken.connect(bidder).approve(auction.target, initialPrice);
      await auction.makeNewBid(bid.target);

      const newStartTime = await auction.getCurrentCycleStartTime();
      expect(newStartTime).to.be.closeTo(await auction.getCurrentBlockTime(), 2);
    });

    it("should report finished after cycle end time", async function () {
      await mine(cycleDuration * 60 + 10);
      expect(await auction.isFinished()).to.equal(true);
    });
  });
});