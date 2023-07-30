import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';

describe('OrangeStandTicket tests', function () {
    
    let orangeStandTicket: Contract;

    describe('OrangeStandTicket', function () {
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const testAddress1 = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
        const testAddress2 = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';
        const testAddress3 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

        if (contractAddress) {
            it('Should connect to external contract', async function () {
                orangeStandTicket = await ethers.getContractAt('OrangeStandTicket', contractAddress);
                console.log('Connected to external contract', orangeStandTicket.address);
            });
        } else {
            it('Should deploy OrangeStandTicket', async function () {
                const OrangeStandTicket = await ethers.getContractFactory('OrangeStandTicket');
                orangeStandTicket = await OrangeStandTicket.deploy()
            });
        }

        describe('mint()', function () {
            it('Should mint one ticket', async function () {
                var initialBalance = await orangeStandTicket.balanceOf(testAddress1);
                await orangeStandTicket.mint(testAddress1, 1);
                var balanceAfterMint = await orangeStandTicket.balanceOf(testAddress1);
                expect(initialBalance).to.equal(0);
                expect(balanceAfterMint).to.equal(1);
            })

            it('Should mint no tickets', async function () {
                var initialBalance = await orangeStandTicket.balanceOf(testAddress2);
                await orangeStandTicket.mint(testAddress2, 0);
                var balanceAfterMint = await orangeStandTicket.balanceOf(testAddress2);
                expect(initialBalance).to.equal(0);
                expect(balanceAfterMint).to.equal(0);
            })
        });

        describe('burn()', function () {
            it('Should burn all tickets', async function () {
                const [owner] = await ethers.getSigners();
                await orangeStandTicket.addBurner(owner.address);
                await orangeStandTicket.mint(testAddress3, 1);
                var balanceAfterMint = await orangeStandTicket.balanceOf(testAddress3);
                await orangeStandTicket.burn(testAddress3, 1);
                var balanceAfterBurn = await orangeStandTicket.balanceOf(testAddress3);
                expect(balanceAfterMint).to.equal(1);
                expect(balanceAfterBurn).to.equal(0);
            })
        });
    });
});
