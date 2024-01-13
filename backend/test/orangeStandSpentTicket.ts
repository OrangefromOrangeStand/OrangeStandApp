import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';

describe('OrangeStandSpentTicket tests', function () {
    
    let orangeStandSpentTicket: Contract;
    let userContract: Contract;

    describe('OrangeStandSpentTicket', function () {
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const testAddress1 = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
        const testAddress2 = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';
        const testAddress3 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

        if (contractAddress) {
            it('Should connect to external contract', async function () {
                orangeStandSpentTicket = await ethers.getContractAt('OrangeStandSpentTicket', contractAddress);
                console.log('Connected to external contract', orangeStandSpentTicket.address);
            });
        } else {
            it('Should deploy OrangeStandSpentTicket', async function () {
                const OrangeStandSpentTicket = await ethers.getContractFactory('OrangeStandSpentTicket');
                const CollectionErc20 = await ethers.getContractFactory('CollectionErc20');
                userContract = await CollectionErc20.deploy("usdTCollection", "USDT");
                orangeStandSpentTicket = await OrangeStandSpentTicket.deploy(await userContract.getAddress())
            });
        }

        describe('mint()', function () {
            it('Should mint one ticket', async function () {
                const [owner, addr1] = await ethers.getSigners();
                var initialBalance = await orangeStandSpentTicket.balanceOf(testAddress1);
                await orangeStandSpentTicket.addMinter(addr1.address);
                await orangeStandSpentTicket.connect(addr1).mint(testAddress1, 1);
                var balanceAfterMint = await orangeStandSpentTicket.balanceOf(testAddress1);
                expect(initialBalance).to.equal(0);
                expect(balanceAfterMint).to.equal(1);
            })

            it('Should mint no tickets', async function () {
                const [owner, addr1] = await ethers.getSigners();
                var initialBalance = await orangeStandSpentTicket.balanceOf(testAddress2);
                await orangeStandSpentTicket.addMinter(addr1.address);
                await orangeStandSpentTicket.connect(addr1).mint(testAddress2, 0);
                var balanceAfterMint = await orangeStandSpentTicket.balanceOf(testAddress2);
                expect(initialBalance).to.equal(0);
                expect(balanceAfterMint).to.equal(0);
            })
        });

        describe('burn()', function () {
            it('Should burn all tickets', async function () {
                const [owner] = await ethers.getSigners();
                const bidPrice = 1;
                await userContract.mint((await orangeStandSpentTicket.getAddress()), bidPrice);
                await orangeStandSpentTicket.addMinter(owner.address);
                await orangeStandSpentTicket.mint(testAddress3, bidPrice);
                var balanceAfterMint = await orangeStandSpentTicket.balanceOf(testAddress3);
                await orangeStandSpentTicket.burn(testAddress3, bidPrice);
                var balanceAfterBurn = await orangeStandSpentTicket.balanceOf(testAddress3);
                expect(balanceAfterMint).to.equal(bidPrice);
                expect(balanceAfterBurn).to.equal(0);
            })
        });
    });
});
