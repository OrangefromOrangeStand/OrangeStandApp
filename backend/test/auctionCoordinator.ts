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
        const treasuryAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
        const settlementToken = '0x198eebe8da4db8a475f9b31c864bf089e550719c';
        const simTokenName = "SIM";
        const bidPrice = 800;
        const bidTimeInMinutes = 4;
        let orangeStandTicket: Contract;
        let orangeStandSettlementTicket: Contract;
        const biddingPrice = 2;
        var firstBidder;
        var secondBidder;

        async function setup(){
            if (contractAddress) {
                auctionCoordinator = await ethers.getContractAt('AuctionCoordinator', contractAddress, 
                    treasuryAddress, settlementToken);
            } else {
                const [owner, addr1, addr2] = await ethers.getSigners();
                const AuctionCoordinator = await ethers.getContractFactory('AuctionCoordinator');
                const OrangeStandTicket = await ethers.getContractFactory('OrangeStandTicket');
                const OrangeStandSpentTicket = await ethers.getContractFactory('OrangeStandSpentTicket');
                orangeStandTicket = await OrangeStandTicket.deploy()
                orangeStandSettlementTicket = await OrangeStandSpentTicket.deploy()
                auctionCoordinator = await AuctionCoordinator.deploy(await orangeStandTicket.getAddress(), 
                    treasuryAddress, await orangeStandSettlementTicket.getAddress())
                firstBidder = addr1.address;
                secondBidder = addr2.address;
                await orangeStandTicket.mint(firstBidder, bidPrice);
                await orangeStandTicket.mint(secondBidder, bidPrice);
                await orangeStandTicket.addBurner(await auctionCoordinator.getAddress());
                await orangeStandTicket.transferOwnership(await auctionCoordinator.getAddress());
                await orangeStandSettlementTicket.transferOwnership(await auctionCoordinator.getAddress());
            }
        }
        
        if (contractAddress) {
            it('Should connect to external contract', async function () {
                auctionCoordinator = await ethers.getContractAt('AuctionCoordinator', contractAddress, 
                    treasuryAddress, settlementToken);
                console.log('Connected to external contract', auctionCoordinator.address);
            });
        } else {
            it('Should deploy AuctionCoordinator', async function () {
                const AuctionCoordinator = await ethers.getContractFactory('AuctionCoordinator');
                const OrangeStandTicket = await ethers.getContractFactory('OrangeStandTicket');
                const OrangeStandSpentTicket = await ethers.getContractFactory('OrangeStandSpentTicket');
                orangeStandSettlementTicket = await OrangeStandSpentTicket.deploy()
                orangeStandTicket = await OrangeStandTicket.deploy()
                auctionCoordinator = await AuctionCoordinator.deploy(await orangeStandTicket.getAddress(), 
                    treasuryAddress, await orangeStandSettlementTicket.getAddress())
            });
        }

        describe('getAllCategories()', function () {
            it('No category has been set up', async function () {
                await setup();
                var categories = await auctionCoordinator.getAllCategories();
                expect(categories.length).to.equal(0);
            })

            it('One category has been set up', async function () {
                // ARRANGE
                await setup()
                const [_, addr1] = await ethers.getSigners();
                var tokenAmount = 20;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                // ACT
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var categories = await auctionCoordinator.getAllCategories();
                // ASSERT
                expect(categories.length).to.equal(1);
            })

            it('Multiple categories have been set up', async function () {
                // ARRANGE
                await setup()
                const [_, addr1] = await ethers.getSigners();
                var tokenAmount = 20;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                var tokenId = 1;
                const LocalCollectible = await ethers.getContractFactory('LocalCollectible');
                var auctionNft = await LocalCollectible.deploy();
                await auctionNft.mintItem(addr1.address, 'QmfVMAmNM1kDEBYrC2TPzQDoCRFH6F5tE1e9Mr4FkkR5Xr');
                var erc721ItemAddress = await auctionNft.getAddress();
                await auctionNft.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenId);
                // ACT
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                await auctionCoordinator.createErc721Auction(erc721ItemAddress, tokenId, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var categories = await auctionCoordinator.getAllCategories();
                // ASSERT
                expect(categories.length).to.equal(2);
            })
        })

        describe('getAllActiveAuctions()', function () {
            it('No active category has been set up', async function () {
                await setup();
                var activeAuctions = await auctionCoordinator.getAllActiveAuctions(simTokenName);
                expect(activeAuctions.length).to.equal(0);
            })

            it('One active category has been set up', async function () {
                // ARRANGE
                await setup()
                const [_, addr1] = await ethers.getSigners();
                var tokenAmount = 20;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                // ACT
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var activeAuctions = await auctionCoordinator.getAllActiveAuctions(simTokenName);
                // ASSERT
                expect(activeAuctions.length).to.equal(1);
            })

            it('One active category has been set up and settled', async function () {
                // ARRANGE
                await setup()
                const [_, addr1] = await ethers.getSigners();
                var tokenAmount = 20;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                var auctionId = 1;
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                // ACT
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                await auctionCoordinator.connect(addr1).settleAuction(auctionId);
                var activeAuctions = await auctionCoordinator.getAllActiveAuctions(simTokenName);
                // ASSERT
                expect(activeAuctions.length).to.equal(0);
            })

            it('Multiple active categories have been set up', async function () {
                // ARRANGE
                await setup()
                const [_, addr1] = await ethers.getSigners();
                var tokenAmount = 20;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount * 2);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount * 2);
                // ACT
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var activeAuctions = await auctionCoordinator.getAllActiveAuctions(simTokenName);
                // ASSERT
                expect(activeAuctions.length).to.equal(2);
            })

            it('Multiple active categories have been set up and one settled', async function () {
                // ARRANGE
                await setup()
                const [_, addr1] = await ethers.getSigners();
                var tokenAmount = 20;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                var auctionId = 2;
                await simToken.mint(addr1.address, tokenAmount * 2);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount * 2);
                // ACT
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                await auctionCoordinator.connect(addr1).settleAuction(auctionId);
                var activeAuctions = await auctionCoordinator.getAllActiveAuctions(simTokenName);
                // ASSERT
                expect(activeAuctions.length).to.equal(1);
            })
        })

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
                var tokenAmount = 20;

                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);

                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket)
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                await orangeStandTicket.connect(addr1).approve(auctionAddress, bidPrice);
                await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);

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
                var tokenAmount = 20;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket)
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                await orangeStandTicket.connect(addr1).approve(auctionAddress, bidPrice);
                
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
                const [owner, addr1] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                var auctionId = 1;
                var tokenAmount = 20;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                const SingleErc20Item = await ethers.getContractFactory('SingleErc20Item');
                const Item = await ethers.getContractFactory('Item');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                // ACT
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket)
                // ACT
                var retrievedActiveAuction = await Auction.attach(await auctionCoordinator.getAuction(auctionId));
                // ASSERT
                var retrievedErc20Item = await SingleErc20Item.attach(
                    await(await Item.attach(await retrievedActiveAuction.getItem())).getItem(1)
                );
                expect(await retrievedErc20Item.getTokenAddress()).to.equal(erc20Address);
            })

            it('Get the correct active item when multiple auctions exist', async function () {
                // ARRANGE
                await setup()
                const [owner, addr1, addr2] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');

                var firstTokenAmount = 20;
                var secondTokenAmount = 18;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                const SingleErc20Item = await ethers.getContractFactory('SingleErc20Item');
                const Item = await ethers.getContractFactory('Item');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, firstTokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), firstTokenAmount);
                await simToken.mint(addr2.address, secondTokenAmount);
                await simToken.connect(addr2).approve(await auctionCoordinator.getAddress(), secondTokenAmount);
                
                // Set up first auction
                await auctionCoordinator.createErc20Auction(erc20Address, firstTokenAmount, addr1.address,
                        bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket)
                // Set up second auction
                await auctionCoordinator.createErc20Auction(erc20Address, secondTokenAmount, addr2.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket)
                var firstAuctionId = 1;
                var secondAuctionId = 2;
                // ACT
                var retrievedFirstActiveAuction = await Auction.attach(await auctionCoordinator.getAuction(firstAuctionId));
                var retrievedSecondActiveAuction = await Auction.attach(await auctionCoordinator.getAuction(secondAuctionId));
                // ASSERT
                var firstRetrievedErc20Item = await SingleErc20Item.attach(
                    await(await Item.attach(await retrievedFirstActiveAuction.getItem())).getItem(1)
                );
                var secondRetrievedErc20Item = await SingleErc20Item.attach(
                    await(await Item.attach(await retrievedSecondActiveAuction.getItem())).getItem(1)
                );
                expect(await firstRetrievedErc20Item.getTokenAddress()).to.equal(erc20Address);
                expect(await firstRetrievedErc20Item.getQuantity()).to.equal(firstTokenAmount);
                expect(await secondRetrievedErc20Item.getTokenAddress()).to.equal(erc20Address);
                expect(await secondRetrievedErc20Item.getQuantity()).to.equal(secondTokenAmount);
            })
        });

        describe('getOriginalOwner()', function () {
            it('Get the correct active item', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                var auctionId = 1;
                var tokenAmount = 20;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                // ACT
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket)
                // ASSERT
                var retrievedAuction = await Auction.attach(await auctionCoordinator.getAuction(auctionId));
                expect(await retrievedAuction.getOriginalOwner()).to.equal(addr1.address);
            })
        });

        describe('createErc721Auction()', function () {
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
                await expect(auctionCoordinator.createErc721Auction(erc721ItemAddress, tokenId, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket))
                    .to.emit(auctionCoordinator, "Erc721AuctionCreation")
                    .withArgs(auctionId, erc721ItemAddress, addr1.address, tokenId, Number);
                // ASSERT
                var retrievedActiveAuction = await Auction.attach(await auctionCoordinator.getAuction(auctionId));
                var retrievedItemAddress = await retrievedActiveAuction.getItem();
                var item = await Item.attach(retrievedItemAddress);
                var retrievedErc721Item = await SingleErc721Item.attach(await item.getItem(expectedNumErc721Tokens));
                expect(await retrievedErc721Item.getTokenAddress()).to.equal(erc721ItemAddress);
            })

            it('Create multiple ERC721 auctions', async function () {
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
                await expect(auctionCoordinator.createErc721Auction(erc721ItemAddress, firstAuctionTokenId, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket))
                    .to.emit(auctionCoordinator, "Erc721AuctionCreation")
                    .withArgs(firstAuctionId, erc721ItemAddress, addr1.address, firstAuctionTokenId, Number);
                await expect(auctionCoordinator.createErc721Auction(erc721ItemAddress, secondAuctionTokenId, addr2.address,
                        bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket))
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
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket))
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

            it('Create multiple new ERC20 auctions', async function () {
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
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket))
                    .to.emit(auctionCoordinator, "Erc20AuctionCreation")
                    .withArgs(firstAuctionId, erc20Address, addr1.address, firstAuctionTokenAmount, Number);
                await expect(auctionCoordinator.createErc20Auction(erc20Address, secondAuctionTokenAmount, addr2.address,
                        bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket))
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

        describe('getAllActiveAuctions()', function () {
            it('Get single active auction', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                var tokenAmount = 20;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                // ACT
                var allActiveAuctionsCount = await auctionCoordinator.getAllActiveAuctions(simTokenName);
                // ASSERT
                expect(allActiveAuctionsCount.length).to.equal(1);
            })
            it('Get multiple active auctions', async function () {
                // ARRANGE
                await setup();
                const [, addr1, addr2] = await ethers.getSigners();
                var firstAuctionTokenAmount = 20;
                var secondAuctionTokenAmount = 37;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, firstAuctionTokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), firstAuctionTokenAmount);
                await simToken.mint(addr2.address, secondAuctionTokenAmount);
                await simToken.connect(addr2).approve(await auctionCoordinator.getAddress(), secondAuctionTokenAmount);
                // ACT
                await auctionCoordinator.createErc20Auction(erc20Address, firstAuctionTokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                await auctionCoordinator.createErc20Auction(erc20Address, secondAuctionTokenAmount, addr2.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                // ACT
                var allActiveAuctionsCount = await auctionCoordinator.getAllActiveAuctions(simTokenName);
                // ASSERT
                expect(allActiveAuctionsCount.length).to.equal(2);
            })
            it('Get multiple active auctions where one has been settled', async function () {
                // ARRANGE
                await setup();
                const [, addr1, addr2, addr3] = await ethers.getSigners();
                var firstAuctionTokenAmount = 20;
                var secondAuctionTokenAmount = 37;
                var thirdAuctionTokenAmount = 14;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, firstAuctionTokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), firstAuctionTokenAmount);
                await simToken.mint(addr2.address, secondAuctionTokenAmount);
                await simToken.connect(addr2).approve(await auctionCoordinator.getAddress(), secondAuctionTokenAmount);
                await simToken.mint(addr3.address, thirdAuctionTokenAmount);
                await simToken.connect(addr3).approve(await auctionCoordinator.getAddress(), thirdAuctionTokenAmount);
                // ACT
                await auctionCoordinator.createErc20Auction(erc20Address, firstAuctionTokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                await auctionCoordinator.createErc20Auction(erc20Address, secondAuctionTokenAmount, addr2.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                await auctionCoordinator.createErc20Auction(erc20Address, thirdAuctionTokenAmount, addr3.address,
                        bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                // ACT
                var allActiveAuctionsCountBeforeSettlement = await auctionCoordinator.getAllActiveAuctions(simTokenName);
                await auctionCoordinator.connect(addr1).settleAuction(1);
                var allActiveAuctionsCountAfterSettlement = await auctionCoordinator.getAllActiveAuctions(simTokenName);
                // ASSERT
                expect(allActiveAuctionsCountBeforeSettlement.length).to.equal(3);
                expect(allActiveAuctionsCountAfterSettlement.length).to.equal(2);
            })
        });

        describe('makeBid()', function () {
            it('Finished auction shouldnt be biddable', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1, addr2, addr3] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                var auctionId = 1;
                var tokenAmount = 20;
                const firstBidder = addr2.address;
                const secondBidder = addr3.address;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                var auction = await Auction.attach(auctionAddress);
                await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
                await orangeStandTicket.connect(addr3).approve(auctionAddress, bidPrice);
                // ACT
                await auctionCoordinator.makeBid(auctionId, firstBidder);
                await mine(1000);
                // ASSERT
                await expect(auctionCoordinator.makeBid(auctionId, secondBidder))
                    .to.emit(auction, "AuctionFinished")
                    .withArgs(auctionId);
            })
            it('Settled auction shouldnt be biddable', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1, addr2, addr3] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                var auctionId = 1;
                var tokenAmount = 20;
                const firstBidder = addr2.address;
                const secondBidder = addr3.address;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                var auction = await Auction.attach(auctionAddress);
                await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
                await orangeStandTicket.connect(addr3).approve(auctionAddress, bidPrice);
                // ACT
                await auctionCoordinator.makeBid(auctionId, firstBidder);
                await mine(1000);
                await auctionCoordinator.connect(addr2).settleAuction(auctionId)
                // ASSERT
                await expect(auctionCoordinator.makeBid(auctionId, secondBidder))
                    .to.emit(auction, "AuctionFinished")
                    .withArgs(auctionId);
            })
            it('Running auction should be biddable', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1, addr2, addr3] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                var auctionId = 1;
                var tokenAmount = 20;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                const Bid = await ethers.getContractFactory('Bid');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr3.address, tokenAmount);
                await simToken.connect(addr3).approve(await auctionCoordinator.getAddress(), tokenAmount);
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr3.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                var auction = await Auction.attach(auctionAddress);
                await orangeStandTicket.connect(addr1).approve(auctionAddress, bidPrice);
                await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
                // ACT
                await expect(auctionCoordinator.connect(addr1).makeBid(auctionId, firstBidder))
                    .to.emit(auction, "BidUpdate")
                    .withArgs(auctionId, String, String, firstBidder, String);
                await expect(auctionCoordinator.connect(addr2).makeBid(auctionId, secondBidder))
                    .to.emit(auction, "BidUpdate")
                    .withArgs(auctionId, String, String, secondBidder, firstBidder);
                // ASSERT
                var activeBidAddress = await auction.getActiveBid();
                var activeBid = await Bid.attach(activeBidAddress);
                expect(await activeBid.getBidderAddress()).to.equal(secondBidder);
            })
        });

        describe('settleAuction()', function () {
            it('Settle auction with no bids made', async function () {
                // ARRANGE
                await setup();
                const [, addr1] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                var auctionId = 1;
                var tokenAmount = 20;
                var itemOwnerAddress = addr1.address;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(itemOwnerAddress, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, itemOwnerAddress,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                var auction = await Auction.attach(auctionAddress);
                await mine(1000);
                // ACT
                var balanceForOwnerBeforeSettlement = await simToken.balanceOf(itemOwnerAddress);
                await expect(auctionCoordinator.connect(addr1).settleAuction(auctionId))
                    .to.emit(auction, "AuctionSettled")
                    .withArgs(auctionId, String, 0);
                var balanceForOwnerAfterSettlement = await simToken.balanceOf(itemOwnerAddress);
                // ASSERT
                expect(balanceForOwnerBeforeSettlement).to.equal(0);
                expect(balanceForOwnerAfterSettlement).to.equal(tokenAmount);
            })
            it('Settle auction with single bid', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1, addr2] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                var auctionId = 1;
                var tokenAmount = 20;
                const bidder = addr2.address;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                var auction = await Auction.attach(auctionAddress);
                await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
                await auctionCoordinator.makeBid(auctionId, bidder);
                await mine(1000);
                // ACT
                var balanceForFinalBidderBeforeSettlement = await simToken.balanceOf(bidder);
                await expect(auctionCoordinator.connect(addr2).settleAuction(auctionId))
                    .to.emit(auction, "AuctionSettled")
                    .withArgs(auctionId, bidder, biddingPrice);
                var balanceForFinalBidderAfterSettlement = await simToken.balanceOf(bidder);
                // ASSERT
                expect(balanceForFinalBidderBeforeSettlement).to.equal(0);
                expect(balanceForFinalBidderAfterSettlement).to.equal(tokenAmount);
            })
            it('Settle auction check for treasury payment', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1, addr2] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                var ticketBalanceForOwnerInitialBalance = await orangeStandTicket.balanceOf(addr1.address);
                var auctionId = 1;
                var tokenAmount = 20;
                var biddingPrice = 1;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                var auction = await Auction.attach(auctionAddress);
                await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
                await auctionCoordinator.makeBid(auctionId, addr2.address);
                await mine(1000);
                // ACT
                await expect(auctionCoordinator.connect(addr2).settleAuction(auctionId))
                    .to.emit(auction, "AuctionSettled")
                    .withArgs(auctionId, addr2.address, biddingPrice);
                var ticketBalanceForFinalBidder = await orangeStandTicket.balanceOf(addr2.address);
                var treasuryBalance = await orangeStandTicket.balanceOf(treasuryAddress);
                var treasurySettlementBalance = await orangeStandSettlementTicket.balanceOf(treasuryAddress)
                var ticketBalanceForOwner = await orangeStandTicket.balanceOf(addr1.address);
                // ASSERT
                expect(ticketBalanceForFinalBidder).to.equal(0);
                expect(treasuryBalance).to.equal(bidPrice * 0.01);
                expect(treasurySettlementBalance).to.equal(0);
                expect(ticketBalanceForOwner - ticketBalanceForOwnerInitialBalance).to.equal(bidPrice * 0.99);
            })
            it('Original owner can settle auction', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1, addr2] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                var auctionId = 1;
                var tokenAmount = 20;
                const bidder = addr2.address;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                var auction = await Auction.attach(auctionAddress);
                await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
                await auctionCoordinator.makeBid(auctionId, bidder);
                await mine(1000);
                // ACT
                var balanceForFinalBidderBeforeSettlement = await simToken.balanceOf(bidder);
                await expect(auctionCoordinator.connect(addr1).settleAuction(auctionId))
                    .to.emit(auction, "AuctionSettled")
                    .withArgs(auctionId, bidder, biddingPrice);
                var balanceForFinalBidderAfterSettlement = await simToken.balanceOf(bidder);
                // ASSERT
                expect(balanceForFinalBidderBeforeSettlement).to.equal(0);
                expect(balanceForFinalBidderAfterSettlement).to.equal(tokenAmount);
            })
            it('Winning bidder can settle auction', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1, addr2] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                var auctionId = 1;
                var tokenAmount = 20;
                const bidder = addr2.address;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                var auction = await Auction.attach(auctionAddress);
                await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
                await auctionCoordinator.makeBid(auctionId, bidder);
                await mine(1000);
                // ACT
                var balanceForFinalBidderBeforeSettlement = await simToken.balanceOf(bidder);
                await expect(auctionCoordinator.connect(addr2).settleAuction(auctionId))
                    .to.emit(auction, "AuctionSettled")
                    .withArgs(auctionId, bidder, biddingPrice);
                var balanceForFinalBidderAfterSettlement = await simToken.balanceOf(bidder);
                // ASSERT
                expect(balanceForFinalBidderBeforeSettlement).to.equal(0);
                expect(balanceForFinalBidderAfterSettlement).to.equal(tokenAmount);
            })
            it('Settle auction with multiple bids', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1, addr2, addr3] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                var auctionId = 1;
                var tokenAmount = 20;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr3.address, tokenAmount);
                await simToken.connect(addr3).approve(await auctionCoordinator.getAddress(), tokenAmount);
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr3.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                var auction = await Auction.attach(auctionAddress);
                await orangeStandTicket.connect(addr1).approve(auctionAddress, bidPrice);
                await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
                await auctionCoordinator.makeBid(auctionId, firstBidder);
                await auctionCoordinator.makeBid(auctionId, secondBidder);
                await mine(1000);
                // ACT
                var balanceForFinalBidderBeforeSettlement = await simToken.balanceOf(secondBidder);
                await expect(auctionCoordinator.connect(addr3).settleAuction(auctionId))
                    .to.emit(auction, "AuctionSettled")
                    .withArgs(auctionId, secondBidder, biddingPrice + bidPrice);
                var balanceForFinalBidderAfterSettlement = await simToken.balanceOf(secondBidder);
                // ASSERT
                expect(balanceForFinalBidderBeforeSettlement).to.equal(0);
                expect(balanceForFinalBidderAfterSettlement).to.equal(tokenAmount);
            })
            it('Settle multiple auctions', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1, addr2] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                var firstAuctionId = 1;
                var secondAuctionId = 2;
                var firstAuctionTokenAmount = 20;
                var secondAuctionTokenAmount = 13;
                const firstBidder = addr2.address;
                const secondBidder = addr1.address;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, firstAuctionTokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), firstAuctionTokenAmount);
                await simToken.mint(addr2.address, secondAuctionTokenAmount);
                await simToken.connect(addr2).approve(await auctionCoordinator.getAddress(), secondAuctionTokenAmount);
                await auctionCoordinator.createErc20Auction(erc20Address, firstAuctionTokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                await auctionCoordinator.createErc20Auction(erc20Address, secondAuctionTokenAmount, addr2.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var firstAuctionAddress = await auctionCoordinator.getAuction(firstAuctionId);
                var secondAuctionAddress = await auctionCoordinator.getAuction(secondAuctionId);
                var firstAuction = await Auction.attach(firstAuctionAddress);
                var secondAuction = await Auction.attach(secondAuctionAddress);
                await orangeStandTicket.connect(addr2).approve(firstAuctionAddress, bidPrice);
                await orangeStandTicket.connect(addr1).approve(secondAuctionAddress, bidPrice);
                await auctionCoordinator.makeBid(firstAuctionId, firstBidder);
                await auctionCoordinator.makeBid(secondAuctionId, secondBidder);
                await mine(1000);
                // ACT
                var balanceForFinalBidderOfFirstAuctionBeforeSettlement = await simToken.balanceOf(firstBidder);
                await expect(auctionCoordinator.connect(addr2).settleAuction(firstAuctionId))
                    .to.emit(firstAuction, "AuctionSettled")
                    .withArgs(firstAuctionId, firstBidder, biddingPrice);
                var balanceForFinalBidderOfFirstAuctionAfterSettlement = await simToken.balanceOf(firstBidder);
                var balanceForFinalBidderOfSecondAuctionBeforeSettlement = await simToken.balanceOf(secondBidder);
                await expect(auctionCoordinator.connect(addr1).settleAuction(secondAuctionId))
                    .to.emit(secondAuction, "AuctionSettled")
                    .withArgs(secondAuctionId, secondBidder, biddingPrice);
                var balanceForFinalBidderOfSecondAuctionAfterSettlement = await simToken.balanceOf(secondBidder);
                // ASSERT
                expect(balanceForFinalBidderOfFirstAuctionBeforeSettlement).to.equal(0);
                expect(balanceForFinalBidderOfFirstAuctionAfterSettlement).to.equal(firstAuctionTokenAmount);
                expect(balanceForFinalBidderOfSecondAuctionBeforeSettlement).to.equal(0);
                expect(balanceForFinalBidderOfSecondAuctionAfterSettlement).to.equal(secondAuctionTokenAmount);
            })
            it('Settle auction with ERC20 auction', async function () {
                // ARRANGE
                await setup();
                const [owner, addr1, addr2] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                var auctionId = 1;
                var tokenAmount = 20;
                const bidder = addr2.address;
                const SimulationToken = await ethers.getContractFactory('SimulationToken');
                var simToken = await SimulationToken.deploy();
                var erc20Address = await simToken.getAddress();
                await simToken.mint(addr1.address, tokenAmount);
                await simToken.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenAmount);
                await auctionCoordinator.createErc20Auction(erc20Address, tokenAmount, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                var auction = await Auction.attach(auctionAddress);
                await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
                await auctionCoordinator.makeBid(auctionId, bidder);
                await mine(1000);
                // ACT
                var balanceForFinalBidderBeforeSettlement = await simToken.balanceOf(bidder);
                await expect(auctionCoordinator.connect(addr2).settleAuction(auctionId))
                    .to.emit(auction, "AuctionSettled")
                    .withArgs(auctionId, bidder, biddingPrice);
                var balanceForFinalBidderAfterSettlement = await simToken.balanceOf(bidder);
                // ASSERT
                expect(balanceForFinalBidderBeforeSettlement).to.equal(0);
                expect(balanceForFinalBidderAfterSettlement).to.equal(tokenAmount);
            })
            it('Settle auction with ERC721 auction', async function () {
                // ARRANGE
                await setup();
                const [_, addr1, addr2] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                const LocalCollectible = await ethers.getContractFactory('LocalCollectible');
                var auctionId = 1;
                var auctionNft = await LocalCollectible.deploy();
                const tokenId = 1;
                const itemAddress = await auctionNft.getAddress();
                await auctionNft.mintItem(addr1.address, 'QmfVMAmNM1kDEBYrC2TPzQDoCRFH6F5tE1e9Mr4FkkR5Xr');
                await auctionNft.connect(addr1).approve(await auctionCoordinator.getAddress(), tokenId);
                var ownerOfItemBeforeSettlement = await auctionNft.ownerOf(tokenId);
                await auctionCoordinator.createErc721Auction(itemAddress, tokenId, addr1.address,
                    bidTimeInMinutes, biddingPrice, orangeStandTicket, bidPrice, orangeStandSettlementTicket);
                var auctionAddress = await auctionCoordinator.getAuction(auctionId);
                var auction = await Auction.attach(auctionAddress);
                await orangeStandTicket.connect(addr2).approve(auctionAddress, bidPrice);
                await auctionCoordinator.makeBid(auctionId, secondBidder);
                await mine(1000);
                // ACT
                await expect(auctionCoordinator.connect(addr2).settleAuction(auctionId))
                    .to.emit(auction, "AuctionSettled")
                    .withArgs(auctionId, secondBidder, biddingPrice);
                var ownerOfItemAfterSettlement = await auctionNft.ownerOf(tokenId);
                // ASSERT
                expect(ownerOfItemBeforeSettlement).to.equal(addr1.address);
                expect(ownerOfItemAfterSettlement).to.equal(secondBidder);
            })
        });
    });
});
