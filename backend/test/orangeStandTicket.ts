import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';

describe('OrangeStandTicket tests', function () {
    
    let orangeStandTicket: Contract;
    let userContract: Contract;

    describe('OrangeStandTicket', function () {
        const contractAddress = process.env.CONTRACT_ADDRESS;

        if (contractAddress) {
            it('Should connect to external contract', async function () {
                orangeStandTicket = await ethers.getContractAt('OrangeStandTicket', contractAddress);
                console.log('Connected to external contract', orangeStandTicket.address);
            });
        } else {
            it('Should deploy OrangeStandTicket', async function () {
                const OrangeStandSpentTicket = await ethers.getContractFactory('OrangeStandSpentTicket');
                const CollectionErc20 = await ethers.getContractFactory('CollectionErc20');
                userContract = await CollectionErc20.deploy("usdTCollection", "USDT");
                const orangeStandSpentTicket = await OrangeStandSpentTicket.deploy(await userContract.getAddress());
                const OrangeStandTicket = await ethers.getContractFactory('OrangeStandTicket');
                orangeStandTicket = await OrangeStandTicket.deploy(await userContract.getAddress(), await orangeStandSpentTicket.getAddress());
            });
        }

        describe('mint()', function () {
            it('Should mint one ticket', async function () {
                const [owner, addr1] = await ethers.getSigners();
                var initialBalance = await orangeStandTicket.balanceOf(addr1.address);
                let bidPrice = 1;
                await userContract.mint(addr1.address, bidPrice);
                await userContract.connect(addr1).approve(await orangeStandTicket.getAddress(), bidPrice);
                await orangeStandTicket.mint(addr1.address, bidPrice);
                var balanceAfterMint = await orangeStandTicket.balanceOf(addr1.address);
                expect(initialBalance).to.equal(0);
                expect(balanceAfterMint).to.equal(1);
            })

            it('Should mint no tickets', async function () {
                const [owner, addr1, addr2] = await ethers.getSigners();
                var initialBalance = await orangeStandTicket.balanceOf(addr2.address);
                await orangeStandTicket.mint(addr2.address, 0);
                var balanceAfterMint = await orangeStandTicket.balanceOf(addr2.address);
                expect(initialBalance).to.equal(0);
                expect(balanceAfterMint).to.equal(0);
            })

            it('Only owner can mint tokens', async function () {
                const [_, addr1, nonOwnerCaller] = await ethers.getSigners();
                await expect(orangeStandTicket.connect(nonOwnerCaller).mint(addr1.address, 1)).to.be.reverted;
            })
        });

        describe('burn()', function () {
            it('Should burn all tickets', async function () {
                const [owner, addr1, addr2, addr3] = await ethers.getSigners();
                await orangeStandTicket.addBurner(owner.address);
                let bidPrice = 1;
                await userContract.mint(addr3.address, bidPrice);
                await userContract.connect(addr3).approve(await orangeStandTicket.getAddress(), bidPrice);
                await orangeStandTicket.mint(addr3.address, 1);
                var balanceAfterMint = await orangeStandTicket.balanceOf(addr3.address);
                await orangeStandTicket.burn(addr3.address, 1);
                var balanceAfterBurn = await orangeStandTicket.balanceOf(addr3.address);
                expect(balanceAfterMint).to.equal(1);
                expect(balanceAfterBurn).to.equal(0);
            })
        });
    });
});
