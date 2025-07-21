import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';

describe('StructuredLinkedList', function () {
    let bid: Contract;

    describe('StructuredLinkedList', function () {
        describe('listExists', function () {
            it('Get the bid price', async function () {
                const StructuredLinkedList = await ethers.getContractFactory('StructuredLinkedListMock');
                var list = await StructuredLinkedList.deploy();
                const exists = await list.listExists();
                expect(exists).be.equal(false);
            })
        });

        describe('get items back in order', function () {
            it('Get the bid price', async function () {
                const StructuredLinkedList = await ethers.getContractFactory('StructuredLinkedListMock');
                var list = await StructuredLinkedList.deploy();
                await list.pushFront(1);
                await list.pushFront(3);
                await list.pushFront(5);
                await list.pushFront(7);

                var size = await list.sizeOf();
                expect(4).be.equal(size);

                var [found_1, next_1, prev_1] = await list.getNode(1);
                var [found_3, next_3, prev_3] = await list.getNode(3);
                var [found_5, next_5, prev_5] = await list.getNode(5);
                var [found_7, next_7, prev_7] = await list.getNode(7);
                var [found_9, next_9, prev_9] = await list.getNode(9);
                expect(found_1).be.equal(true);
                expect(next_1).be.equal(3);
                expect(prev_1).be.equal(0);

                expect(found_3).be.equal(true);
                expect(next_3).be.equal(5);
                expect(prev_3).be.equal(1);

                expect(found_5).be.equal(true);
                expect(next_5).be.equal(7);
                expect(prev_5).be.equal(3);

                expect(found_7).be.equal(true);
                expect(next_7).be.equal(0);
                expect(prev_7).be.equal(5);

                expect(found_9).be.equal(false);
                expect(next_9).be.equal(0);
                expect(prev_9).be.equal(0);
            })

            it('getNodesInNthAnchor', async function () {
                const StructuredLinkedList = await ethers.getContractFactory('StructuredLinkedListMock');
                var list = await StructuredLinkedList.deploy();
                await list.pushFront(1);
                await list.pushFront(3);
                await list.pushFront(5);
                await list.pushFront(7);

                var size = await list.sizeOf();
                expect(4).be.equal(size);

                var vals = await list.getNodesInNthAnchor(0, 0);
                expect(4).be.equal(vals.length);
                await list.pushFront(9);
                await list.pushFront(11);
                await list.pushFront(13);
                await list.pushFront(15);
                await list.pushFront(17);
                await list.pushFront(19);

                await list.pushFront(21);
                await list.pushFront(23);
                await list.pushFront(25);
                await list.pushFront(27);
                await list.pushFront(29);
                await list.pushFront(31);
                await list.pushFront(33);
                await list.pushFront(35);
                await list.pushFront(37);
                await list.pushFront(39);

                await list.pushFront(41);

                const vals3 = await list.getNodesInNthAnchor(0, 0);
                const vals4 = await list.getNodesInNthAnchor(0, 1);
                const vals5 = await list.getNodesInNthAnchor(0, 2);
                expect(10).be.equal(vals3.length);
                expect(10).be.equal(vals4.length);
                expect(1).be.equal(vals5.length);
                expect(41).be.equal(vals3[0]);
                expect(39).be.equal(vals3[1]);
                expect(37).be.equal(vals3[2]);
                expect(35).be.equal(vals3[3]);
                expect(33).be.equal(vals3[4]);
                expect(31).be.equal(vals3[5]);
                expect(29).be.equal(vals3[6]);
                expect(27).be.equal(vals3[7]);
                expect(25).be.equal(vals3[8]);
                expect(23).be.equal(vals3[9]);

                expect(21).be.equal(vals4[0]);
                expect(19).be.equal(vals4[1]);
                expect(17).be.equal(vals4[2]);
                expect(15).be.equal(vals4[3]);
                expect(13).be.equal(vals4[4]);
                expect(11).be.equal(vals4[5]);
                expect(9).be.equal(vals4[6]);
                expect(7).be.equal(vals4[7]);
                expect(5).be.equal(vals4[8]);
                expect(3).be.equal(vals4[9]);

                expect(1).be.equal(vals5[0]);
            })

            it('getNodesInNthAnchor when single item inserted', async function () {
                const StructuredLinkedList = await ethers.getContractFactory('StructuredLinkedListMock');
                var list = await StructuredLinkedList.deploy();
                await list.pushFront(1);
                
                var vals = await list.getNodesInNthAnchor(0, 0);
                expect(1).be.equal(vals[0]);
            })
        });
    });
});
