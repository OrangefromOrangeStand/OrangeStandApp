import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("Bid", function () {
  let Bid: any;
  let bid: Contract;
  let bidder: Signer;
  let item: Signer;
  let bidderAddress: string;
  let itemAddress: string;
  let bidTime: number;
  let bidPrice: bigint;

  beforeEach(async function () {
    [bidder, item] = await ethers.getSigners();
    bidderAddress = await bidder.getAddress();
    itemAddress = await item.getAddress();
    bidTime = Math.floor(Date.now() / 1000);
    bidPrice = ethers.parseEther("1.5");

    Bid = await ethers.getContractFactory("Bid");
    bid = await Bid.deploy(bidderAddress, bidTime, itemAddress, bidPrice);
    await bid.waitForDeployment();
  });

  it("should store and return the correct bidder address", async function () {
    expect(await bid.getBidderAddress()).to.equal(bidderAddress);
  });

  it("should store and return the correct bid time", async function () {
    expect(await bid.getStartTime()).to.equal(bidTime);
  });

  it("should store and return the correct item address", async function () {
    expect(await bid.getItemAddress()).to.equal(itemAddress);
  });

  it("should store and return the correct bid price", async function () {
    expect(await bid.getBidPrice()).to.equal(bidPrice);
  });

  it("should handle zero address for bidder", async function () {
    const zeroAddress = ethers.ZeroAddress;
    const bidZeroBidder = await Bid.deploy(zeroAddress, bidTime, itemAddress, bidPrice);
    await bidZeroBidder.waitForDeployment();
    expect(await bidZeroBidder.getBidderAddress()).to.equal(zeroAddress);
  });

  it("should handle zero address for item", async function () {
    const zeroAddress = ethers.ZeroAddress;
    const bidZeroItem = await Bid.deploy(bidderAddress, bidTime, zeroAddress, bidPrice);
    await bidZeroItem.waitForDeployment();
    expect(await bidZeroItem.getItemAddress()).to.equal(zeroAddress);
  });

  it("should handle zero bid price", async function () {
    const zeroPrice = 0n;
    const bidZeroPrice = await Bid.deploy(bidderAddress, bidTime, itemAddress, zeroPrice);
    await bidZeroPrice.waitForDeployment();
    expect(await bidZeroPrice.getBidPrice()).to.equal(zeroPrice);
  });

  it("should handle zero bid time", async function () {
    const zeroTime = 0;
    const bidZeroTime = await Bid.deploy(bidderAddress, zeroTime, itemAddress, bidPrice);
    await bidZeroTime.waitForDeployment();
    expect(await bidZeroTime.getStartTime()).to.equal(zeroTime);
  });
});