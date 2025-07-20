import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';

// Typescript

describe('Item', function () {
    let item: Contract;
    let owner: any;
    let nonOwner: any;
    const testAddress1 = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
    const testAddress2 = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';

    beforeEach(async function () {
        [owner, nonOwner] = await ethers.getSigners();
        const Item = await ethers.getContractFactory('Item');
        item = await Item.deploy();
    });

    describe('Deployment', function () {
        it('Owner should be deployer', async function () {
            expect(await item.owner()).to.equal(owner.address);
        });
    });

    describe('ERC20 Functionality', function () {
        it('Should add and retrieve ERC20 token', async function () {
            const SingleErc20Item = await ethers.getContractFactory('SingleErc20Item');
            const quantity = 100;
            await item.addErc20(testAddress1, quantity);
            const count = await item.numErc20Tokens();
            expect(count).to.equal(1);
            const result = await item.getErc20Item(1);
            const tokenItem = await SingleErc20Item.attach(result);
            expect(await tokenItem.getTokenAddress()).to.equal(testAddress1);
            expect(await tokenItem.getQuantity()).to.equal(quantity);
        });

        it('Should add multiple ERC20 tokens with same address, different quantities', async function () {
            const SingleErc20Item = await ethers.getContractFactory('SingleErc20Item');
            await item.addErc20(testAddress1, 10);
            await item.addErc20(testAddress1, 20);
            expect(await item.numErc20Tokens()).to.equal(2);
            const tokenItem1 = await SingleErc20Item.attach(await item.getErc20Item(1));
            const tokenItem2 = await SingleErc20Item.attach(await item.getErc20Item(2));
            expect(await tokenItem1.getQuantity()).to.equal(10);
            expect(await tokenItem2.getQuantity()).to.equal(20);
        });

        it('Should add multiple ERC20 tokens with different addresses', async function () {
            const SingleErc20Item = await ethers.getContractFactory('SingleErc20Item');
            await item.addErc20(testAddress1, 10);
            await item.addErc20(testAddress2, 30);
            expect(await item.numErc20Tokens()).to.equal(2);
            const tokenItem1 = await SingleErc20Item.attach(await item.getErc20Item(1));
            const tokenItem2 = await SingleErc20Item.attach(await item.getErc20Item(2));
            expect(await tokenItem1.getTokenAddress()).to.equal(testAddress1);
            expect(await tokenItem2.getTokenAddress()).to.equal(testAddress2);
        });

        it('Should get ERC20 item via getItem', async function () {
            const SingleErc20Item = await ethers.getContractFactory('SingleErc20Item');
            await item.addErc20(testAddress1, 50);
            const result = await item.getItem(1);
            const tokenItem = await SingleErc20Item.attach(result);
            expect(await tokenItem.getTokenAddress()).to.equal(testAddress1);
            expect(await tokenItem.getQuantity()).to.equal(50);
        });

        it('Only owner can add ERC20 tokens', async function () {
            await expect(item.connect(nonOwner).addErc20(testAddress1, 10)).to.be.reverted;
        });
    });

    describe('ERC721 Functionality', function () {
        it('Should add and retrieve ERC721 token', async function () {
            const SingleErc721Item = await ethers.getContractFactory('SingleErc721Item');
            await item.addErc721(testAddress2, 5);
            expect(await item.numErc721Tokens()).to.equal(1);
            const result = await item.getErc721Item(1);
            const tokenItem = await SingleErc721Item.attach(result);
            expect(await tokenItem.getTokenAddress()).to.equal(testAddress2);
            expect(await tokenItem.getTokenId()).to.equal(5);
        });

        it('Should add multiple ERC721 tokens with same address, different ids', async function () {
            const SingleErc721Item = await ethers.getContractFactory('SingleErc721Item');
            await item.addErc721(testAddress2, 1);
            await item.addErc721(testAddress2, 2);
            expect(await item.numErc721Tokens()).to.equal(2);
            const tokenItem1 = await SingleErc721Item.attach(await item.getErc721Item(1));
            const tokenItem2 = await SingleErc721Item.attach(await item.getErc721Item(2));
            expect(await tokenItem1.getTokenId()).to.equal(1);
            expect(await tokenItem2.getTokenId()).to.equal(2);
        });

        it('Should add multiple ERC721 tokens with different addresses', async function () {
            const SingleErc721Item = await ethers.getContractFactory('SingleErc721Item');
            await item.addErc721(testAddress1, 10);
            await item.addErc721(testAddress2, 20);
            expect(await item.numErc721Tokens()).to.equal(2);
            const tokenItem1 = await SingleErc721Item.attach(await item.getErc721Item(1));
            const tokenItem2 = await SingleErc721Item.attach(await item.getErc721Item(2));
            expect(await tokenItem1.getTokenAddress()).to.equal(testAddress1);
            expect(await tokenItem2.getTokenAddress()).to.equal(testAddress2);
        });

        it('Should get ERC721 item via getItem', async function () {
            const SingleErc721Item = await ethers.getContractFactory('SingleErc721Item');
            await item.addErc721(testAddress2, 99);
            const result = await item.getItem(1);
            const tokenItem = await SingleErc721Item.attach(result);
            expect(await tokenItem.getTokenAddress()).to.equal(testAddress2);
            expect(await tokenItem.getTokenId()).to.equal(99);
        });

        it('Only owner can add ERC721 tokens', async function () {
            await expect(item.connect(nonOwner).addErc721(testAddress2, 1)).to.be.reverted;
        });
    });

    describe('Empty/Invalid Retrieval', function () {
        it('getItem returns zero address for non-existent id', async function () {
            expect(await item.getItem(999)).to.equal('0x0000000000000000000000000000000000000000');
        });

        it('getErc20Item returns zero address for non-existent id', async function () {
            expect(await item.getErc20Item(999)).to.equal('0x0000000000000000000000000000000000000000');
        });

        it('getErc721Item returns zero address for non-existent id', async function () {
            expect(await item.getErc721Item(999)).to.equal('0x0000000000000000000000000000000000000000');
        });
    });

    describe('SingleErc20Item Contract', function () {
        it('Should deploy and return correct address and quantity', async function () {
            const SingleErc20Item = await ethers.getContractFactory('SingleErc20Item');
            const address = testAddress1;
            const quantity = 123;
            const singleErc20Item = await SingleErc20Item.deploy(address, quantity);
            expect(await singleErc20Item.getTokenAddress()).to.equal(address);
            expect(await singleErc20Item.getQuantity()).to.equal(quantity);
        });
    });

    describe('SingleErc721Item Contract', function () {
        it('Should deploy and return correct address and id', async function () {
            const SingleErc721Item = await ethers.getContractFactory('SingleErc721Item');
            const address = testAddress2;
            const id = 456;
            const singleErc721Item = await SingleErc721Item.deploy(address, id);
            expect(await singleErc721Item.getTokenAddress()).to.equal(address);
            expect(await singleErc721Item.getTokenId()).to.equal(id);
        });
    });
});