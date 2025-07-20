import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';

describe('OrangeStandTicket', function () {
    let orangeStandTicket: Contract;
    let spentTicket: Contract;
    let userContract: Contract;
    let owner: any;
    let addr1: any;
    let addr2: any;
    let addr3: any;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
        const CollectionErc20 = await ethers.getContractFactory('CollectionErc20');
        userContract = await CollectionErc20.deploy("usdTCollection", "USDT", 8);
        const OrangeStandSpentTicket = await ethers.getContractFactory('OrangeStandSpentTicket');
        spentTicket = await OrangeStandSpentTicket.deploy(await userContract.getAddress());
        const OrangeStandTicket = await ethers.getContractFactory('OrangeStandTicket');
        orangeStandTicket = await OrangeStandTicket.deploy(await userContract.getAddress(), await spentTicket.getAddress());
    });

    describe('Deployment', function () {
        it('Should set correct owner', async function () {
            expect(await orangeStandTicket.owner()).to.equal(owner.address);
        });

        it('Should set correct user contract and spent ticket addresses', async function () {
            // These are private, but we can check via constructor args
            // Or test via decimals() override
            expect(await orangeStandTicket.decimals()).to.equal(await userContract.decimals());
        });
    });

    describe('Roles', function () {
        it('Owner can add burner', async function () {
            await orangeStandTicket.addBurner(addr1.address);
            expect(await orangeStandTicket.hasRole(await orangeStandTicket.BURNER_ROLE(), addr1.address)).to.be.true;
        });

        it('Non-owner cannot add burner', async function () {
            await expect(orangeStandTicket.connect(addr2).addBurner(addr3.address)).to.be.reverted;
        });
    });

    describe('mint()', function () {
        it('Should mint tickets and emit event', async function () {
            let bidPrice = 5;
            await userContract.mint(addr1.address, bidPrice);
            await userContract.connect(addr1).approve(await orangeStandTicket.getAddress(), bidPrice);

            await expect(orangeStandTicket.mint(addr1.address, bidPrice))
                .to.emit(orangeStandTicket, "TicketIssued")
                .withArgs(addr1.address, bidPrice, await ethers.provider.getBlockNumber() + 1);

            expect(await orangeStandTicket.balanceOf(addr1.address)).to.equal(bidPrice);
        });

        it('Should mint zero tickets and emit event', async function () {
            await expect(orangeStandTicket.mint(addr2.address, 0))
                .to.emit(orangeStandTicket, "TicketIssued")
                .withArgs(addr2.address, 0, await ethers.provider.getBlockNumber() + 1);

            expect(await orangeStandTicket.balanceOf(addr2.address)).to.equal(0);
        });

        it('Only owner can mint tokens', async function () {
            await expect(orangeStandTicket.connect(addr2).mint(addr1.address, 1)).to.be.reverted;
        });

        it('Should transfer payment to spentTicket contract', async function () {
            let bidPrice = 3;
            await userContract.mint(addr1.address, bidPrice);
            await userContract.connect(addr1).approve(await orangeStandTicket.getAddress(), bidPrice);

            await orangeStandTicket.mint(addr1.address, bidPrice);

            expect(await userContract.balanceOf(await spentTicket.getAddress())).to.equal(bidPrice);
        });
    });

    describe('burn()', function () {
        it('Should burn tickets if caller has burner role', async function () {
            let bidPrice = 2;
            await orangeStandTicket.addBurner(owner.address);
            await userContract.mint(addr3.address, bidPrice);
            await userContract.connect(addr3).approve(await orangeStandTicket.getAddress(), bidPrice);
            await orangeStandTicket.mint(addr3.address, bidPrice);

            expect(await orangeStandTicket.balanceOf(addr3.address)).to.equal(bidPrice);

            await orangeStandTicket.burn(addr3.address, bidPrice);

            expect(await orangeStandTicket.balanceOf(addr3.address)).to.equal(0);
        });

        it('Should revert burn if caller does not have burner role', async function () {
            let bidPrice = 1;
            await userContract.mint(addr2.address, bidPrice);
            await userContract.connect(addr2).approve(await orangeStandTicket.getAddress(), bidPrice);
            await orangeStandTicket.mint(addr2.address, bidPrice);

            await expect(orangeStandTicket.connect(addr2).burn(addr2.address, bidPrice)).to.be.revertedWith("Caller is not a burner");
        });
    });

    describe('decimals()', function () {
        it('Should return decimals from user contract', async function () {
            expect(await orangeStandTicket.decimals()).to.equal(await userContract.decimals());
        });
    });

    describe('ERC20 Standard Compliance', function () {
        it('Should return name and symbol', async function () {
            expect(await orangeStandTicket.name()).to.equal('OrangeStandTicket');
            expect(await orangeStandTicket.symbol()).to.equal('OSTI');
        });

        it('Should allow transfer between accounts', async function () {
            let bidPrice = 4;
            await userContract.mint(addr1.address, bidPrice);
            await userContract.connect(addr1).approve(await orangeStandTicket.getAddress(), bidPrice);
            await orangeStandTicket.mint(addr1.address, bidPrice);

            await orangeStandTicket.connect(addr1).transfer(addr2.address, 2);
            expect(await orangeStandTicket.balanceOf(addr1.address)).to.equal(2);
            expect(await orangeStandTicket.balanceOf(addr2.address)).to.equal(2);
        });

        it('Should allow approve and transferFrom', async function () {
            let bidPrice = 6;
            await userContract.mint(addr1.address, bidPrice);
            await userContract.connect(addr1).approve(await orangeStandTicket.getAddress(), bidPrice);
            await orangeStandTicket.mint(addr1.address, bidPrice);

            await orangeStandTicket.connect(addr1).approve(addr2.address, 3);
            await orangeStandTicket.connect(addr2).transferFrom(addr1.address, addr3.address, 3);

            expect(await orangeStandTicket.balanceOf(addr1.address)).to.equal(3);
            expect(await orangeStandTicket.balanceOf(addr3.address)).to.equal(3);
        });
    });
});