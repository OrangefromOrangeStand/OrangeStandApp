import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';

describe('Bid contract', function () {
    let bid: Contract;

    describe('Bid', function () {
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const startTime = 29014;
        const itemAddress = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
        const bidPrice = 16;
        if (contractAddress) {
            it('Should connect to external contract', async function () {
                bid = await ethers.getContractAt('Bid', contractAddress);
            });
        } else {
            it('Should deploy Bid', async function () {
                const Bid = await ethers.getContractFactory('Bid');
                const [owner] = await ethers.getSigners();
                bid = await Bid.deploy(owner.address, startTime, itemAddress, bidPrice);
            });
        }

        describe('getBidderAddress()', function () {
            it('Get the bidder`s address', async function () {
                const [owner] = await ethers.getSigners();
                var result = await bid.getBidderAddress();
                expect(await result).to.equal(owner.address);
            });
        });

        describe('getStartTime()', function () {
            it('Get the correct starting time', async function () {
                var result = await bid.getStartTime();
                expect(result).to.equal(startTime);
            })
        });

        describe('getItemAddress()', function () {
            it('Get the correct item address', async function () {
                var result = await bid.getItemAddress();
                expect(result).to.equal(itemAddress);
            })
        });

        describe('getBidPrice()', function () {
            it('Get the bid price', async function () {
                var result = await bid.getBidPrice();
                expect(result).to.equal(bidPrice);
            })
        });
    });
});
