import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";
const { mine } = require("@nomicfoundation/hardhat-network-helpers");

describe("AuctionCoordinator", function () {
  let AuctionCoordinator: any;
  let AuctionTracker: any;
  let Auction: any;
  let Item: any;
  let Bid: any;
  let OrangeStandTicket: any;
  let OrangeStandSpentTicket: any;
  let CollectionErc20: any;
  let SimulationToken: any;
  let LocalCollectible: any;
  let SingleErc20Item: any;
  let SingleErc721Item: any;

  let auctionCoordinator: Contract;
  let auctionTracker: Contract;
  let orangeStandTicket: Contract;
  let orangeStandSettlementTicket: Contract;
  let userContract: Contract;

  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;
  let addr4: any;
  let treasury: any;

  const bidPrice = 800;
  const bidTimeInMinutes = 4;
  const biddingPrice = 2;
  const simTokenName = "SIM";
  const tokenAmount = 20;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, addr4, treasury] = await ethers.getSigners();
    AuctionCoordinator = await ethers.getContractFactory("AuctionCoordinator");
    AuctionTracker = await ethers.getContractFactory("AuctionTracker");
    Auction = await ethers.getContractFactory("Auction");
    Item = await ethers.getContractFactory("Item");
    Bid = await ethers.getContractFactory("Bid");
    OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
    OrangeStandSpentTicket = await ethers.getContractFactory("OrangeStandSpentTicket");
    CollectionErc20 = await ethers.getContractFactory("CollectionErc20");
    SimulationToken = await ethers.getContractFactory("SimulationToken");
    LocalCollectible = await ethers.getContractFactory("LocalCollectible");
    SingleErc20Item = await ethers.getContractFactory("SingleErc20Item");
    SingleErc721Item = await ethers.getContractFactory("SingleErc721Item");

    userContract = await CollectionErc20.deploy("usdTCollection", "USDT", 6);
    auctionTracker = await AuctionTracker.deploy();
    orangeStandSettlementTicket = await OrangeStandSpentTicket.deploy(await userContract.getAddress());
    orangeStandTicket = await OrangeStandTicket.deploy(await userContract.getAddress(), await orangeStandSettlementTicket.getAddress());
    auctionCoordinator = await AuctionCoordinator.deploy(
      await orangeStandTicket.getAddress(),
      await treasury.getAddress(),
      await orangeStandSettlementTicket.getAddress(),
      await auctionTracker.getAddress()
    );
    await auctionTracker.transferOwnership(await auctionCoordinator.getAddress());
    await orangeStandTicket.transferOwnership(await auctionCoordinator.getAddress());
    await orangeStandSettlementTicket.transferOwnership(await auctionCoordinator.getAddress());
  });

  it("should get correct active bid with multiple bids", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const simToken = await SimulationToken.deploy();
    const erc20Address = await simToken.getAddress();
    await simToken.mint(addr1.address, 20);
    await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), 20);
    await auctionCoordinator.createErc20Auction(
      erc20Address, 20, addr1.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    const auctionAddress = await auctionCoordinator.getAuction(1);

    await userContract.mint(addr1.address, bidPrice);
    await userContract.connect(addr1).approve(await orangeStandTicket.getAddress(), bidPrice);
    await orangeStandTicket.mint(addr1.address, bidPrice);
    await orangeStandTicket.connect(addr1).approve(auctionAddress, bidPrice);
    await userContract.mint(addr2.address, bidPrice);
    await userContract.connect(addr2).approve(await orangeStandTicket.getAddress(), bidPrice);
    await orangeStandTicket.mint(addr2.address, bidPrice);
    await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);

    await auctionCoordinator.makeBid(1, addr1.address);
    await auctionCoordinator.makeBid(1, addr2.address);

    const retrievedBidAddress = await (await Auction.attach(auctionAddress)).getActiveBid();
    const activeBid = await Bid.attach(retrievedBidAddress);
    expect(await activeBid.getBidderAddress()).to.equal(addr2.address);
  });

  it("should get correct active bid with single bid", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const simToken = await SimulationToken.deploy();
    const erc20Address = await simToken.getAddress();
    await simToken.mint(addr1.address, 20);
    await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), 20);
    await auctionCoordinator.createErc20Auction(
      erc20Address, 20, addr1.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    const auctionAddress = await auctionCoordinator.getAuction(1);
    await userContract.mint(addr1.address, bidPrice);
    await userContract.connect(addr1).approve(await orangeStandTicket.getAddress(), bidPrice);
    await orangeStandTicket.mint(addr1.address, bidPrice);
    await orangeStandTicket.connect(addr1).approve(auctionAddress, bidPrice);

    await auctionCoordinator.makeBid(1, addr1.address);

    const retrievedBidAddress = await (await Auction.attach(auctionAddress)).getActiveBid();
    const activeBid = await Bid.attach(retrievedBidAddress);
    expect(await activeBid.getBidderAddress()).to.equal(addr1.address);
  });

  it("should get correct active item for single auction", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const simToken = await SimulationToken.deploy();
    const erc20Address = await simToken.getAddress();
    await simToken.mint(addr1.address, 20);
    await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), 20);
    await auctionCoordinator.createErc20Auction(
      erc20Address, 20, addr1.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    const auctionAddress = await auctionCoordinator.getAuction(1);
    const retrievedActiveAuction = await Auction.attach(auctionAddress);
    const itemAddress = await retrievedActiveAuction.getItem();
    const item = await Item.attach(itemAddress);
    const retrievedErc20Item = await SingleErc20Item.attach(await item.getItem(1));
    expect(await retrievedErc20Item.getTokenAddress()).to.equal(erc20Address);
  });

  it("should get correct active items for multiple auctions", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const simToken = await SimulationToken.deploy();
    const erc20Address = await simToken.getAddress();
    await simToken.mint(addr1.address, 20);
    await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), 20);
    await simToken.mint(addr2.address, 37);
    await simToken.connect(addr2).approve(await auctionCoordinator.getAddress(), 37);

    await auctionCoordinator.createErc20Auction(
      erc20Address, 20, addr1.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    await auctionCoordinator.createErc20Auction(
      erc20Address, 37, addr2.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );

    const firstAuction = await Auction.attach(await auctionCoordinator.getAuction(1));
    const secondAuction = await Auction.attach(await auctionCoordinator.getAuction(2));
    const firstItem = await Item.attach(await firstAuction.getItem());
    const secondItem = await Item.attach(await secondAuction.getItem());
    const firstErc20Item = await SingleErc20Item.attach(await firstItem.getItem(1));
    const secondErc20Item = await SingleErc20Item.attach(await secondItem.getItem(1));
    expect(await firstErc20Item.getTokenAddress()).to.equal(erc20Address);
    expect(await firstErc20Item.getQuantity()).to.equal(20);
    expect(await secondErc20Item.getTokenAddress()).to.equal(erc20Address);
    expect(await secondErc20Item.getQuantity()).to.equal(37);
  });

  it("should get original owner for auction", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const simToken = await SimulationToken.deploy();
    const erc20Address = await simToken.getAddress();
    await simToken.mint(addr1.address, 20);
    await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), 20);
    await auctionCoordinator.createErc20Auction(
      erc20Address, 20, addr1.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    const auctionAddress = await auctionCoordinator.getAuction(1);
    const retrievedAuction = await Auction.attach(auctionAddress);
    expect(await retrievedAuction.getOriginalOwner()).to.equal(addr1.address);
  });

  it("should check treasury payment on settlement", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const simToken = await SimulationToken.deploy();
    const erc20Address = await simToken.getAddress();
    await simToken.mint(addr1.address, 20);
    await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), 20);
    await auctionCoordinator.createErc20Auction(
      erc20Address, 20, addr1.address, bidTimeInMinutes, 1,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    const auctionAddress = await auctionCoordinator.getAuction(1);
    const auction = await Auction.attach(auctionAddress);
    await userContract.mint(addr2.address, bidPrice);
    await userContract.connect(addr2).approve(await orangeStandTicket.getAddress(), bidPrice);
    await orangeStandTicket.mint(addr2.address, bidPrice);
    await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
    await auctionCoordinator.makeBid(1, addr2.address);
    await mine(1000);
    await expect(auctionCoordinator.connect(addr2).settleAuction(1))
      .to.emit(auction, "AuctionSettled")
      .withArgs(1, addr2.address, 1);
    const treasuryBalance = await orangeStandSettlementTicket.balanceOf(await treasury.getAddress());
    expect(treasuryBalance).to.be.gt(0);
  });

  it("should create and check ERC721 auction item contract details", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const LocalCollectible = await ethers.getContractFactory("LocalCollectible");
    const auctionNft = await LocalCollectible.deploy();
    await auctionNft.mintItem(addr1.address, "Qm...");
    await auctionNft.connect(addr1).approve(await auctionCoordinator.getAddress(), 1);
    await auctionNft.mintItem(addr2.address, "Qm...");
    await auctionNft.connect(addr2).approve(await auctionCoordinator.getAddress(), 2);
    await auctionCoordinator.createErc721Auction(
      await auctionNft.getAddress(), 1, addr1.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    await auctionCoordinator.createErc721Auction(
      await auctionNft.getAddress(), 2, addr2.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    const firstAuction = await Auction.attach(await auctionCoordinator.getAuction(1));
    const secondAuction = await Auction.attach(await auctionCoordinator.getAuction(2));
    const firstItem = await Item.attach(await firstAuction.getItem());
    const secondItem = await Item.attach(await secondAuction.getItem());
    const firstErc721Item = await SingleErc721Item.attach(await firstItem.getItem(1));
    const secondErc721Item = await SingleErc721Item.attach(await secondItem.getItem(1));
    expect(await firstErc721Item.getTokenAddress()).to.equal(await auctionNft.getAddress());
    expect(await firstErc721Item.getTokenId()).to.equal(1);
    expect(await secondErc721Item.getTokenAddress()).to.equal(await auctionNft.getAddress());
    expect(await secondErc721Item.getTokenId()).to.equal(2);
  });

  describe("Active Auctions Retrieval", function () {
  it("should return no active auctions for unknown category", async function () {
    const activeAuctions = await auctionCoordinator.getActiveAuctionsForWindow("NOSYM", 0);
    const activeAuctionsCount = await auctionCoordinator.getAllActiveAuctionsCount("NOSYM");
    expect(activeAuctions.length).to.equal(1);
    expect(activeAuctionsCount).to.equal(0);
  });

  it("should return one active auction for a category after creation", async function () {
    const simToken = await SimulationToken.deploy();
    const erc20Address = await simToken.getAddress();
    await simToken.mint(addr1.address, tokenAmount);
    await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
    await auctionCoordinator.createErc20Auction(
      erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    const symbol = await simToken.symbol();
    const activeAuctions = await auctionCoordinator.getActiveAuctionsForWindow(symbol, 0);
    expect(activeAuctions.length).to.equal(1);
    expect(activeAuctions[0]).to.equal(1);
  });

  it("should return multiple active auctions for a category", async function () {
    const simToken = await SimulationToken.deploy();
    const erc20Address = await simToken.getAddress();
    await simToken.mint(addr1.address, tokenAmount * 2);
    await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount * 2);
    await auctionCoordinator.createErc20Auction(
      erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    await auctionCoordinator.createErc20Auction(
      erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    const symbol = await simToken.symbol();
    const activeAuctions = await auctionCoordinator.getActiveAuctionsForWindow(symbol, 0);
    expect(activeAuctions.length).to.equal(2);
    expect(activeAuctions).to.include(BigInt(1));
    expect(activeAuctions).to.include(BigInt(2));
  });

  it("should decrease active auctions after settlement", async function () {
    const simToken = await SimulationToken.deploy();
    const erc20Address = await simToken.getAddress();
    await simToken.mint(addr1.address, tokenAmount * 2);
    await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount * 2);
    await auctionCoordinator.createErc20Auction(
      erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    await auctionCoordinator.createErc20Auction(
      erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    const symbol = await simToken.symbol();
    await mine(1000);
    await auctionCoordinator.connect(addr1).settleAuction(1);
    const activeAuctions = await auctionCoordinator.getActiveAuctionsForWindow(symbol, 0);
    expect(activeAuctions.length).to.equal(1);
    expect(activeAuctions[0]).to.equal(2);
  });
});

describe("Repeated Bidding and Clearing", function () {
  it("should clear biddable auctions for user after settlement", async function () {
    const simToken = await SimulationToken.deploy();
    const erc20Address = await simToken.getAddress();
    await simToken.mint(addr1.address, tokenAmount);
    await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
    await auctionCoordinator.createErc20Auction(
      erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    const auctionAddress = await auctionCoordinator.getAuction(1);
    await userContract.mint(addr2.address, bidPrice);
    await userContract.connect(addr2).approve(await orangeStandTicket.getAddress(), bidPrice);
    await orangeStandTicket.mint(addr2.address, bidPrice);
    await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
    await auctionCoordinator.makeBid(1, addr2.address);
    await mine(1000);
    await auctionCoordinator.connect(addr2).settleAuction(1);
    const finishedAuctions = await auctionCoordinator.getAllFinishedAuctions(simTokenName, addr2.address);
    expect(finishedAuctions.length).to.equal(0);
    const activeAuctions = await auctionCoordinator.getActiveAuctionsForWindow(simTokenName, 0);
    const activeAuctionsCount = await auctionCoordinator.getAllActiveAuctionsCount(simTokenName);
    expect(activeAuctions.length).to.equal(1);
    expect(activeAuctionsCount).to.equal(0);
  });

  it("should allow repeated bidding and update active bid", async function () {
    const simToken = await SimulationToken.deploy();
    const erc20Address = await simToken.getAddress();
    await simToken.mint(addr1.address, tokenAmount);
    await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
    await auctionCoordinator.createErc20Auction(
      erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    const auctionAddress = await auctionCoordinator.getAuction(1);
    await userContract.mint(addr2.address, bidPrice * 2);
    await userContract.connect(addr2).approve(await orangeStandTicket.getAddress(), bidPrice * 2);
    await orangeStandTicket.mint(addr2.address, bidPrice * 2);
    await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
    await auctionCoordinator.makeBid(1, addr2.address);
    await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
    await auctionCoordinator.makeBid(1, addr2.address);
    const activeBidAddress = await (await Auction.attach(auctionAddress)).getActiveBid();
    const activeBid = await Bid.attach(activeBidAddress);
    expect(await activeBid.getBidderAddress()).to.equal(addr2.address);
  });
});

describe("Treasury and Owner Payment Split", function () {
  it("should split settlement tickets between owner and treasury", async function () {
    const simToken = await SimulationToken.deploy();
    const erc20Address = await simToken.getAddress();
    await simToken.mint(addr1.address, tokenAmount);
    await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
    await auctionCoordinator.createErc20Auction(
      erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, 100,
      orangeStandTicket, bidPrice, orangeStandSettlementTicket
    );
    const auctionAddress = await auctionCoordinator.getAuction(1);
    await userContract.mint(addr2.address, bidPrice);
    await userContract.connect(addr2).approve(await orangeStandTicket.getAddress(), bidPrice);
    await orangeStandTicket.mint(addr2.address, bidPrice);
    await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
    await auctionCoordinator.makeBid(1, addr2.address);
    await mine(1000);
    await auctionCoordinator.connect(addr2).settleAuction(1);
    const treasuryBalance = await orangeStandSettlementTicket.balanceOf(await treasury.getAddress());
    const ownerBalance = await orangeStandSettlementTicket.balanceOf(addr1.address);
    expect(treasuryBalance).to.be.gt(0);
    expect(ownerBalance).to.be.gt(0);
  });
});

  describe("Category Management", function () {
    it("should return no categories if none created", async function () {
      const categories = await auctionCoordinator.getAllCategories();
      expect(categories.length).to.equal(0);
    });

    it("should return one category after ERC20 auction creation", async function () {
      const simToken = await SimulationToken.deploy();
      const erc20Address = await simToken.getAddress();
      await simToken.mint(addr1.address, tokenAmount);
      await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
      await auctionCoordinator.createErc20Auction(
        erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
        orangeStandTicket, bidPrice, orangeStandSettlementTicket
      );
      const categories = await auctionCoordinator.getAllCategories();
      expect(categories.length).to.equal(1);
    });

    it("should return multiple categories after ERC20 and ERC721 auctions", async function () {
      const simToken = await SimulationToken.deploy();
      const erc20Address = await simToken.getAddress();
      await simToken.mint(addr1.address, tokenAmount);
      await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);

      const auctionNft = await LocalCollectible.deploy();
      await auctionNft.mintItem(addr1.address, "Qm...");
      const erc721ItemAddress = await auctionNft.getAddress();
      await auctionNft.connect(addr1).approve(await auctionCoordinator.getAddress(), 1);

      await auctionCoordinator.createErc20Auction(
        erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
        orangeStandTicket, bidPrice, orangeStandSettlementTicket
      );
      await auctionCoordinator.createErc721Auction(
        erc721ItemAddress, 1, addr1.address, bidTimeInMinutes, biddingPrice,
        orangeStandTicket, bidPrice, orangeStandSettlementTicket
      );
      const categories = await auctionCoordinator.getAllCategories();
      expect(categories.length).to.equal(2);
    });
  });

  describe("Auction Creation and Retrieval", function () {
    it("should create and retrieve a single ERC20 auction", async function () {
      const simToken = await SimulationToken.deploy();
      const erc20Address = await simToken.getAddress();
      await simToken.mint(addr1.address, tokenAmount);
      await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
      await expect(
        auctionCoordinator.createErc20Auction(
          erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
          orangeStandTicket, bidPrice, orangeStandSettlementTicket
        )
      ).to.emit(auctionCoordinator, "Erc20AuctionCreation");
      const auctionAddress = await auctionCoordinator.getAuction(1);
      expect(auctionAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("should create and retrieve a single ERC721 auction", async function () {
      const auctionNft = await LocalCollectible.deploy();
      await auctionNft.mintItem(addr1.address, "Qm...");
      const erc721ItemAddress = await auctionNft.getAddress();
      await auctionNft.connect(addr1).approve(await auctionCoordinator.getAddress(), 1);
      await expect(
        auctionCoordinator.createErc721Auction(
          erc721ItemAddress, 1, addr1.address, bidTimeInMinutes, biddingPrice,
          orangeStandTicket, bidPrice, orangeStandSettlementTicket
        )
      ).to.emit(auctionCoordinator, "Erc721AuctionCreation");
      const auctionAddress = await auctionCoordinator.getAuction(1);
      expect(auctionAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("should create multiple ERC20 auctions and retrieve them", async function () {
      const simToken = await SimulationToken.deploy();
      const erc20Address = await simToken.getAddress();
      await simToken.mint(addr1.address, tokenAmount * 2);
      await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount * 2);
      await auctionCoordinator.createErc20Auction(
        erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
        orangeStandTicket, bidPrice, orangeStandSettlementTicket
      );
      await auctionCoordinator.createErc20Auction(
        erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
        orangeStandTicket, bidPrice, orangeStandSettlementTicket
      );
      const auction1 = await auctionCoordinator.getAuction(1);
      const auction2 = await auctionCoordinator.getAuction(2);
      expect(auction1).to.not.equal(ethers.ZeroAddress);
      expect(auction2).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Active and Finished Auctions", function () {
    it("should return no finished auctions if none created", async function () {
      const finished = await auctionCoordinator.getAllFinishedAuctions(simTokenName, addr1.address);
      expect(finished.length).to.equal(0);
    });

    it("should return finished auctions after creation", async function () {
      const simToken = await SimulationToken.deploy();
      const erc20Address = await simToken.getAddress();
      await simToken.mint(addr1.address, tokenAmount);
      await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
      await auctionCoordinator.createErc20Auction(
        erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
        orangeStandTicket, bidPrice, orangeStandSettlementTicket
      );
      const finished = await auctionCoordinator.getAllFinishedAuctions(simTokenName, addr1.address);
      expect(finished.length).to.equal(1);
    });

    it("should remove finished auction after settlement", async function () {
      const simToken = await SimulationToken.deploy();
      const erc20Address = await simToken.getAddress();
      await simToken.mint(addr1.address, tokenAmount);
      await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
      await auctionCoordinator.createErc20Auction(
        erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
        orangeStandTicket, bidPrice, orangeStandSettlementTicket
      );
      await mine(1000);
      await auctionCoordinator.connect(addr1).settleAuction(1);
      const finished = await auctionCoordinator.getAllFinishedAuctions(simTokenName, addr1.address);
      expect(finished.length).to.equal(0);
    });
  });

  describe("Bidding and Settlement", function () {
    it("should allow bidding and update active bid", async function () {
      const simToken = await SimulationToken.deploy();
      const erc20Address = await simToken.getAddress();
      await simToken.mint(addr1.address, tokenAmount);
      await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
      await auctionCoordinator.createErc20Auction(
        erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
        orangeStandTicket, bidPrice, orangeStandSettlementTicket
      );
      const auctionAddress = await auctionCoordinator.getAuction(1);
      const auction = await Auction.attach(auctionAddress);
      await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
      await userContract.mint(addr2.address, bidPrice);
      await userContract.connect(addr2).approve(await orangeStandTicket.getAddress(), bidPrice);
      await orangeStandTicket.mint(addr2.address, bidPrice);
      await orangeStandTicket.connect(addr2).approve(await auction.getAddress(), bidPrice);
      await auctionCoordinator.makeBid(1, addr2.address);
      const activeBidAddress = await auction.getActiveBid();
      const activeBid = await Bid.attach(activeBidAddress);
      expect(await activeBid.getBidderAddress()).to.equal(addr2.address);
    });

    it("should not allow bidding on finished auction", async function () {
      const simToken = await SimulationToken.deploy();
      const erc20Address = await simToken.getAddress();
      await simToken.mint(addr1.address, tokenAmount);
      await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
      await auctionCoordinator.createErc20Auction(
        erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
        orangeStandTicket, bidPrice, orangeStandSettlementTicket
      );
      const auctionAddress = await auctionCoordinator.getAuction(1);
      const auction = await Auction.attach(auctionAddress);
      await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
      await userContract.mint(addr2.address, bidPrice);
      await userContract.connect(addr2).approve(await orangeStandTicket.getAddress(), bidPrice);
      await orangeStandTicket.mint(addr2.address, bidPrice);
      await orangeStandTicket.connect(addr2).approve(await auction.getAddress(), bidPrice);
      await auctionCoordinator.makeBid(1, addr2.address);
      await mine(1000);
      await auctionCoordinator.connect(addr1).settleAuction(1);
      await expect(auctionCoordinator.makeBid(1, addr2.address))
        .to.emit(auction, "AuctionFinished")
        .withArgs(1);
    });

    it("should allow original owner or winning bidder to settle", async function () {
      const simToken = await SimulationToken.deploy();
      const erc20Address = await simToken.getAddress();
      await simToken.mint(addr1.address, tokenAmount * 2);
      await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount * 2);
      await auctionCoordinator.createErc20Auction(
        erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
        orangeStandTicket, bidPrice, orangeStandSettlementTicket
      );
      const auctionAddress = await auctionCoordinator.getAuction(1);
      const auction = await Auction.attach(auctionAddress);
      
      await userContract.mint(addr2.address, bidPrice * 2);
      await userContract.connect(addr2).approve(await orangeStandTicket.getAddress(), bidPrice * 2);
      await orangeStandTicket.mint(addr2.address, bidPrice * 2);
      await orangeStandTicket.connect(addr2).approve(await auction.getAddress(), bidPrice);

      await auctionCoordinator.makeBid(1, addr2.address);
      await mine(1000);
      await expect(auctionCoordinator.connect(addr1).settleAuction(1))
        .to.emit(auction, "AuctionSettled")
        .withArgs(1, addr2.address, biddingPrice);
      // Now try with winning bidder
      await auctionCoordinator.createErc20Auction(
        erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
        orangeStandTicket, bidPrice, orangeStandSettlementTicket
      );
      const auctionAddress2 = await auctionCoordinator.getAuction(2);
      const auction2 = await Auction.attach(auctionAddress2);
      await orangeStandTicket.connect(addr2).approve(auctionAddress2, bidPrice);
      await auctionCoordinator.makeBid(2, addr2.address);
      await mine(1000);
      await expect(auctionCoordinator.connect(addr2).settleAuction(2))
        .to.emit(auction2, "AuctionSettled")
        .withArgs(2, addr2.address, biddingPrice);
    });

    it("should settle auction and transfer ERC20 tokens to winner", async function () {
      const simToken = await SimulationToken.deploy();
      const erc20Address = await simToken.getAddress();
      await simToken.mint(addr1.address, tokenAmount);
      await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
      await auctionCoordinator.createErc20Auction(
        erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
        orangeStandTicket, bidPrice, orangeStandSettlementTicket
      );
      const auctionAddress = await auctionCoordinator.getAuction(1);
      const auction = await Auction.attach(auctionAddress);
      await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
      await userContract.mint(addr2.address, bidPrice);
      await userContract.connect(addr2).approve(await orangeStandTicket.getAddress(), bidPrice);
      await orangeStandTicket.mint(addr2.address, bidPrice);
      await orangeStandTicket.connect(addr2).approve(await auction.getAddress(), bidPrice);
      await auctionCoordinator.makeBid(1, addr2.address);
      await mine(1000);
      const balanceBefore = await simToken.balanceOf(addr2.address);
      await auctionCoordinator.connect(addr2).settleAuction(1);
      const balanceAfter = await simToken.balanceOf(addr2.address);
      expect(balanceAfter - balanceBefore).to.equal(tokenAmount);
    });

    it("should settle auction and transfer ERC721 token to winner", async function () {
      const auctionNft = await LocalCollectible.deploy();
      await auctionNft.mintItem(addr1.address, "Qm...");
      const erc721ItemAddress = await auctionNft.getAddress();
      const ownerBefore = await auctionNft.ownerOf(1);
      await auctionNft.connect(addr1).approve(await auctionCoordinator.getAddress(), 1);
      await auctionCoordinator.createErc721Auction(
        erc721ItemAddress, 1, addr1.address, bidTimeInMinutes, biddingPrice,
        orangeStandTicket, bidPrice, orangeStandSettlementTicket
      );
      const auctionAddress = await auctionCoordinator.getAuction(1);
      const auction = await Auction.attach(auctionAddress);
      await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
      await userContract.mint(addr2.address, bidPrice);
      await userContract.connect(addr2).approve(await orangeStandTicket.getAddress(), bidPrice);
      await orangeStandTicket.mint(addr2.address, bidPrice);
      await orangeStandTicket.connect(addr2).approve(await auction.getAddress(), bidPrice);
      await auctionCoordinator.makeBid(1, addr2.address);
      await mine(1000);
      await auctionCoordinator.connect(addr2).settleAuction(1);
      const ownerAfter = await auctionNft.ownerOf(1);
      expect(ownerBefore).to.equal(addr1.address);
      expect(ownerAfter).to.equal(addr2.address);
    });
  });

  describe("Token Occurrence", function () {
    it("should return token occurrence after auction creation", async function () {
      const simToken = await SimulationToken.deploy();
      const erc20Address = await simToken.getAddress();
      await simToken.mint(addr1.address, tokenAmount);
      await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
      await auctionCoordinator.createErc20Auction(
        erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
        orangeStandTicket, bidPrice, orangeStandSettlementTicket
      );
      const auctionAddress = await auctionCoordinator.getAuction(1);
      const auction = await Auction.attach(auctionAddress);
      await mine(1000);
      await auctionCoordinator.connect(addr1).settleAuction(await auction.getId());
      const occurrences = await auctionCoordinator.getTokenOccurrence();
      expect(occurrences.length).to.be.greaterThan(0);
      expect(occurrences[0].tokenSymbol).to.equal(await simToken.symbol());
    });
  });

  describe("Edge Cases", function () {
    it("should revert if trying to bid on non-existent auction", async function () {
      await expect(auctionCoordinator.makeBid(999, addr1.address)).to.be.reverted;
    });

    it("should revert if trying to settle non-existent auction", async function () {
      await expect(auctionCoordinator.settleAuction(999)).to.be.reverted;
    });

    it("should revert if not enough approval for ERC20 auction", async function () {
      const simToken = await SimulationToken.deploy();
      const erc20Address = await simToken.getAddress();
      await simToken.mint(addr1.address, tokenAmount);
      // No approval
      await expect(
        auctionCoordinator.createErc20Auction(
          erc20Address, tokenAmount, addr1.address, bidTimeInMinutes, biddingPrice,
          orangeStandTicket, bidPrice, orangeStandSettlementTicket
        )
      ).to.be.reverted;
    });

    it("should revert if not enough approval for ERC721 auction", async function () {
      const auctionNft = await LocalCollectible.deploy();
      await auctionNft.mintItem(addr1.address, "Qm...");
      const erc721ItemAddress = await auctionNft.getAddress();
      // No approval
      await expect(
        auctionCoordinator.createErc721Auction(
          erc721ItemAddress, 1, addr1.address, bidTimeInMinutes, biddingPrice,
          orangeStandTicket, bidPrice, orangeStandSettlementTicket
        )
      ).to.be.reverted;
    });
  });
});