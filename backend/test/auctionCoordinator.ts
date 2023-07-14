import { ethers, network } from 'hardhat';
import { use, expect } from 'chai';
import { Contract } from 'ethers';

describe('AuctionCoordinator tests', function () {
    this.timeout(180000);

    let auctionCoordinator: Contract;

    describe('AuctionCoordinator', function () {
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const itemAddress = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
        let orangeStandTicket: Contract;
        const biddingPrice = 2;
        if (contractAddress) {
            it('Should connect to external contract', async function () {
                auctionCoordinator = await ethers.getContractAt('AuctionCoordinator', contractAddress);
                console.log('Connected to external contract', auctionCoordinator.address);
            });
        } else {
            it('Should deploy AuctionCoordinator', async function () {
                const AuctionCoordinator = await ethers.getContractFactory('AuctionCoordinator');
                const OrangeStandTicket = await ethers.getContractFactory('OrangeStandTicket');
                orangeStandTicket = await OrangeStandTicket.deploy()
                auctionCoordinator = await AuctionCoordinator.deploy(await orangeStandTicket.getAddress())
            });
        }

        describe('getActiveBid()', function () {
            it('Get the correct active bid', async function () {
                const AuctionCoordinator = await ethers.getContractFactory('AuctionCoordinator');
                auctionCoordinator = await AuctionCoordinator.deploy(await orangeStandTicket.getAddress());

                const Bid = await ethers.getContractFactory('Bid');
                const [owner, addr1] = await ethers.getSigners();
                const firstBidder = owner.address;
                const secondBidder = addr1.address;
                const bidPrice = 5;
                const originalOwnerAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';

                const Auction = await ethers.getContractFactory('Auction');

                await auctionCoordinator.setUpAuction(itemAddress, originalOwnerAddress, 30, 
                    biddingPrice, orangeStandTicket, bidPrice);

                var auctionId = 1;

                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                await orangeStandTicket.connect(owner).approve(auctionAddress, bidPrice);
                await orangeStandTicket.connect(addr1).approve(auctionAddress, bidPrice);

                await orangeStandTicket.mint(firstBidder, bidPrice);
                await orangeStandTicket.mint(secondBidder, bidPrice);

                await auctionCoordinator.makeBid(auctionId, firstBidder);
                await auctionCoordinator.makeBid(auctionId, secondBidder);

                var retrievedBidAddress = await (await Auction.attach(auctionAddress)).getActiveBid();
                var activeBid = await Bid.attach(retrievedBidAddress);

                var activePrice = await (await Auction.attach(await auctionCoordinator.getAuction(auctionId))).getActivePrice();
                
                expect(await activePrice).to.equal(biddingPrice + bidPrice);
                expect(await activeBid.getBidderAddress()).to.equal(secondBidder);
            })
        });

        describe('getActiveAuction()', function () {
            it('Get the correct active item', async function () {
                const AuctionCoordinator = await ethers.getContractFactory('AuctionCoordinator');
                auctionCoordinator = await AuctionCoordinator.deploy(await orangeStandTicket.getAddress());

                const itemAddress = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
                const tokenId = 7;
                const bidPrice = 8;
                const originalOwnerAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';

                await auctionCoordinator.setUpAuction(itemAddress, originalOwnerAddress, 30, 
                    biddingPrice, orangeStandTicket, bidPrice);

                const Auction = await ethers.getContractFactory('Auction');
                var auctionId = 1;
                var retrievedAuction = await Auction.attach(await auctionCoordinator.getAuction(auctionId));

                expect(await retrievedAuction.getItem()).to.equal(itemAddress);
            })
        });

        describe('getOriginalOwner()', function () {
            it('Get the correct active item', async function () {
                const AuctionCoordinator = await ethers.getContractFactory('AuctionCoordinator');
                auctionCoordinator = await AuctionCoordinator.deploy(await orangeStandTicket.getAddress());

                const itemAddress = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
                const tokenId = 7;
                const bidPrice = 9;
                const originalOwnerAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';

                await auctionCoordinator.setUpAuction(itemAddress, originalOwnerAddress, 30, 
                    biddingPrice, orangeStandTicket, bidPrice);
                const Auction = await ethers.getContractFactory('Auction');

                var auctionId = 1;
                var retrievedAuction = await Auction.attach(await auctionCoordinator.getAuction(auctionId));

                expect(await retrievedAuction.getOriginalOwner()).to.equal(originalOwnerAddress);
            })
        });
    });
});
