import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";
const { mine } = require("@nomicfoundation/hardhat-network-helpers");

describe("AuctionTracker", function () {
  let AuctionTracker: any;
  let Auction: any;
  let Item: any;
  let Bid: any;
  let ERC20: any;
  let SimulationToken: any;
  let OrangeStandTicket: any;
  let OrangeStandSpentTicket: any;
  let CollectionErc20: any;

  let auctionTracker: Contract;
  let auction: Contract;
  let item: Contract;
  let erc20Token: Contract;
  let simToken: Contract;
  let userContract: Contract;
  let orangeStandTicket: Contract;
  let orangeStandSpentTicket: Contract;

  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;
  let addr4: any;
  let treasury: any;

  const auctionId = 1;
  var auctionStartTime = 10000;
  const auctionLengthInMinutes = 10;
  const initialPrice = 16;
  const priceIncrease = 5;
  const symbol = "SYM";
  const symbol2 = "SYM2";
  let paymentToken: string;
  let settlementToken: string;
  let originalOwnerAddress: string;
  let treasuryAddress: string;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, addr4, treasury] = await ethers.getSigners();
    originalOwnerAddress = await addr4.getAddress();
    treasuryAddress = await treasury.getAddress();

    CollectionErc20 = await ethers.getContractFactory("CollectionErc20");
    userContract = await CollectionErc20.deploy("usdTCollection", "USDT", 7);
    OrangeStandSpentTicket = await ethers.getContractFactory("OrangeStandSpentTicket");
    orangeStandSpentTicket = await OrangeStandSpentTicket.deploy(await userContract.getAddress());
    OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
    orangeStandTicket = await OrangeStandTicket.deploy(await userContract.getAddress(), await orangeStandSpentTicket.getAddress());
    paymentToken = await orangeStandTicket.getAddress();
    settlementToken = await orangeStandSpentTicket.getAddress();

    AuctionTracker = await ethers.getContractFactory("AuctionTracker");
    Auction = await ethers.getContractFactory("Auction");
    Item = await ethers.getContractFactory("Item");
    Bid = await ethers.getContractFactory("Bid");
    ERC20 = await ethers.getContractFactory("ERC20");
    SimulationToken = await ethers.getContractFactory("SimulationToken");

    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    auctionStartTime = block?.timestamp;

    auctionTracker = await AuctionTracker.deploy();
    item = await Item.deploy();
    erc20Token = await CollectionErc20.deploy("Name", symbol, 18);
    //erc20Token = await ERC20.deploy("Name", symbol);
    simToken = await SimulationToken.deploy();
  });

  describe("Access Control", function () {
    it("addActiveAuction can only be called by owner", async function () {
      const testAuction = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await expect(auctionTracker.connect(addr1).addActiveAuction(auctionId, testAuction)).to.be.reverted;
    });

    it("updateOccurrence can only be called by owner", async function () {
      await item.addErc20(erc20Token.target, 1);
      const testAuction = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction);
      await expect(auctionTracker.connect(addr1).updateOccurrence(auctionId)).to.be.reverted;
    });

    it("generateBid can only be called by owner", async function () {
      await item.addErc20(erc20Token.target, 1);
      const testAuction = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction);
      await expect(auctionTracker.connect(addr1).generateBid(auctionId, addr1.address)).to.be.reverted;
    });

    it("removeAuction can only be called by owner", async function () {
      await item.addErc20(erc20Token.target, 1);
      const testAuction = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction);
      await expect(auctionTracker.connect(addr1).removeAuction(auctionId)).to.be.reverted;
    });
  });

  describe("Auction Storage and Retrieval", function () {
    it("should store and retrieve a single auction", async function () {
      const testAuction = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction);
      const retrievedAuction = await auctionTracker.getAuction(auctionId);
      expect(retrievedAuction).to.equal(testAuction.target);
    });

    it("should overwrite auction for same ID", async function () {
      const testAuction1 = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      const testAuction2 = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction1);
      await auctionTracker.addActiveAuction(auctionId, testAuction2);
      const retrievedAuction = await auctionTracker.getAuction(auctionId);
      expect(retrievedAuction).to.equal(testAuction2.target);
    });
  });

  describe("Token Occurrence Tracking", function () {
    it("should track token occurrence for single entry", async function () {
      await item.addErc20(erc20Token.target, 1);
      const testAuction = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction);
      await auctionTracker.updateOccurrence(auctionId);
      const occurrences = await auctionTracker.getTokenOccurrence();
      expect(occurrences.length).to.equal(1);
      expect(occurrences[0].tokenSymbol).to.equal(symbol);
    });

    it("should update moving average after auction removal", async function () {
      await item.addErc20(simToken.target, 1);
      await simToken.mint(auctionTracker.target, 1);
      await simToken.approve(auctionTracker.target, 1);
      const testAuction = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction);
      await auctionTracker.updateOccurrence(auctionId);
      const before = await auctionTracker.getTokenOccurrence();
      await auctionTracker.removeAuction(auctionId);
      const after = await auctionTracker.getTokenOccurrence();
      expect(after.length).to.equal(1);
      expect(after[0].tokenSymbol).to.equal((await simToken.symbol()));
      expect(after[0].pastUsageMovingAverage).to.be.lessThan(before[0].pastUsageMovingAverage);
    });

    it("should track multiple token occurrences", async function () {
      const item2 = await Item.deploy();
      const erc20Token2 = await ERC20.deploy("Name2", symbol2);
      await item.addErc20(erc20Token.target, 1);
      await item2.addErc20(erc20Token2.target, 1);
      const testAuction1 = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      const testAuction2 = await Auction.deploy(
        auctionId + 1, item2.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction1);
      await auctionTracker.addActiveAuction(auctionId + 1, testAuction2);
      await auctionTracker.updateOccurrence(auctionId);
      await auctionTracker.updateOccurrence(auctionId + 1);
      const occurrences = await auctionTracker.getTokenOccurrence();
      expect(occurrences.length).to.equal(2);
      expect([symbol, symbol2]).to.include(occurrences[0].tokenSymbol);
      expect([symbol, symbol2]).to.include(occurrences[1].tokenSymbol);
    });
  });

  describe("Active Auctions and Categories", function () {
    it("should return no active auctions for unknown symbol", async function () {
      const active = await auctionTracker.getAllActiveAuctions("NOSYM");
      expect(active.length).to.equal(0);
    });

    it("should return active auctions for a symbol", async function () {
      await item.addErc20(erc20Token.target, 1);
      const testAuction = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction);
      const active = await auctionTracker.getAllActiveAuctions(symbol);
      expect(active.length).to.equal(1);
      expect(active[0]).to.equal(auctionId);
    });

    it("should return multiple active auctions for same symbol", async function () {
      const item2 = await Item.deploy();
      await item.addErc20(erc20Token.target, 1);
      await item2.addErc20(erc20Token.target, 1);
      const testAuction1 = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      const testAuction2 = await Auction.deploy(
        auctionId + 1, item2.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction1);
      await auctionTracker.addActiveAuction(auctionId + 1, testAuction2);
      const active = await auctionTracker.getAllActiveAuctions(symbol);
      expect(active.length).to.equal(2);
      expect(active).to.include(BigInt(auctionId));
      expect(active).to.include(BigInt(auctionId + 1));
    });

    it("should return all categories", async function () {
      await item.addErc20(erc20Token.target, 1);
      const testAuction = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction);
      const categories = await auctionTracker.getAllCategories();
      expect(categories.length).to.equal(1);
      expect(ethers.decodeBytes32String(categories[0])).to.equal(symbol);
    });
  });

  describe("Auction Transfer Address", function () {
    it("should return original owner if no bid", async function () {
      await item.addErc20(erc20Token.target, 1);
      const testAuction = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction);
      const transferAddr = await auctionTracker.getAuctionTransferAddress(auctionId);
      expect(transferAddr).to.equal(originalOwnerAddress);
    });

    it("should return bidder address after bid", async function () {
      await item.addErc20(erc20Token.target, 1);
      const testAuction = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction);
      const bid = await Bid.deploy(addr1.address, auctionStartTime + 1, item.target, initialPrice);

      await userContract.mint(addr1.address, priceIncrease);
      await userContract.connect(addr1).approve(await orangeStandTicket.getAddress(), priceIncrease);
      await orangeStandTicket.mint(addr1.address, priceIncrease);
      await orangeStandTicket.connect(addr1).approve(await testAuction.getAddress(), priceIncrease);

      await testAuction.makeNewBid(bid.target);
      await auctionTracker.updateActiveAuctionsForUser(auctionId, addr1.address, originalOwnerAddress, testAuction);
      const transferAddr = await auctionTracker.getAuctionTransferAddress(auctionId);
      expect(transferAddr).to.equal(addr1.address);
    });
  });

  describe("User Auction Tracking", function () {
    it("should update user trackers on bidder change", async function () {
      await item.addErc20(erc20Token.target, 1);
      const testAuction = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction);
      const bid1 = await Bid.deploy(addr1.address, auctionStartTime + 1, item.target, initialPrice);
      await userContract.mint(addr1.address, priceIncrease);
      await userContract.connect(addr1).approve(await orangeStandTicket.getAddress(), priceIncrease);
      await orangeStandTicket.mint(addr1.address, priceIncrease);
      await orangeStandTicket.connect(addr1).approve(await testAuction.getAddress(), priceIncrease);
      await testAuction.makeNewBid(bid1.target);
      await auctionTracker.updateActiveAuctionsForUser(auctionId, addr1.address, originalOwnerAddress, testAuction);
      const bid2 = await Bid.deploy(addr2.address, auctionStartTime + 2, item.target, initialPrice + 1);
      await userContract.mint(addr2.address, priceIncrease);
      await userContract.connect(addr2).approve(await orangeStandTicket.getAddress(), priceIncrease);
      await orangeStandTicket.mint(addr2.address, priceIncrease);
      await orangeStandTicket.connect(addr2).approve(await testAuction.getAddress(), priceIncrease);
      await testAuction.makeNewBid(bid2.target);
      await auctionTracker.updateActiveAuctionsForUser(auctionId, addr2.address, addr1.address, testAuction);

      const finishedAuctionsAddr1 = await auctionTracker.getAllFinishedAuctions(symbol, addr1.address);
      const finishedAuctionsAddr2 = await auctionTracker.getAllFinishedAuctions(symbol, addr2.address);
      expect(finishedAuctionsAddr1.length).to.equal(0);
      expect(finishedAuctionsAddr2.length).to.equal(1);
      expect(finishedAuctionsAddr2[0]).to.equal(auctionId);
    });

    it("should remove auction from all trackers on removal", async function () {
      await item.addErc20(erc20Token.target, 1);
      await erc20Token.mint(auctionTracker.target, 1);
      const testAuction = await Auction.deploy(
        auctionId, item.target, auctionStartTime, auctionLengthInMinutes,
        initialPrice, originalOwnerAddress, priceIncrease, paymentToken,
        treasuryAddress, settlementToken
      );
      await auctionTracker.addActiveAuction(auctionId, testAuction);
      await auctionTracker.removeAuction(auctionId);
      const active = await auctionTracker.getAllActiveAuctions(symbol);
      expect(active.length).to.equal(0);
    });
  });
});