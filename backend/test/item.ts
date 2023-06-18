import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';

describe('Item tests', function () {
    
    let item: Contract;

    describe('Item', function () {
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const itemId = 3;
        const testAddress1 = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
        const testAddress2 = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';

        if (contractAddress) {
            it('Should connect to external contract', async function () {
                item = await ethers.getContractAt('Item', contractAddress);
                console.log('Connected to external contract', item.address);
            });
        } else {
            it('Should deploy Item', async function () {
                const Item = await ethers.getContractFactory('Item');
                item = await Item.deploy()
            });
        }

        describe('getItem()', function () {
            it('Should get an empty item', async function () {
                const Item = await ethers.getContractFactory('Item');
                item = await Item.deploy()
                var result = await item.getItem(1);
                expect(result).to.equal('0x0000000000000000000000000000000000000000');
            })

            it('Should get ERC20 item', async function () {
                const Item = await ethers.getContractFactory('Item');
                item = await Item.deploy()
                const SingleErc20Item = await ethers.getContractFactory('SingleErc20Item');
                var itemQuantity = 10;
                await item.addErc20(testAddress1, itemQuantity);
                
                var result = await item.getItem(1);
                var tokenItem = await SingleErc20Item.attach(result);
                var tokenAddress = await tokenItem.getTokenAddress();
                var tokenQuantity = await tokenItem.getQuantity();

                expect(tokenAddress).to.equal(testAddress1);
                expect(tokenQuantity).to.equal(itemQuantity);
            })

            it('Should get ERC721 item', async function () {
                const Item = await ethers.getContractFactory('Item');
                item = await Item.deploy()
                const SingleErc721Item = await ethers.getContractFactory('SingleErc721Item');
                var tokenNum = 1;
                await item.addErc721(testAddress2, tokenNum);

                var result = await item.getItem(1);
                var tokenItem = await SingleErc721Item.attach(result);
                var tokenAddress = await tokenItem.getTokenAddress();
                var tokenId = await tokenItem.getTokenId();

                expect(tokenAddress).to.equal(testAddress2);
                expect(tokenId).to.equal(tokenNum);
            })
        });

        describe('addErc20()', function () {
            it('Should get added ERC20', async function () {
                const Item = await ethers.getContractFactory('Item');
                item = await Item.deploy()
                const SingleErc20Item = await ethers.getContractFactory('SingleErc20Item');
                var itemQuantity = 10;

                await item.addErc20(testAddress1, itemQuantity);
                var count = await item.numErc20Tokens();
                var result = await item.getErc20Item(count);
                var tokenItem = await SingleErc20Item.attach(result);
                var tokenAddress = await tokenItem.getTokenAddress();
                var tokenQuantity = await tokenItem.getQuantity();

                expect(tokenAddress).to.equal(testAddress1);
                expect(tokenQuantity).to.equal(itemQuantity);
            })

            it('Should get added ERC20 when ERC721 also added', async function () {
                const Item = await ethers.getContractFactory('Item');
                item = await Item.deploy()
                const SingleErc20Item = await ethers.getContractFactory('SingleErc20Item');
                var itemQuantity = 10;
                var tokenNum = 2;

                await item.addErc20(testAddress1, itemQuantity);
                await item.addErc721(testAddress2, tokenNum);
                var count = await item.numErc20Tokens();
                var result = await item.getErc20Item(count);
                var tokenItem = await SingleErc20Item.attach(result);
                var tokenAddress = await tokenItem.getTokenAddress();
                var tokenQuantity = await tokenItem.getQuantity();

                expect(tokenAddress).to.equal(testAddress1);
                expect(tokenQuantity).to.equal(itemQuantity);
            })

            it('Should get added ERC20 with different quantities', async function () {
                const Item = await ethers.getContractFactory('Item');
                item = await Item.deploy()
                const SingleErc20Item = await ethers.getContractFactory('SingleErc20Item');
                var itemQuantity1 = 10;
                var itemQuantity2 = 50;

                await item.addErc20(testAddress1, itemQuantity1);
                await item.addErc20(testAddress1, itemQuantity2);
                var result1 = await item.getErc20Item(1);
                var tokenItem1 = await SingleErc20Item.attach(result1);
                var tokenAddress1 = await tokenItem1.getTokenAddress();
                var tokenQuantity1 = await tokenItem1.getQuantity();
                var result2 = await item.getErc20Item(2);
                var tokenItem2 = await SingleErc20Item.attach(result2);
                var tokenAddress2 = await tokenItem2.getTokenAddress();
                var tokenQuantity2 = await tokenItem2.getQuantity();

                expect(tokenAddress1).to.equal(testAddress1);
                expect(tokenQuantity1).to.equal(itemQuantity1);
                expect(tokenAddress2).to.equal(testAddress1);
                expect(tokenQuantity2).to.equal(itemQuantity2);
            })

            it('Should get added ERC20 with different tokens', async function () {
                const Item = await ethers.getContractFactory('Item');
                item = await Item.deploy()
                const SingleErc20Item = await ethers.getContractFactory('SingleErc20Item');
                var itemQuantity1 = 10;
                var itemQuantity2 = 50;

                await item.addErc20(testAddress1, itemQuantity1);
                await item.addErc20(testAddress2, itemQuantity2);
                var result1 = await item.getErc20Item(1);
                var tokenItem1 = await SingleErc20Item.attach(result1);
                var tokenAddress1 = await tokenItem1.getTokenAddress();
                var tokenQuantity1 = await tokenItem1.getQuantity();
                var result2 = await item.getErc20Item(2);
                var tokenItem2 = await SingleErc20Item.attach(result2);
                var tokenAddress2 = await tokenItem2.getTokenAddress();
                var tokenQuantity2 = await tokenItem2.getQuantity();

                expect(tokenAddress1).to.equal(testAddress1);
                expect(tokenQuantity1).to.equal(itemQuantity1);
                expect(tokenAddress2).to.equal(testAddress2);
                expect(tokenQuantity2).to.equal(itemQuantity2);
            })
        });

        describe('addErc721()', function () {
            it('Should get added ERC721', async function () {
                const Item = await ethers.getContractFactory('Item');
                item = await Item.deploy();
                const SingleErc721Item = await ethers.getContractFactory('SingleErc721Item');
                var tokenNum = 2;

                await item.addErc721(testAddress1, tokenNum);
                var count = await item.numErc721Tokens();
                var result = await item.getErc721Item(count);
                var tokenItem = await SingleErc721Item.attach(result);
                var tokenAddress = await tokenItem.getTokenAddress();
                var tokenId = await tokenItem.getTokenId();

                expect(tokenAddress).to.equal(testAddress1);
                expect(tokenId).to.equal(tokenNum);
            })

            it('Should get added ERC721 when ERC20 also added', async function () {
                const Item = await ethers.getContractFactory('Item');
                item = await Item.deploy()
                var itemQuantity = 10;
                const SingleErc721Item = await ethers.getContractFactory('SingleErc721Item');
                var tokenNum = 2;

                await item.addErc20(testAddress2, itemQuantity);
                await item.addErc721(testAddress1, tokenNum);
                var result = await item.getErc721Item(2);
                var tokenItem = await SingleErc721Item.attach(result);
                var tokenAddress = await tokenItem.getTokenAddress();
                var tokenId = await tokenItem.getTokenId();

                expect(tokenAddress).to.equal(testAddress1);
                expect(tokenId).to.equal(tokenNum);
            })

            it('Should get added ERC721 with different token ids', async function () {
                const Item = await ethers.getContractFactory('Item');
                item = await Item.deploy()
                var tokenNum1 = 2;
                var tokenNum2 = 4;
                const SingleErc721Item = await ethers.getContractFactory('SingleErc721Item');
                
                await item.addErc721(testAddress1, tokenNum1);
                await item.addErc721(testAddress1, tokenNum2);
                var result1 = await item.getErc721Item(1);
                var tokenItem1 = await SingleErc721Item.attach(result1);
                var tokenAddress1 = await tokenItem1.getTokenAddress();
                var tokenId1 = await tokenItem1.getTokenId();
                var result2 = await item.getErc721Item(2);
                var tokenItem2 = await SingleErc721Item.attach(result2);
                var tokenAddress2 = await tokenItem2.getTokenAddress();
                var tokenId2 = await tokenItem2.getTokenId();

                expect(tokenAddress1).to.equal(testAddress1);
                expect(tokenId1).to.equal(tokenNum1);
                expect(tokenAddress2).to.equal(testAddress1);
                expect(tokenId2).to.equal(tokenNum2);
            })

            it('Should get added ERC721 with different addresses', async function () {
                const Item = await ethers.getContractFactory('Item');
                item = await Item.deploy()
                const SingleErc721Item = await ethers.getContractFactory('SingleErc721Item');
                var tokenNum1 = 2;
                var tokenNum2 = 4;

                await item.addErc721(testAddress1, tokenNum1);
                await item.addErc721(testAddress2, tokenNum2);
                var result1 = await item.getErc721Item(1);
                var tokenItem1 = await SingleErc721Item.attach(result1);
                var tokenAddress1 = await tokenItem1.getTokenAddress();
                var tokenId1 = await tokenItem1.getTokenId();
                var result2 = await item.getErc721Item(2);
                var tokenItem2 = await SingleErc721Item.attach(result2);
                var tokenAddress2 = await tokenItem2.getTokenAddress();
                var tokenId2 = await tokenItem2.getTokenId();

                expect(tokenAddress1).to.equal(testAddress1);
                expect(tokenId1).to.equal(tokenNum1);
                expect(tokenAddress2).to.equal(testAddress2);
                expect(tokenId2).to.equal(tokenNum2);
            })
        });
    });
});
