import { ethers, network } from 'hardhat';
import { use, expect } from 'chai';
import { Contract } from 'ethers';
const { mine } = require("@nomicfoundation/hardhat-network-helpers");

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

        describe('settleAuction()', function () {
            it('Get the correct active item', async function () {
                const AuctionCoordinator = await ethers.getContractFactory('AuctionCoordinator');
                auctionCoordinator = await AuctionCoordinator.deploy(await orangeStandTicket.getAddress());

                const Item = await ethers.getContractFactory('Item');
                var item = await Item.deploy()
                const SingleErc721Item = await ethers.getContractFactory('SingleErc721Item');
                var tokenNum = 1;
                

                const LocalCollectible = await ethers.getContractFactory('LocalCollectible');
                var auctionNft = await LocalCollectible.deploy();
                const tokenId = 1;
                const originalOwnerAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';
                const bidPrice = 10;

                const itemAddress = await auctionNft.getAddress();
                const [owner] = await ethers.getSigners();
                await auctionNft.mintItem(await auctionCoordinator.getAddress(), 'QmfVMAmNM1kDEBYrC2TPzQDoCRFH6F5tE1e9Mr4FkkR5Xr');

                await item.addErc721(itemAddress, tokenNum);
                await auctionCoordinator.setUpAuction(await item.getAddress(), originalOwnerAddress, 30, 
                    biddingPrice, orangeStandTicket, bidPrice);
                const Auction = await ethers.getContractFactory('Auction');

                var auctionId = 1;

                var retrievedAuctionItem = await Auction.attach(await auctionCoordinator.getAuction(auctionId));
                var auctionStatusBeforeClosing = await retrievedAuctionItem.isFinished();

                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                await orangeStandTicket.connect(owner).approve(auctionAddress, bidPrice);
                await orangeStandTicket.mint(owner.address, bidPrice);

                await auctionCoordinator.makeBid(auctionId, owner.address);

                await mine(1000);
                await auctionCoordinator.settleAuction(auctionId);
                await mine(1000);

                var auctionStatusAfterClosing = await retrievedAuctionItem.isFinished();

                expect(auctionStatusBeforeClosing).to.equal(false);
                expect(auctionStatusAfterClosing).to.equal(true);
            })
        });
    });
});
