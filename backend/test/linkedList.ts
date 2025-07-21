import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';

describe('LinkedList tests', function () {
    
    let linkedList: Contract;
    
    describe('LinkedList', function () {
        const contractAddress = process.env.CONTRACT_ADDRESS;
        //const itemId = 3;
        //const testAddress1 = '0xE5C1E03225Af47391E51b79D6D149987cde5B222';
        //const testAddress2 = '0xD336C41f8b1494a7289D39d8De4aADB3792d8515';

        

        async function setup(){
            if (contractAddress) {
                linkedList = await ethers.getContractAt('LinkedList', contractAddress);
                console.log('Connected to external contract', linkedList.address);
            } else {
                const LinkedList = await ethers.getContractFactory('LinkedList');
                linkedList = await LinkedList.deploy()
            }
        }

        describe('addNode', function () {
            it('Should add single item', async function () {})
            it('Should add multiple items', async function () {})
            /*it('Should add one item', async function () {
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
            })*/
        });

        describe('removeNode()', function () {
            it('Should remove single item', async function () {})
            it('Should remove multiple items', async function () {})
        });

        describe('updateNodeData()', function () {
            it('Should update first item', async function () {})
            it('Should update last item', async function () {})
            it('Should update item in middle of list', async function () {})
        });

        describe('getNode()', function () {
            it('Should get first item', async function () {})
            it('Should get last item', async function () {})
            it('Should get item in middle of list', async function () {})
        });

        describe('getNodesInNthAnchor()', function () {
            it('Should get items where there are fewer items than anchor size in list', async function () {})
            it('Should get last item', async function () {})
            it('Should get item in middle of list', async function () {})
        });
    })
});
