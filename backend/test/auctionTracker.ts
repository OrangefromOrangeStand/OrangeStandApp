import { ethers, network } from 'hardhat';
import { use, expect } from 'chai';
import { Contract } from 'ethers';
const { mine } = require("@nomicfoundation/hardhat-network-helpers");

describe('AuctionTracker tests', function () {
    let auctionTracker: Contract;

    describe('AuctionTracker', function () {
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const itemAddress = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
        const originalOwnerAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';
        const treasuryAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
        const settlementToken = '0x198eebe8da4db8a475f9b31c864bf089e550719c';
        let orangeStandTicket: Contract;
        let orangeStandSettlementTicket: Contract;

        const auctionId = 3;
        const auctionStartTime = 29014;
        const auctionLengthInMinutes = 10;
        const initialPrice = 16;
        const priceIncrease = 5;
        const paymentToken = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';

        if (contractAddress) {
            it('Should connect to external contract', async function () {
                auctionTracker = await ethers.getContractAt('AuctionTracker', contractAddress);
                console.log('Connected to external contract', auctionTracker.address);
            });
        } else {
            it('Should deploy AuctionTracker', async function () {
                const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                const OrangeStandTicket = await ethers.getContractFactory('OrangeStandTicket');
                const OrangeStandSpentTicket = await ethers.getContractFactory('OrangeStandSpentTicket');
                const CollectionErc20 = await ethers.getContractFactory('CollectionErc20');
                const userContract = await CollectionErc20.deploy("usdTCollection", "USDT");
                orangeStandSettlementTicket = await OrangeStandSpentTicket.deploy(await userContract.getAddress());
                orangeStandTicket = await OrangeStandTicket.deploy(await userContract.getAddress(), await orangeStandSettlementTicket.getAddress());
                auctionTracker = await AuctionTracker.deploy()
            });
        }

        describe('addAuction()', function(){
            it('Can only be called by owner', async function(){
                // ARRANGE
                const [_, addr1] = await ethers.getSigners();
                const Auction = await ethers.getContractFactory('Auction');
                const testAuction = await Auction.deploy(
                    auctionId, itemAddress, auctionStartTime, auctionLengthInMinutes, 
                    initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                    treasuryAddress, settlementToken);
                const testAuctionId = 1;
                // ACT
                // ASSERT
                await expect(auctionTracker.connect(addr1).addActiveAuction(testAuctionId, testAuction)).to.be.reverted;
            })
        })

        describe('updateOccurrence()', function(){
            it('Can only be called by owner', async function(){
                // ARRANGE
                const [_, addr1] = await ethers.getSigners();
                // ARRANGE
                const Auction = await ethers.getContractFactory('Auction');
                const Item = await ethers.getContractFactory('Item');
                let item = await Item.deploy();
                let itemAddressForTest = await item.getAddress();
                let symbol = "SYM";
                const ERC20 = await ethers.getContractFactory('ERC20');
                let erc20Token = await ERC20.deploy("Name", symbol);
                var tokenNum = 1;
                await item.addErc20(await erc20Token.getAddress(), tokenNum);

                const testAuction = await Auction.deploy(
                    auctionId, itemAddressForTest, auctionStartTime, auctionLengthInMinutes, 
                    initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                    treasuryAddress, settlementToken);
                const testAuctionId = 1;
                // ACT
                await auctionTracker.addActiveAuction(testAuctionId, testAuction);
                // ASSERT
                await expect(auctionTracker.connect(addr1).updateOccurrence(testAuctionId)).to.be.reverted;
            })
        })

            describe('getAuction()', function () {
                it('Store single auction', async function () {
                    // ARRANGE
                    const Auction = await ethers.getContractFactory('Auction');
                    const Item = await ethers.getContractFactory('Item');
                    let item = await Item.deploy();
                    const testAuction = await Auction.deploy(
                        auctionId, await item.getAddress(), auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    const testAuctionId = 1;
                    // ACT
                    await auctionTracker.addActiveAuction(testAuctionId, testAuction);
                    const retrievedAuction = Auction.attach(await auctionTracker.getAuction(testAuctionId));
                    // ASSERT
                    expect(await retrievedAuction.getAddress()).to.equal(await testAuction.getAddress());
                })

                it('Last auction for same ID should be returned', async function () {
                    // ARRANGE
                    const Auction = await ethers.getContractFactory('Auction');
                    const Item = await ethers.getContractFactory('Item');
                    let item = await Item.deploy();
                    const initialAuction = await Auction.deploy(
                        auctionId, await item.getAddress(), auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    const finalAuction = await Auction.deploy(
                        auctionId, await item.getAddress(), auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    const testAuctionId = 1;
                    // ACT
                    await auctionTracker.addActiveAuction(testAuctionId, initialAuction);
                    await auctionTracker.addActiveAuction(testAuctionId, finalAuction);
                    const retrievedAuction = Auction.attach(await auctionTracker.getAuction(testAuctionId));
                    // ASSERT
                    expect(await retrievedAuction.getAddress()).to.equal(await finalAuction.getAddress());
                    expect(await retrievedAuction.getAddress()).not.to.equal(await initialAuction.getAddress());
                })
            })

            describe('getTokenOccurrence()', function () {
                it('Get token occurrence for single entry', async function () {
                    // ARRANGE
                    const Auction = await ethers.getContractFactory('Auction');
                    const Item = await ethers.getContractFactory('Item');
                    let item = await Item.deploy();
                    let itemAddressForTest = await item.getAddress();
                    let symbol = "SYM";
                    const ERC20 = await ethers.getContractFactory('ERC20');
                    let erc20Token = await ERC20.deploy("Name", symbol);
                    var tokenNum = 1;
                    await item.addErc20(await erc20Token.getAddress(), tokenNum);

                    const testAuction = await Auction.deploy(
                        auctionId, itemAddressForTest, auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    const testAuctionId = 1;
                    // ACT
                    await auctionTracker.addActiveAuction(testAuctionId, testAuction);
                    await auctionTracker.updateOccurrence(testAuctionId);
                    let occurrences = await auctionTracker.getTokenOccurrence();
                    // ASSERT
                    expect(occurrences.length).to.equal(1);
                    expect(occurrences[0].tokenSymbol).to.equal(symbol);
                })

                it('Get token occurrence for finished auction', async function () {
                    // ARRANGE
                    const Auction = await ethers.getContractFactory('Auction');
                    const Item = await ethers.getContractFactory('Item');
                    const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                    let auctionTracker = await AuctionTracker.deploy();
                    let item = await Item.deploy();
                    let itemAddressForTest = await item.getAddress();
                    let symbol = "SIM";
                    const SimulationToken = await ethers.getContractFactory('SimulationToken');
                    var simToken = await SimulationToken.deploy();
                    var tokenNum = 1;
                    await item.addErc20(await simToken.getAddress(), tokenNum);
                    await simToken.mint(await auctionTracker.getAddress(), tokenNum);
                    await simToken.approve(await auctionTracker.getAddress(), tokenNum);
                
                    const testAuction = await Auction.deploy(
                        auctionId, itemAddressForTest, auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    const testAuctionId = 1;
                    // ACT
                    await auctionTracker.addActiveAuction(testAuctionId, testAuction);
                    await auctionTracker.updateOccurrence(testAuctionId);
                    let occurrencesBeforeAuctionFinish = await auctionTracker.getTokenOccurrence();
                    await auctionTracker.removeAuction(testAuctionId, item);
                    let occurrencesAfterAuctionFinish = await auctionTracker.getTokenOccurrence();
                    // ASSERT
                    expect(occurrencesBeforeAuctionFinish.length).to.equal(1);
                    expect(occurrencesAfterAuctionFinish.length).to.equal(1);
                    expect(occurrencesBeforeAuctionFinish[0].tokenSymbol).to.equal(symbol);
                    expect(occurrencesAfterAuctionFinish[0].tokenSymbol).to.equal(symbol);
                    expect(occurrencesAfterAuctionFinish[0].pastUsageMovingAverage).to.lessThan(occurrencesBeforeAuctionFinish[0].pastUsageMovingAverage);
                })

                it('Get multiple token occurrences', async function () {
                    // ARRANGE
                    const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                    let auctionTracker = await AuctionTracker.deploy()
                    const Auction = await ethers.getContractFactory('Auction');
                    const Item = await ethers.getContractFactory('Item');
                    let item1 = await Item.deploy();
                    let item2 = await Item.deploy();
                    let auction1Id = 2;
                    let auction2Id = 3;
                    let item1AddressForTest = await item1.getAddress();
                    let item2AddressForTest = await item2.getAddress();
                    const SimulationToken = await ethers.getContractFactory('SimulationToken');
                    var simToken = await SimulationToken.deploy();
                    let symbol1 = "SIM";
                    let symbol2 = "ITM2";
                    const ERC20 = await ethers.getContractFactory('ERC20');
                    let erc20Token2 = await ERC20.deploy("TKN2", symbol2);
                    var tokenNum = 1;
                    await item1.addErc20(await simToken.getAddress(), tokenNum);
                    await item2.addErc20(await erc20Token2.getAddress(), tokenNum);
                    await simToken.mint(await auctionTracker.getAddress(), tokenNum);
                    await simToken.approve(await auctionTracker.getAddress(), tokenNum);

                    const testAuction1 = await Auction.deploy(
                        auction1Id, item1AddressForTest, auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    const testAuction2 = await Auction.deploy(
                        auction2Id, item2AddressForTest, auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    // ACT
                    await auctionTracker.addActiveAuction(auction1Id, testAuction1);
                    await auctionTracker.addActiveAuction(auction2Id, testAuction2);
                    await auctionTracker.updateOccurrence(auction1Id);
                    await auctionTracker.updateOccurrence(auction2Id);
                    let occurrencesBeforeAuctionFinish = await auctionTracker.getTokenOccurrence();
                    await auctionTracker.removeAuction(auction1Id, item1);
                    let occurrencesAfterFirstAuctionFinish = await auctionTracker.getTokenOccurrence();
                    // ASSERT
                    expect(occurrencesBeforeAuctionFinish.length).to.equal(2);
                    expect(occurrencesAfterFirstAuctionFinish.length).to.equal(2);
                    expect(occurrencesBeforeAuctionFinish[0].tokenSymbol).to.equal(symbol1);
                    expect(occurrencesBeforeAuctionFinish[1].tokenSymbol).to.equal(symbol2);
                    expect(occurrencesAfterFirstAuctionFinish[0].tokenSymbol).to.equal(symbol1);
                    expect(occurrencesAfterFirstAuctionFinish[1].tokenSymbol).to.equal(symbol2);
                    expect(occurrencesBeforeAuctionFinish[0].pastUsageMovingAverage).to.equal(occurrencesBeforeAuctionFinish[1].pastUsageMovingAverage);
                    expect(occurrencesAfterFirstAuctionFinish[0].pastUsageMovingAverage).to.lessThan(occurrencesAfterFirstAuctionFinish[1].pastUsageMovingAverage);
                })
            })

            describe('getAllActiveAuctions()', function () {
                it('Get no active auctions', async function () {
                    const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                    let auctionTracker = await AuctionTracker.deploy();
                    var activeAuctions = await auctionTracker.getAllActiveAuctions("SYM");
                    expect(activeAuctions.length).to.equal(0);
                })

                it('Get single active auctions', async function () {
                    // ARRANGE
                    const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                    let auctionTracker = await AuctionTracker.deploy();
                    const Auction = await ethers.getContractFactory('Auction');
                    const Item = await ethers.getContractFactory('Item');
                    let item = await Item.deploy();
                    let itemAddressForTest = await item.getAddress();
                    let symbol = "SYM";
                    const ERC20 = await ethers.getContractFactory('ERC20');
                    let erc20Token = await ERC20.deploy("Name", symbol);
                    var tokenNum = 1;
                    await item.addErc20(await erc20Token.getAddress(), tokenNum);

                    const testAuctionId = 6;
                    const testAuction = await Auction.deploy(
                        testAuctionId, itemAddressForTest, auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    
                    // ACT
                    await auctionTracker.addActiveAuction(testAuctionId, testAuction);
                    var activeAuctions = await auctionTracker.getAllActiveAuctions("SYM");

                    // ASSERT
                    expect(activeAuctions.length).to.equal(1);
                    expect(activeAuctions[0]).to.equal(testAuctionId);
                })

                it('Get multiple active auctions for same symbol', async function () {
                    // ARRANGE
                    const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                    let auctionTracker = await AuctionTracker.deploy()
                    const Auction = await ethers.getContractFactory('Auction');
                    const Item = await ethers.getContractFactory('Item');
                    let item1 = await Item.deploy();
                    let item2 = await Item.deploy();
                    let auction1Id = 2;
                    let auction2Id = 3;
                    let item1AddressForTest = await item1.getAddress();
                    let item2AddressForTest = await item2.getAddress();
                    let symbol = "ITM1";
                    const ERC20 = await ethers.getContractFactory('ERC20');
                    let erc20Token1 = await ERC20.deploy("TKN1", symbol);
                    let erc20Token2 = await ERC20.deploy("TKN2", symbol);
                    var tokenNum = 1;
                    await item1.addErc20(await erc20Token1.getAddress(), tokenNum);
                    await item2.addErc20(await erc20Token2.getAddress(), tokenNum);

                    const testAuction1 = await Auction.deploy(
                        auction1Id, item1AddressForTest, auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    const testAuction2 = await Auction.deploy(
                        auction2Id, item2AddressForTest, auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    // ACT
                    await auctionTracker.addActiveAuction(auction1Id, testAuction1);
                    await auctionTracker.addActiveAuction(auction2Id, testAuction2);
                    var activeAuctions = await auctionTracker.getAllActiveAuctions(symbol);

                    // ASSERT
                    expect(activeAuctions.length).to.equal(2);
                    expect(activeAuctions[0]).to.equal(auction1Id);
                    expect(activeAuctions[1]).to.equal(auction2Id);
                })

                it('Get multiple active auctions for different symbol', async function () {
                    // ARRANGE
                    const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                    let auctionTracker = await AuctionTracker.deploy()
                    const Auction = await ethers.getContractFactory('Auction');
                    const Item = await ethers.getContractFactory('Item');
                    let item1 = await Item.deploy();
                    let item2 = await Item.deploy();
                    let auction1Id = 2;
                    let auction2Id = 3;
                    let item1AddressForTest = await item1.getAddress();
                    let item2AddressForTest = await item2.getAddress();
                    let symbol1 = "ITM1";
                    let symbol2 = "ITM2";
                    const ERC20 = await ethers.getContractFactory('ERC20');
                    let erc20Token1 = await ERC20.deploy("TKN1", symbol1);
                    let erc20Token2 = await ERC20.deploy("TKN2", symbol2);
                    var tokenNum = 1;
                    await item1.addErc20(await erc20Token1.getAddress(), tokenNum);
                    await item2.addErc20(await erc20Token2.getAddress(), tokenNum);

                    const testAuction1 = await Auction.deploy(
                        auction1Id, item1AddressForTest, auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    const testAuction2 = await Auction.deploy(
                        auction2Id, item2AddressForTest, auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    // ACT
                    await auctionTracker.addActiveAuction(auction1Id, testAuction1);
                    await auctionTracker.addActiveAuction(auction2Id, testAuction2);
                    var activeAuctionsForFirstSymbol = await auctionTracker.getAllActiveAuctions(symbol1);
                    var activeAuctionsForSecondSymbol = await auctionTracker.getAllActiveAuctions(symbol2);

                    // ASSERT
                    expect(activeAuctionsForFirstSymbol.length).to.equal(1)
                    expect(activeAuctionsForSecondSymbol.length).to.equal(1);
                    expect(activeAuctionsForFirstSymbol[0]).to.equal(auction1Id);
                    expect(activeAuctionsForSecondSymbol[0]).to.equal(auction2Id);
                })
            })

            describe('getAllCategories()', function () {
                it('Get empty list of categories', async function () {
                    const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                    let auctionTracker = await AuctionTracker.deploy();
                    let retrievedCategories = await auctionTracker.getAllCategories();
                    expect(retrievedCategories.length).to.equal(0);
                })

                it('Get single category', async function () {
                    // ARRANGE
                    const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                    let auctionTracker = await AuctionTracker.deploy();
                    const Auction = await ethers.getContractFactory('Auction');
                    const Item = await ethers.getContractFactory('Item');
                    let item = await Item.deploy();
                    let itemAddressForTest = await item.getAddress();
                    let symbol = "SYM";
                    const ERC20 = await ethers.getContractFactory('ERC20');
                    let erc20Token = await ERC20.deploy("Name", symbol);
                    var tokenNum = 1;
                    await item.addErc20(await erc20Token.getAddress(), tokenNum);

                    const testAuction = await Auction.deploy(
                        auctionId, itemAddressForTest, auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    const testAuctionId = 1;
                    // ACT
                    await auctionTracker.addActiveAuction(testAuctionId, testAuction);
                    let retrievedCategories = await auctionTracker.getAllCategories();
                    // ASSERT
                    expect(retrievedCategories.length).to.equal(1);
                    expect(ethers.decodeBytes32String(retrievedCategories[0])).to.equal(symbol);
                })

                it('Get multiple categories', async function () {
                    // ARRANGE
                    const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                    let auctionTracker = await AuctionTracker.deploy()
                    const Auction = await ethers.getContractFactory('Auction');
                    const Item = await ethers.getContractFactory('Item');
                    let item1 = await Item.deploy();
                    let item2 = await Item.deploy();
                    let auction1Id = 2;
                    let auction2Id = 3;
                    let item1AddressForTest = await item1.getAddress();
                    let item2AddressForTest = await item2.getAddress();
                    let symbol1 = "ITM1";
                    let symbol2 = "ITM2";
                    const ERC20 = await ethers.getContractFactory('ERC20');
                    let erc20Token1 = await ERC20.deploy("TKN1", symbol1);
                    let erc20Token2 = await ERC20.deploy("TKN2", symbol2);
                    var tokenNum = 1;
                    await item1.addErc20(await erc20Token1.getAddress(), tokenNum);
                    await item2.addErc20(await erc20Token2.getAddress(), tokenNum);

                    const testAuction1 = await Auction.deploy(
                        auction1Id, item1AddressForTest, auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    const testAuction2 = await Auction.deploy(
                        auction2Id, item2AddressForTest, auctionStartTime, auctionLengthInMinutes, 
                        initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                        treasuryAddress, settlementToken);
                    // ACT
                    await auctionTracker.addActiveAuction(auction1Id, testAuction1);
                    await auctionTracker.addActiveAuction(auction2Id, testAuction2);
                    let retrievedCategories = await auctionTracker.getAllCategories();
                    // ASSERT
                    expect(retrievedCategories.length).to.equal(2);
                    expect(ethers.decodeBytes32String(retrievedCategories[0])).to.equal(symbol1);
                    expect(ethers.decodeBytes32String(retrievedCategories[1])).to.equal(symbol2);
                })
            })

            describe('generateBid()', function () {
                it('Generate a single bid', async function () {
                    // ARRANGE
                    const [owner, addr1] = await ethers.getSigners();
                    let sampleBidder = addr1;
                    const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                    let auctionTracker = await AuctionTracker.deploy();
                    const OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
                    const OrangeStandSpentTicket = await ethers.getContractFactory('OrangeStandSpentTicket');
                    const CollectionErc20 = await ethers.getContractFactory('CollectionErc20');
                    const userContract = await CollectionErc20.deploy("usdTCollection", "USDT");
                    const orangeStandSpentTicket = await OrangeStandSpentTicket.deploy(await userContract.getAddress());
                    const orangeStandTicket = await OrangeStandTicket.deploy(await userContract.getAddress(), await orangeStandSpentTicket.getAddress());
                    await userContract.mint(sampleBidder, priceIncrease);
                    await userContract.connect(sampleBidder).approve(await orangeStandTicket.getAddress(), priceIncrease);
                    await orangeStandTicket.mint(sampleBidder, priceIncrease);
                    const Auction = await ethers.getContractFactory('Auction');
                    const Item = await ethers.getContractFactory('Item');
                    const Bid = await ethers.getContractFactory('Bid');
                    let item = await Item.deploy();
                    let itemAddressForTest = await item.getAddress();
                    let symbol = "SYM";
                    const ERC20 = await ethers.getContractFactory('ERC20');
                    let erc20Token = await ERC20.deploy("Name", symbol);
                    var tokenNum = 1;
                    await item.addErc20(await erc20Token.getAddress(), tokenNum);

                    const testAuctionId = 8;
                    const testAuction = await Auction.deploy(
                        testAuctionId, itemAddressForTest, (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp, 
                        auctionLengthInMinutes, initialPrice, originalOwnerAddress, priceIncrease, (await orangeStandTicket.getAddress()), 
                        treasuryAddress, settlementToken);
                    await orangeStandTicket.connect(sampleBidder).approve((await testAuction.getAddress()), priceIncrease);
                    
                    // ACT
                    await auctionTracker.addActiveAuction(testAuctionId, testAuction);
                    let initialActiveAuction = Auction.attach(await auctionTracker.getAuction(testAuctionId));
                    let initialActiveBidAddress = await initialActiveAuction.getActiveBid();
                    await auctionTracker.generateBid(testAuctionId, sampleBidder);
                    let activeAuctionAfterBidding = Auction.attach(await auctionTracker.getAuction(testAuctionId));
                    let activeBidAfterBidding = Bid.attach(await activeAuctionAfterBidding.getActiveBid());
                    let activeBidder = await activeBidAfterBidding.getBidderAddress();
                    // ASSERT
                    expect(initialActiveBidAddress).to.equal('0x0000000000000000000000000000000000000000');
                    expect(activeBidder).to.equal(sampleBidder.address);
                })

                it('Generate multiple bids', async function () {
                    // ARRANGE
                    const [owner, addr1, addr2] = await ethers.getSigners();
                    let sampleBidder = addr1;
                    let secondSampleBidder = addr2;
                    const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                    let auctionTracker = await AuctionTracker.deploy();
                    const OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
                    const OrangeStandSpentTicket = await ethers.getContractFactory('OrangeStandSpentTicket');
                    const CollectionErc20 = await ethers.getContractFactory('CollectionErc20');
                    const userContract = await CollectionErc20.deploy("usdTCollection", "USDT");
                    const orangeStandSpentTicket = await OrangeStandSpentTicket.deploy(await userContract.getAddress());
                    const orangeStandTicket = await OrangeStandTicket.deploy(await userContract.getAddress(), await orangeStandSpentTicket.getAddress());
                    await userContract.mint(sampleBidder, priceIncrease);
                    await userContract.connect(sampleBidder).approve(await orangeStandTicket.getAddress(), priceIncrease);
                    await userContract.mint(secondSampleBidder, priceIncrease);
                    await userContract.connect(secondSampleBidder).approve(await orangeStandTicket.getAddress(), priceIncrease);
                    await orangeStandTicket.mint(sampleBidder, priceIncrease);
                    await orangeStandTicket.mint(secondSampleBidder, priceIncrease);
                    const Auction = await ethers.getContractFactory('Auction');
                    const Item = await ethers.getContractFactory('Item');
                    const Bid = await ethers.getContractFactory('Bid');
                    let item = await Item.deploy();
                    let itemAddressForTest = await item.getAddress();
                    let symbol = "SYM";
                    const ERC20 = await ethers.getContractFactory('ERC20');
                    let erc20Token = await ERC20.deploy("Name", symbol);
                    var tokenNum = 1;
                    await item.addErc20(await erc20Token.getAddress(), tokenNum);

                    const testAuctionId = 9;
                    const testAuction = await Auction.deploy(
                        testAuctionId, itemAddressForTest, (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp, 
                        auctionLengthInMinutes, initialPrice, originalOwnerAddress, priceIncrease, (await orangeStandTicket.getAddress()),
                        treasuryAddress, settlementToken);

                    await orangeStandTicket.connect(sampleBidder).approve((await testAuction.getAddress()), priceIncrease);
                    await orangeStandTicket.connect(secondSampleBidder).approve((await testAuction.getAddress()), priceIncrease);
                    // ACT
                    await auctionTracker.addActiveAuction(testAuctionId, testAuction);
                    let initialActiveAuction = Auction.attach(await auctionTracker.getAuction(testAuctionId));
                    let initialActiveBidAddress = await initialActiveAuction.getActiveBid();
                    await auctionTracker.generateBid(testAuctionId, sampleBidder);
                    let activeAuctionAfterFirstBidding = Auction.attach(await auctionTracker.getAuction(testAuctionId));
                    let activeBidAfterFirstBidding = Bid.attach(await activeAuctionAfterFirstBidding.getActiveBid());
                    let firstActiveBidder = await activeBidAfterFirstBidding.getBidderAddress();
                    await auctionTracker.generateBid(testAuctionId, secondSampleBidder);
                    let activeAuctionAfterSecondBidding = Auction.attach(await auctionTracker.getAuction(testAuctionId));
                    let activeBidAfterSecondBidding = Bid.attach(await activeAuctionAfterSecondBidding.getActiveBid());
                    let secondActiveBidder = await activeBidAfterSecondBidding.getBidderAddress();
                    // ASSERT
                    expect(initialActiveBidAddress).to.equal('0x0000000000000000000000000000000000000000');
                    expect(firstActiveBidder).to.equal(sampleBidder.address);
                    expect(secondActiveBidder).to.equal(secondSampleBidder.address);
                })

                it('Can only be called by owner', async function(){
                    // ARRANGE
                    const [owner, addr1, nonOwnerCaller] = await ethers.getSigners();
                    let sampleBidder = addr1;
                    const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                    let auctionTracker = await AuctionTracker.deploy();
                    const OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
                    const OrangeStandSpentTicket = await ethers.getContractFactory('OrangeStandSpentTicket');
                    const CollectionErc20 = await ethers.getContractFactory('CollectionErc20');
                    const userContract = await CollectionErc20.deploy("usdTCollection", "USDT");
                    const orangeStandSpentTicket = await OrangeStandSpentTicket.deploy(await userContract.getAddress());
                    const orangeStandTicket = await OrangeStandTicket.deploy(await userContract.getAddress(), await orangeStandSpentTicket.getAddress());
                    await userContract.mint(sampleBidder, priceIncrease);
                    await userContract.connect(sampleBidder).approve(await orangeStandTicket.getAddress(), priceIncrease);
                    await orangeStandTicket.mint(sampleBidder, priceIncrease);
                    const Auction = await ethers.getContractFactory('Auction');
                    const Item = await ethers.getContractFactory('Item');
                    let item = await Item.deploy();
                    let itemAddressForTest = await item.getAddress();
                    let symbol = "SYM";
                    const ERC20 = await ethers.getContractFactory('ERC20');
                    let erc20Token = await ERC20.deploy("Name", symbol);
                    var tokenNum = 1;
                    await item.addErc20(await erc20Token.getAddress(), tokenNum);

                    const testAuctionId = 8;
                    const testAuction = await Auction.deploy(
                        testAuctionId, itemAddressForTest, (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp, 
                        auctionLengthInMinutes, initialPrice, originalOwnerAddress, priceIncrease, (await orangeStandTicket.getAddress()), 
                        treasuryAddress, settlementToken);
                    await orangeStandTicket.connect(sampleBidder).approve((await testAuction.getAddress()), priceIncrease);
                    
                    // ACT
                    await auctionTracker.addActiveAuction(testAuctionId, testAuction);
                    await expect(auctionTracker.connect(nonOwnerCaller).generateBid(testAuctionId, sampleBidder)).to.be.reverted;
                })
            })

            describe('getAuctionTransferAddress()', function () {
                it('Retrieve auction transfer address', async function () {
                    // ARRANGE
                    const [owner, addr1] = await ethers.getSigners();
                    let sampleBidder = addr1;
                    const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                    let auctionTracker = await AuctionTracker.deploy();
                    const OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
                    const OrangeStandSpentTicket = await ethers.getContractFactory('OrangeStandSpentTicket');
                    const CollectionErc20 = await ethers.getContractFactory('CollectionErc20');
                    const userContract = await CollectionErc20.deploy("usdTCollection", "USDT");
                    const orangeStandSpentTicket = await OrangeStandSpentTicket.deploy(await userContract.getAddress());
                    const orangeStandTicket = await OrangeStandTicket.deploy(await userContract.getAddress(), await orangeStandSpentTicket.getAddress());
                    await userContract.mint(sampleBidder, priceIncrease);
                    await userContract.connect(sampleBidder).approve(await orangeStandTicket.getAddress(), priceIncrease);
                    await orangeStandTicket.mint(sampleBidder, priceIncrease);
                    const Auction = await ethers.getContractFactory('Auction');
                    const Item = await ethers.getContractFactory('Item');
                    const Bid = await ethers.getContractFactory('Bid');
                    let item = await Item.deploy();
                    let itemAddressForTest = await item.getAddress();
                    let symbol = "SYM";
                    const ERC20 = await ethers.getContractFactory('ERC20');
                    let erc20Token = await ERC20.deploy("Name", symbol);
                    var tokenNum = 1;
                    await item.addErc20(await erc20Token.getAddress(), tokenNum);

                    const testAuctionId = 12;
                    const testAuction = await Auction.deploy(
                        testAuctionId, itemAddressForTest, (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp, 
                        auctionLengthInMinutes, initialPrice, originalOwnerAddress, priceIncrease, (await orangeStandTicket.getAddress()), 
                        treasuryAddress, settlementToken);

                    await orangeStandTicket.connect(sampleBidder).approve((await testAuction.getAddress()), priceIncrease);
                    
                    // ACT
                    await auctionTracker.addActiveAuction(testAuctionId, testAuction);
                    let initialBidderAddress = await auctionTracker.getAuctionTransferAddress(testAuctionId);
                    await auctionTracker.generateBid(testAuctionId, sampleBidder);
                    let retrievedBidderAddress = await auctionTracker.getAuctionTransferAddress(testAuctionId);
                    // ASSERT
                    expect(initialBidderAddress).to.equal(originalOwnerAddress);
                    expect(retrievedBidderAddress).to.equal(sampleBidder.address);
                })
            })
        
        describe('addToActiveAuction()', function () {
            it('Can only be called by owner', async function(){
                // ARRANGE
                const [_, addr1, nonOwnerCaller] = await ethers.getSigners();
                let sampleBidder = addr1;
                const AuctionTracker = await ethers.getContractFactory('AuctionTracker');
                let auctionTracker = await AuctionTracker.deploy();
                const OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
                const OrangeStandSpentTicket = await ethers.getContractFactory('OrangeStandSpentTicket');
                const CollectionErc20 = await ethers.getContractFactory('CollectionErc20');
                const userContract = await CollectionErc20.deploy("usdTCollection", "USDT");
                const orangeStandSpentTicket = await OrangeStandSpentTicket.deploy(await userContract.getAddress());
                const orangeStandTicket = await OrangeStandTicket.deploy(await userContract.getAddress(), await orangeStandSpentTicket.getAddress());
                await userContract.mint(sampleBidder, priceIncrease);
                await userContract.connect(sampleBidder).approve(await orangeStandTicket.getAddress(), priceIncrease);
                await orangeStandTicket.mint(sampleBidder, priceIncrease);
                const Auction = await ethers.getContractFactory('Auction');
                const Item = await ethers.getContractFactory('Item');
                const Bid = await ethers.getContractFactory('Bid');
                let item = await Item.deploy();
                let itemAddressForTest = await item.getAddress();
                let symbol = "SYM";
                const ERC20 = await ethers.getContractFactory('ERC20');
                let erc20Token = await ERC20.deploy("Name", symbol);
                var tokenNum = 1;
                await item.addErc20(await erc20Token.getAddress(), tokenNum);

                const testAuctionId = 12;
                const testAuction = await Auction.deploy(
                    testAuctionId, itemAddressForTest, (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp, 
                    auctionLengthInMinutes, initialPrice, originalOwnerAddress, priceIncrease, (await orangeStandTicket.getAddress()), 
                    treasuryAddress, settlementToken);

                await orangeStandTicket.connect(sampleBidder).approve((await testAuction.getAddress()), priceIncrease);
                
                // ACT
                await expect(auctionTracker.connect(nonOwnerCaller).addActiveAuction(testAuctionId, testAuction)).to.be.reverted;
            })
        })

        describe('removeAuction()', function () {
            it('Can only be called by owner', async function(){
                // ARRANGE
                const [_, nonOwnerCaller] = await ethers.getSigners();
                // ARRANGE
                const Auction = await ethers.getContractFactory('Auction');
                const Item = await ethers.getContractFactory('Item');
                let item = await Item.deploy();
                let itemAddressForTest = await item.getAddress();
                let symbol = "SYM";
                const ERC20 = await ethers.getContractFactory('ERC20');
                let erc20Token = await ERC20.deploy("Name", symbol);
                var tokenNum = 1;
                await item.addErc20(await erc20Token.getAddress(), tokenNum);

                const testAuction = await Auction.deploy(
                    auctionId, itemAddressForTest, auctionStartTime, auctionLengthInMinutes, 
                    initialPrice, originalOwnerAddress, priceIncrease, paymentToken, 
                    treasuryAddress, settlementToken);
                const testAuctionId = 1;
                // ACT
                await auctionTracker.addActiveAuction(testAuctionId, testAuction);
                await auctionTracker.updateOccurrence(testAuctionId);
                await expect(auctionTracker.connect(nonOwnerCaller).removeAuction(testAuctionId, item)).to.be.reverted;
            })
        })
    })
})