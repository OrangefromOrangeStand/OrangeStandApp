import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';
const { mine } = require("@nomicfoundation/hardhat-network-helpers");

describe('Auction tests', function () {
    
    let auction: Contract;
    const truffleAssert = require('truffle-assertions');

    describe('Auction', function () {
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const auctionId = 3;
        const itemAddress = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
        const auctionStartTime = 29014;
        const auctionLengthInMinutes = 10;
        const initialPrice = 16;
        const originalOwnerAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';
        const priceIncrease = 5;
        const paymentToken = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';

        const bidderAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
        let bidder2Address = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';
        let address2;

        if (contractAddress) {
            it('Should connect to external contract', async function () {
                auction = await ethers.getContractAt('Auction', contractAddress);
                console.log('Connected to external contract', auction.address);
            });
        } else {
            it('Should deploy Auction', async function () {
                const Auction = await ethers.getContractFactory('Auction');

                const [owner, addr1, addr2] = await ethers.getSigners();
                bidder2Address = addr1.address;
                address2 = addr1;

                auction = await Auction.deploy(
                    auctionId, itemAddress, auctionStartTime, auctionLengthInMinutes, 
                    initialPrice, originalOwnerAddress, priceIncrease, paymentToken)
            });
        }

        describe('getId()', function () {
            it('Get the correct auction id', async function () {
                var result = await auction.getId();
                expect(result).to.equal(auctionId);
            })
        });

        describe('getItem()', function () {
            it('Get the correct item address', async function () {
                var result = await auction.getItem();
                expect(result).to.equal(itemAddress);
            })
        });

        describe('getActiveBid()', function () {
            it('Get the empty bid - before any bids have been made', async function () {
                var result = await auction.getActiveBid();
                expect(result).to.equal('0x0000000000000000000000000000000000000000');
            })
        });

        describe('getCurrentCycleStartTime()', function () {
            it('Get the current cycle start time', async function () {
                var result = await auction.getCurrentCycleStartTime();
                expect(result).to.equal(auctionStartTime);
            })
        });

        describe('getCycleDuration()', function () {
            it('Get the current cycle duration', async function () {
                var result = await auction.getCycleDuration();
                expect(result).to.equal(auctionLengthInMinutes);
            })
        });

        describe('getCurrentCycleEndTime()', function () {
            it('Get the current cycle end time', async function () {
                var endTime = auctionStartTime + auctionLengthInMinutes * 60;
                var result = await auction.getCurrentCycleEndTime();
                expect(result).to.equal(endTime);
            })
        });

        describe('getInitialPrice()', function () {
            it('Get the initial price', async function () {
                var result = await auction.getInitialPrice();
                expect(result).to.equal(initialPrice);
            })
        });

        describe('getPriceIncrease()', function () {
            it('Get the price increase', async function () {
                var result = await auction.getPriceIncrease();
                expect(result).to.equal(priceIncrease);
            })
        });

        describe('getOriginalOwner()', function () {
            it('Get the original owner', async function () {
                var result = await auction.getOriginalOwner();
                expect(result).to.equal(originalOwnerAddress);
            })
        });

        describe('makeNewBid()', function () {
            it('Make a successful bid', async function () {
                // ARRANGE
                // Set up the payment token
                const OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
                const paymentToken = await OrangeStandTicket.deploy();
                paymentToken.mint(bidderAddress, "15000000000000000000");
                const paymentTokenAddress = await paymentToken.getAddress();
                // Get the previous block's timestamp
                const blockNumBefore = await ethers.provider.getBlockNumber();
                const blockBefore = await ethers.provider.getBlock(blockNumBefore);
                const timestampForBlockBefore = blockBefore.timestamp;
                // Get the transaction's block timestamp
                const timestampForExecutingBlock = timestampForBlockBefore + 1;
                // Set up the bid
                const Bid = await ethers.getContractFactory('Bid');
                const bidPrice = 16;
                const cycleDurationInMinutes = 1;
                var bid = await Bid.deploy(bidderAddress, timestampForExecutingBlock, itemAddress, bidPrice);
                const uninitialiseBidAddress = "0x0000000000000000000000000000000000000000";
                // SUT
                const Auction = await ethers.getContractFactory('Auction');
                auction = await Auction.deploy(
                    auctionId, itemAddress, timestampForBlockBefore, 
                    cycleDurationInMinutes, initialPrice, 
                    originalOwnerAddress, bidPrice, paymentTokenAddress);
                const auctionAddress = await auction.getAddress();
                await paymentToken.approve(auctionAddress, bidPrice);

                // ACT
                // ASSERT
                await expect(auction.makeNewBid(bid)).to.emit(auction, "BidUpdate")
                    .withArgs(auctionId, await bid.getAddress(), uninitialiseBidAddress, 
                    bidderAddress, uninitialiseBidAddress);
                var currentlyActiveBid = await auction.getActiveBid();
                expect(currentlyActiveBid).to.equal(await bid.getAddress());
                expect(await auction.getActivePrice()).to.equal(initialPrice);
            })

            it('Make consecutive successful bids', async function () {
                // ARRANGE
                // Set up the payment token
                const OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
                const paymentToken = await OrangeStandTicket.deploy();
                paymentToken.mint(bidderAddress, "15000000000000000000");
                paymentToken.mint(bidder2Address, "15000000000000000000");
                const paymentTokenAddress = await paymentToken.getAddress();
                // Get the previous block's timestamp
                const blockNumBefore = await ethers.provider.getBlockNumber();
                const blockBefore = await ethers.provider.getBlock(blockNumBefore);
                const timestampForBlockBefore = blockBefore.timestamp;
                // Get the transaction's block timestamp
                const timestampForExecutingBlock = timestampForBlockBefore + 1;
                // Set up the bid
                const Bid = await ethers.getContractFactory('Bid');
                const bidPrice = 16;
                const cycleDurationInMinutes = 1;
                var bid1 = await Bid.deploy(bidderAddress, timestampForExecutingBlock, itemAddress, bidPrice);
                const bid1Address = await bid1.getAddress();
                var bid2 = await Bid.deploy(bidder2Address, timestampForExecutingBlock, itemAddress, bidPrice);
                const uninitialiseBidAddress = "0x0000000000000000000000000000000000000000";
                // SUT
                const Auction = await ethers.getContractFactory('Auction');
                auction = await Auction.deploy(
                    auctionId, itemAddress, timestampForBlockBefore, 
                    cycleDurationInMinutes, initialPrice, 
                    originalOwnerAddress, bidPrice, paymentTokenAddress);
                const auctionAddress = await auction.getAddress();
                await paymentToken.approve(auctionAddress, bidPrice, {'from': bidderAddress});
                await paymentToken.connect(address2).approve(auctionAddress, bidPrice);                
                // ACT
                // ASSERT
                await expect(auction.makeNewBid(bid1)).to.emit(auction, "BidUpdate")
                    .withArgs(auctionId, await bid1.getAddress(), uninitialiseBidAddress, 
                    bidderAddress, uninitialiseBidAddress);
                await expect(auction.makeNewBid(bid2)).to.emit(auction, "BidUpdate")
                    .withArgs(auctionId, await bid2.getAddress(), bid1Address, 
                    bidder2Address, bidderAddress);
                var currentlyActiveBid = await auction.getActiveBid();
                expect(currentlyActiveBid).to.equal(await bid2.getAddress());
                expect(await auction.getActivePrice()).to.equal(initialPrice+bidPrice);
            })

            it('Make a bid when auction finished', async function () {
                // ARRANGE
                // Set up the payment token
                const OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
                const paymentToken = await OrangeStandTicket.deploy();
                paymentToken.mint(bidderAddress, "15000000000000000000");
                const paymentTokenAddress = await paymentToken.getAddress();
                // Get the previous block's timestamp
                const blockNumBefore = await ethers.provider.getBlockNumber();
                const blockBefore = await ethers.provider.getBlock(blockNumBefore);
                const timestampForBlockBefore = blockBefore.timestamp;
                // Get the transaction's block timestamp
                const timestampForExecutingBlock = timestampForBlockBefore + 1;
                // Set up the bid
                const Bid = await ethers.getContractFactory('Bid');
                const bidPrice = 16;
                const cycleDurationInMinutes = 1;
                var bid = await Bid.deploy(bidderAddress, timestampForExecutingBlock, itemAddress, bidPrice);
                const uninitialiseBidAddress = "0x0000000000000000000000000000000000000000";
                // SUT
                const Auction = await ethers.getContractFactory('Auction');
                auction = await Auction.deploy(
                    auctionId, itemAddress, timestampForBlockBefore, 
                    cycleDurationInMinutes, initialPrice, 
                    originalOwnerAddress, bidPrice, paymentTokenAddress);
                const auctionAddress = await auction.getAddress();
                await paymentToken.approve(auctionAddress, bidPrice);

                // ACT
                await mine(1000);
                // ASSERT
                await expect(auction.makeNewBid(bid)).to.emit(auction, "AuctionFinished")
                    .withArgs(auctionId);
            })
        });

        describe('settle()', function () {
            it('Try to settle an open auction', async function () {
                // ARRANGE
                // Set up the payment token
                const OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
                const paymentToken = await OrangeStandTicket.deploy();
                paymentToken.mint(bidderAddress, "15000000000000000000");
                const paymentTokenAddress = await paymentToken.getAddress();
                // Get the previous block's timestamp
                const blockNumBefore = await ethers.provider.getBlockNumber();
                const blockBefore = await ethers.provider.getBlock(blockNumBefore);
                const timestampForBlockBefore = blockBefore.timestamp;
                // Get the transaction's block timestamp
                const timestampForExecutingBlock = timestampForBlockBefore + 1;
                // Set up the bid
                const Bid = await ethers.getContractFactory('Bid');
                const bidPrice = 16;
                const cycleDurationInMinutes = 1;
                var bid = await Bid.deploy(bidderAddress, timestampForExecutingBlock, itemAddress, bidPrice);
                const uninitialiseBidAddress = "0x0000000000000000000000000000000000000000";
                // SUT
                const Auction = await ethers.getContractFactory('Auction');
                auction = await Auction.deploy(
                    auctionId, itemAddress, timestampForBlockBefore, 
                    cycleDurationInMinutes, initialPrice, 
                    originalOwnerAddress, bidPrice, paymentTokenAddress);
                const auctionAddress = await auction.getAddress();
                await paymentToken.approve(auctionAddress, bidPrice);

                // ACT
                auction.settle()
                // ASSERT
                await expect(auction.settle()).to.emit(auction, "AuctionOnGoing")
                    .withArgs(auctionId);
            })

            it('Try to settle a closed auction', async function () {
                // ARRANGE
                // Set up the payment token
                const OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
                const paymentToken = await OrangeStandTicket.deploy();
                paymentToken.mint(bidderAddress, "15000000000000000000");
                const paymentTokenAddress = await paymentToken.getAddress();
                // Get the previous block's timestamp
                const blockNumBefore = await ethers.provider.getBlockNumber();
                const blockBefore = await ethers.provider.getBlock(blockNumBefore);
                const timestampForBlockBefore = blockBefore.timestamp;
                // Get the transaction's block timestamp
                const timestampForExecutingBlock = timestampForBlockBefore + 1;
                // Set up the bid
                const Bid = await ethers.getContractFactory('Bid');
                const bidPrice = 16;
                const cycleDurationInMinutes = 1;
                var bid = await Bid.deploy(bidderAddress, timestampForExecutingBlock, itemAddress, bidPrice);
                // SUT
                const Auction = await ethers.getContractFactory('Auction');
                auction = await Auction.deploy(
                    auctionId, itemAddress, timestampForBlockBefore, 
                    cycleDurationInMinutes, initialPrice, 
                    originalOwnerAddress, bidPrice, paymentTokenAddress);
                const auctionAddress = await auction.getAddress();
                await paymentToken.approve(auctionAddress, bidPrice);

                // ACT
                await auction.makeNewBid(bid);
                await mine(1000);
                // ASSERT
                await expect(auction.settle()).to.emit(auction, "AuctionSettled")
                    .withArgs(auctionId, bidderAddress, initialPrice);
            })

            it('Try to settle a closed auction twice', async function () {
                // ARRANGE
                // Set up the payment token
                const OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
                const paymentToken = await OrangeStandTicket.deploy();
                paymentToken.mint(bidderAddress, "15000000000000000000");
                const paymentTokenAddress = await paymentToken.getAddress();
                // Get the previous block's timestamp
                const blockNumBefore = await ethers.provider.getBlockNumber();
                const blockBefore = await ethers.provider.getBlock(blockNumBefore);
                const timestampForBlockBefore = blockBefore.timestamp;
                // Get the transaction's block timestamp
                const timestampForExecutingBlock = timestampForBlockBefore + 1;
                // Set up the bid
                const Bid = await ethers.getContractFactory('Bid');
                const bidPrice = 16;
                const cycleDurationInMinutes = 1;
                var bid = await Bid.deploy(bidderAddress, timestampForExecutingBlock, itemAddress, bidPrice);
                // SUT
                const Auction = await ethers.getContractFactory('Auction');
                auction = await Auction.deploy(
                    auctionId, itemAddress, timestampForBlockBefore, 
                    cycleDurationInMinutes, initialPrice, 
                    originalOwnerAddress, bidPrice, paymentTokenAddress);
                const auctionAddress = await auction.getAddress();
                await paymentToken.approve(auctionAddress, bidPrice);

                // ACT
                await auction.makeNewBid(bid);
                await mine(1000);
                // Call it first time
                await auction.settle();
                // ASSERT
                await expect(auction.settle()).to.emit(auction, "AuctionSettled")
                    .withArgs(auctionId, bidderAddress, initialPrice);
            })
        });
    });
});
