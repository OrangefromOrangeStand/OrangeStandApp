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
        const originalOwnerAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';
        const bidPrice = 8;
        const bidTimeInMinutes = 4;
        let orangeStandTicket: Contract;
        const biddingPrice = 2;

        async function setup(){
            if (contractAddress) {
                auctionCoordinator = await ethers.getContractAt('AuctionCoordinator', contractAddress);
            } else {
                const AuctionCoordinator = await ethers.getContractFactory('AuctionCoordinator');
                const OrangeStandTicket = await ethers.getContractFactory('OrangeStandTicket');
                orangeStandTicket = await OrangeStandTicket.deploy()
                auctionCoordinator = await AuctionCoordinator.deploy(await orangeStandTicket.getAddress())
            }
        }
        
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
            it('Get the correct active bid with multiple bids made', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1, addr2] = await ethers.getSigners();
                const Bid = await ethers.getContractFactory('Bid');
                const Auction = await ethers.getContractFactory('Auction');
                const firstBidder = addr1.address;
                const secondBidder = addr2.address;
                var auctionId = 1;
                await auctionCoordinator.setUpAuction(itemAddress, originalOwnerAddress, bidTimeInMinutes, 
                    biddingPrice, orangeStandTicket, bidPrice);
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                await orangeStandTicket.connect(addr1).approve(auctionAddress, bidPrice);
                await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
                await orangeStandTicket.mint(firstBidder, bidPrice);
                await orangeStandTicket.mint(secondBidder, bidPrice);

                // ACT
                await auctionCoordinator.makeBid(auctionId, firstBidder);
                await auctionCoordinator.makeBid(auctionId, secondBidder);
                // ASSERT
                var retrievedBidAddress = await (await Auction.attach(auctionAddress)).getActiveBid();
                var activeBid = await Bid.attach(retrievedBidAddress);
                expect(await activeBid.getBidderAddress()).to.equal(secondBidder);
            })

            it('Get the correct active bid with single bid made', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1] = await ethers.getSigners();
                const Bid = await ethers.getContractFactory('Bid');
                const Auction = await ethers.getContractFactory('Auction');
                const firstBidder = addr1.address;
                var auctionId = 1;
                await auctionCoordinator.setUpAuction(itemAddress, originalOwnerAddress, bidTimeInMinutes, 
                    biddingPrice, orangeStandTicket, bidPrice);
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                await orangeStandTicket.connect(addr1).approve(auctionAddress, bidPrice);
                await orangeStandTicket.mint(firstBidder, bidPrice);
                
                // ACT
                await auctionCoordinator.makeBid(auctionId, firstBidder);
                // ASSERT
                var retrievedBidAddress = await (await Auction.attach(auctionAddress)).getActiveBid();
                var activeBid = await Bid.attach(retrievedBidAddress);
                expect(await activeBid.getBidderAddress()).to.equal(firstBidder);
            })
        });

        describe('getActiveAuction()', function () {
            it('Get the correct active item when single auction exists', async function () {
                // ARRANGE
                await setup()
                await auctionCoordinator.setUpAuction(itemAddress, originalOwnerAddress, bidTimeInMinutes, 
                    biddingPrice, orangeStandTicket, bidPrice);
                const Auction = await ethers.getContractFactory('Auction');
                var auctionId = 1;
                // ACT
                var retrievedActiveAuction = await Auction.attach(await auctionCoordinator.getAuction(auctionId));
                // ASSERT
                expect(await retrievedActiveAuction.getItem()).to.equal(itemAddress);
            })

            it('Get the correct active item when multiple auctions exist', async function () {
                // ARRANGE
                await setup()
                const Auction = await ethers.getContractFactory('Auction');
                // Set up first auction
                await auctionCoordinator.setUpAuction(itemAddress, originalOwnerAddress, bidTimeInMinutes, 
                    biddingPrice, orangeStandTicket, bidPrice);
                // Set up second auction
                const secondItemAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';
                await auctionCoordinator.setUpAuction(secondItemAddress, originalOwnerAddress, bidTimeInMinutes, 
                    biddingPrice, orangeStandTicket, bidPrice);
                var firstAuctionId = 1;
                var secondAuctionId = 2;
                // ACT
                var retrievedFirstActiveAuction = await Auction.attach(await auctionCoordinator.getAuction(firstAuctionId));
                var retrievedSecondActiveAuction = await Auction.attach(await auctionCoordinator.getAuction(secondAuctionId));
                // ASSERT
                expect(await retrievedFirstActiveAuction.getItem()).to.equal(itemAddress);
                expect(await retrievedSecondActiveAuction.getItem()).to.equal(secondItemAddress);
            })
        });

        describe('getOriginalOwner()', function () {
            it('Get the correct active item', async function () {
                // ARRANGE
                await setup();
                const Auction = await ethers.getContractFactory('Auction');
                var auctionId = 1;
                // ACT
                await auctionCoordinator.setUpAuction(itemAddress, originalOwnerAddress, bidTimeInMinutes, 
                    biddingPrice, orangeStandTicket, bidPrice);
                // ASSERT
                var retrievedAuction = await Auction.attach(await auctionCoordinator.getAuction(auctionId));
                expect(await retrievedAuction.getOriginalOwner()).to.equal(originalOwnerAddress);
            })
        });

        describe('createAuction()', function () {
            it('Create a new single ERC721 auction', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                const Item = await ethers.getContractFactory('Item');
                const SingleErc721Item = await ethers.getContractFactory('SingleErc721Item');
                var auctionId = 1;
                var tokenId = 1;
                var expectedNumErc721Tokens = 1;
                const LocalCollectible = await ethers.getContractFactory('LocalCollectible');
                var auctionNft = await LocalCollectible.deploy();
                await auctionNft.mintItem(addr1.address, 'QmfVMAmNM1kDEBYrC2TPzQDoCRFH6F5tE1e9Mr4FkkR5Xr');
                var erc721ItemAddress = await auctionNft.getAddress();
                await auctionNft.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenId);
                // ACT
                await expect(auctionCoordinator.createAuction(erc721ItemAddress, tokenId, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice))
                    .to.emit(auctionCoordinator, "Erc721AuctionCreation")
                    .withArgs(auctionId, erc721ItemAddress, addr1.address, tokenId, Number);
                // ASSERT
                var retrievedActiveAuction = await Auction.attach(await auctionCoordinator.getAuction(auctionId));
                var retrievedItemAddress = await retrievedActiveAuction.getItem();
                var item = await Item.attach(retrievedItemAddress);
                var retrievedErc721Item = await SingleErc721Item.attach(await item.getItem(expectedNumErc721Tokens));
                expect(await retrievedErc721Item.getTokenAddress()).to.equal(erc721ItemAddress);
            })

            it('Create a new single ERC721 auction', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1, addr2] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                const Item = await ethers.getContractFactory('Item');
                const SingleErc721Item = await ethers.getContractFactory('SingleErc721Item');
                var firstAuctionId = 1;
                var secondAuctionId = 2;
                var firstAuctionTokenId = 1;
                var secondAuctionTokenId = 2;
                var firstAuctionExpectedNumErc721Tokens = 1;
                var secondAuctionExpectedNumErc721Tokens = 1;
                const LocalCollectible = await ethers.getContractFactory('LocalCollectible');
                var auctionNft = await LocalCollectible.deploy();
                var erc721ItemAddress = await auctionNft.getAddress();
                await auctionNft.mintItem(addr1.address, 'QmfVMAmNM1kDEBYrC2TPzQDoCRFH6F5tE1e9Mr4FkkR5Xr');
                await auctionNft.connect(addr1).approve(await auctionCoordinator.getAddress(), firstAuctionTokenId);
                await auctionNft.mintItem(addr2.address, 'QmfVMAmNM1kDEBYrC2TPzQDoCRFH6F5tE1e9Mr4FkkR5Xr');
                await auctionNft.connect(addr2).approve(await auctionCoordinator.getAddress(), secondAuctionTokenId);
                // ACT
                await expect(auctionCoordinator.createAuction(erc721ItemAddress, firstAuctionTokenId, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice))
                    .to.emit(auctionCoordinator, "Erc721AuctionCreation")
                    .withArgs(firstAuctionId, erc721ItemAddress, addr1.address, firstAuctionTokenId, Number);
                await expect(auctionCoordinator.createAuction(erc721ItemAddress, secondAuctionTokenId, addr2.address,
                        bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice))
                        .to.emit(auctionCoordinator, "Erc721AuctionCreation")
                        .withArgs(secondAuctionId, erc721ItemAddress, addr2.address, secondAuctionTokenId, Number);
                // ASSERT
                var retrievedFirstActiveAuction = await Auction.attach(await auctionCoordinator.getAuction(firstAuctionId));
                var retrievedSecondActiveAuction = await Auction.attach(await auctionCoordinator.getAuction(secondAuctionId));
                var retrievedFirstAuctionItemAddress = await retrievedFirstActiveAuction.getItem();
                var retrievedSecondAuctionItemAddress = await retrievedSecondActiveAuction.getItem();
                var firstAuctionItem = await Item.attach(retrievedFirstAuctionItemAddress);
                var secondAuctionItem = await Item.attach(retrievedSecondAuctionItemAddress);
                var retrievedFirstAuctionErc721Item = await SingleErc721Item.attach(await firstAuctionItem.getItem(firstAuctionExpectedNumErc721Tokens));
                var retrievedSecondAuctionErc721Item = await SingleErc721Item.attach(await secondAuctionItem.getItem(secondAuctionExpectedNumErc721Tokens));
                expect(await retrievedFirstAuctionErc721Item.getTokenAddress()).to.equal(erc721ItemAddress);
                expect(await retrievedFirstAuctionErc721Item.getTokenId()).to.equal(firstAuctionTokenId);
                expect(await retrievedSecondAuctionErc721Item.getTokenAddress()).to.equal(erc721ItemAddress);
                expect(await retrievedSecondAuctionErc721Item.getTokenId()).to.equal(secondAuctionTokenId);
            })
        });

        describe('createErc20Auction()', function () {
            it('Create a new single ERC20 auction', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                const Item = await ethers.getContractFactory('Item');
                const SingleErc20Item = await ethers.getContractFactory('SingleErc20Item');
                var auctionId = 1;
                var tokenAmount = 20;
                var expectedNumErc20Tokens = 1;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                // ACT
                await expect(auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice))
                    .to.emit(auctionCoordinator, "Erc20AuctionCreation")
                    .withArgs(auctionId, erc20Address, addr1.address, tokenAmount, Number);
                // ASSERT
                var retrievedActiveAuction = await Auction.attach(await auctionCoordinator.getAuction(auctionId));
                var retrievedItemAddress = await retrievedActiveAuction.getItem();
                var item = await Item.attach(retrievedItemAddress);
                var retrievedErc20Item = await SingleErc20Item.attach(await item.getItem(expectedNumErc20Tokens));
                expect(await retrievedErc20Item.getTokenAddress()).to.equal(erc20Address);
                expect(await retrievedErc20Item.getQuantity()).to.equal(tokenAmount);
            })

            it('Create a new single ERC20 auction', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1, addr2] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                const Item = await ethers.getContractFactory('Item');
                const SingleErc20Item = await ethers.getContractFactory('SingleErc20Item');
                var firstAuctionId = 1;
                var secondAuctionId = 2;
                var firstAuctionTokenAmount = 20;
                var secondAuctionTokenAmount = 37;
                var firstAuctionExpectedNumErc20Tokens = 1;
                var secondAuctionExpectedNumErc20Tokens = 1;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, firstAuctionTokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), firstAuctionTokenAmount);
                await simToken.mint(addr2.address, secondAuctionTokenAmount);
                await simToken.connect(addr2).approve(await auctionCoordinator.getAddress(), secondAuctionTokenAmount);
                // ACT
                await expect(auctionCoordinator.createErc20Auction(erc20Address, firstAuctionTokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice))
                    .to.emit(auctionCoordinator, "Erc20AuctionCreation")
                    .withArgs(firstAuctionId, erc20Address, addr1.address, firstAuctionTokenAmount, Number);
                await expect(auctionCoordinator.createErc20Auction(erc20Address, secondAuctionTokenAmount, addr2.address,
                        bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice))
                        .to.emit(auctionCoordinator, "Erc20AuctionCreation")
                        .withArgs(secondAuctionId, erc20Address, addr2.address, secondAuctionTokenAmount, Number);
                // ASSERT
                var retrievedFirstActiveAuction = await Auction.attach(await auctionCoordinator.getAuction(firstAuctionId));
                var retrievedSecondActiveAuction = await Auction.attach(await auctionCoordinator.getAuction(secondAuctionId));
                var retrievedFirstAuctionItemAddress = await retrievedFirstActiveAuction.getItem();
                var retrievedSecondAuctionItemAddress = await retrievedSecondActiveAuction.getItem();
                var firstAuctionItem = await Item.attach(retrievedFirstAuctionItemAddress);
                var secondAuctionItem = await Item.attach(retrievedSecondAuctionItemAddress);
                var retrievedFirstAuctionErc20Item = await SingleErc20Item.attach(await firstAuctionItem.getItem(firstAuctionExpectedNumErc20Tokens));
                var retrievedSecondAuctionErc20Item = await SingleErc20Item.attach(await secondAuctionItem.getItem(secondAuctionExpectedNumErc20Tokens));
                expect(await retrievedFirstAuctionErc20Item.getTokenAddress()).to.equal(erc20Address);
                expect(await retrievedFirstAuctionErc20Item.getQuantity()).to.equal(firstAuctionTokenAmount);
                expect(await retrievedSecondAuctionErc20Item.getTokenAddress()).to.equal(erc20Address);
                expect(await retrievedSecondAuctionErc20Item.getQuantity()).to.equal(secondAuctionTokenAmount);
            })
        });

        describe('settleAuction()', function () {
            it('Get the correct active item', async function () {
                await setup()
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
                await auctionCoordinator.setUpAuction(await item.getAddress(), originalOwnerAddress, bidTimeInMinutes, 
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
