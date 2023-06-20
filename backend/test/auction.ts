import { ethers, network } from 'hardhat';
import { use, expect } from 'chai';
//import { solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';
import { Z_BLOCK } from 'zlib';


//use(solidity);

describe('Auction tests', function () {
    
    let auction: Contract;
    const truffleAssert = require('truffle-assertions');

    describe('Auction', function () {
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const auctionId = 3;
        const itemAddress = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
        const auctionStartTime = 29014;
        const cycleDuration = 10;
        const initialPrice = 16;
        const originalOwnerAddress = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';
        const priceIncrease = 5;
        const paymentToken = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';

        if (contractAddress) {
            it('Should connect to external contract', async function () {
                auction = await ethers.getContractAt('Auction', contractAddress);
                console.log('Connected to external contract', auction.address);
            });
        } else {
            it('Should deploy Auction', async function () {
                const Auction = await ethers.getContractFactory('Auction');

                const [owner] = await ethers.getSigners();

                auction = await Auction.deploy(
                    auctionId, itemAddress, auctionStartTime, cycleDuration, 
                    initialPrice, originalOwnerAddress, priceIncrease, paymentToken)
            });
        }

        describe('getId()', function () {
            it('Get the correct auction id', async function () {
                console.log('\t', 'Expected token id: ', auctionId);

                var result = await auction.getId();
                expect(result).to.equal(auctionId);
            })
        });

        describe('getItem()', function () {
            it('Get the correct item address', async function () {
                console.log('\t', 'Expected address: ', itemAddress);

                var result = await auction.getItem();
                expect(result).to.equal(itemAddress);
            })
        });

        describe('getActiveBid()', function () {
            it('Get the empty bid - before any bids have been made', async function () {
                console.log('\t', 'Expected address: ', '0x0000000000000000000000000000000000000000');

                var result = await auction.getActiveBid();
                expect(result).to.equal('0x0000000000000000000000000000000000000000');
            })
        });

        describe('getCurrentCycleStartTime()', function () {
            it('Get the current cycle start time', async function () {
                console.log('\t', 'Expected start time: ', auctionStartTime);

                var result = await auction.getCurrentCycleStartTime();
                expect(result).to.equal(auctionStartTime);
            })
        });

        describe('getCycleDuration()', function () {
            it('Get the current cycle duration', async function () {
                console.log('\t', 'Expected cycle duration: ', cycleDuration);

                var result = await auction.getCycleDuration();
                expect(result).to.equal(cycleDuration);
            })
        });

        describe('getCurrentCycleEndTime()', function () {
            it('Get the current cycle end time', async function () {
                var endTime = auctionStartTime + cycleDuration * 60;
                console.log('\t', 'Expected end time: ', endTime);

                var result = await auction.getCurrentCycleEndTime();
                expect(result).to.equal(endTime);
            })
        });

        describe('getInitialPrice()', function () {
            it('Get the initial price', async function () {
                console.log('\t', 'Expected initial price: ', initialPrice);

                var result = await auction.getInitialPrice();
                expect(result).to.equal(initialPrice);
            })
        });

        describe('getPriceIncrease()', function () {
            it('Get the price increase', async function () {
                console.log('\t', 'Expected price increase: ', priceIncrease);

                var result = await auction.getPriceIncrease();
                expect(result).to.equal(priceIncrease);
            })
        });

        describe('getOriginalOwner()', function () {
            it('Get the original owner', async function () {
                console.log('\t', 'Expected original owner: ', originalOwnerAddress);

                var result = await auction.getOriginalOwner();
                expect(result).to.equal(originalOwnerAddress);
            })
        });
    });
});
