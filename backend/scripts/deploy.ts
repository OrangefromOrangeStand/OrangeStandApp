import { ethers } from "hardhat";
import { writeFileSync, promises as fsPromises } from 'fs';

import * as auctionCoordinatorAbi from '../artifacts/contracts/AuctionCoordinator.sol/AuctionCoordinator.json';
import * as auctionAbi from '../artifacts/contracts/Auction.sol/Auction.json';
import * as bidAbi from '../artifacts/contracts/Bid.sol/Bid.json';
import * as itemAbi from '../artifacts/contracts/Item.sol/Item.json';
import * as singleErc20ItemAbi from '../artifacts/contracts/Item.sol/SingleErc20Item.json';
import * as singleErc721ItemAbi from '../artifacts/contracts/Item.sol/SingleErc721Item.json';
import * as orangeStandTicketAbi from '../artifacts/contracts/OrangeStandTicket.sol/OrangeStandTicket.json';
import * as orangeStandSpentTicketAbi from '../artifacts/contracts/OrangeStandSpentTicket.sol/OrangeStandSpentTicket.json';
import * as localCollectionAbi from '../artifacts/contracts/LocalCollectible.sol/LocalCollectible.json';
import * as collectionTokenAbi from '../artifacts/contracts/CollectionToken.sol/CollectionToken.json';
import * as collectionErc20Abi from '../artifacts/contracts/CollectionErc20.sol/CollectionErc20.json';
import * as simTokenAbi from '../artifacts/contracts/SimulationToken.sol/SimulationToken.json';
import * as erc721Abi from '../artifacts/@openzeppelin/contracts/token/ERC721/ERC721.sol/ERC721.json';
import * as erc20Abi from '../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json';

async function main() {
    var treasuryAddress = '0x119117fb67285be332c3511E52b25441172cf129';
    var deploymentAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    var testingAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
    const [deployer, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
  
    const OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
    const orangeStandTicket = await OrangeStandTicket.deploy();
    orangeStandTicket.mint(deploymentAddress, "15000000000000000000");
    orangeStandTicket.mint(testingAddress, "10000000000000000000");

    orangeStandTicket.mint(addr1.address, "10000000000000000000");
    orangeStandTicket.mint(addr2.address, "10000000000000000000");
    orangeStandTicket.mint(addr3.address, "10000000000000000000");
    orangeStandTicket.mint(addr4.address, "10000000000000000000");
    orangeStandTicket.mint(addr5.address, "10000000000000000000");

//    let oldOrangeStandOwner = await orangeStandTicket.owner();
//    console.log("Old OrangeStand owner:", oldOrangeStandOwner);

    const OrangeStandSpentTicket = await ethers.getContractFactory("OrangeStandSpentTicket");
    const orangeStandSpentTicket = await OrangeStandSpentTicket.deploy();
  
    const AuctionCoordinator = await ethers.getContractFactory("AuctionCoordinator");
    const auctionCoordinator = await AuctionCoordinator.deploy(await orangeStandTicket.getAddress(), 
      treasuryAddress, await orangeStandSpentTicket.getAddress());
    console.log("AuctionCoordinator deployed to:", (await auctionCoordinator.getAddress()));

    await orangeStandTicket.transferOwnership((await auctionCoordinator.getAddress()));
    let auctionCoordinatorContents = JSON.stringify(auctionCoordinatorAbi.abi);
    writeFileSync("../webapp/src/abi/AuctionCoordinator.tsx", "export const AuctionCoordinator = " + auctionCoordinatorContents);
//    let orangeStandOwner = await orangeStandTicket.owner();
//    console.log("New OrangeStand owner:", orangeStandOwner);
  
    let auctionContents = JSON.stringify(auctionAbi.abi);
    writeFileSync("../webapp/src/abi/Auction.tsx", "export const Auction = " + auctionContents);
    let bidContents = JSON.stringify(bidAbi.abi);
    writeFileSync("../webapp/src/abi/Bid.tsx", "export const Bid = " + bidContents);
    let itemContents = JSON.stringify(itemAbi.abi);
    writeFileSync("../webapp/src/abi/Item.tsx", "export const Item = " + itemContents);

    let singleErc20ItemContents = JSON.stringify(singleErc20ItemAbi.abi);
    writeFileSync("../webapp/src/abi/SingleErc20Item.tsx", "export const SingleErc20Item = " + singleErc20ItemContents);
    let singleErc721ItemContents = JSON.stringify(singleErc721ItemAbi.abi);
    writeFileSync("../webapp/src/abi/SingleErc721Item.tsx", "export const SingleErc721Item = " + singleErc721ItemContents);
  
    const LocalCollectible = await ethers.getContractFactory("LocalCollectible");
    const token = await LocalCollectible.deploy();
    console.log("LocalCollectible deployed to:", (await token.getAddress()));
    let yourCollectionContents = JSON.stringify(localCollectionAbi.abi);
    writeFileSync("../webapp/src/abi/LocalCollectible.tsx", "export const LocalCollectible = " + yourCollectionContents);

    const Collection1Collectible = await ethers.getContractFactory("CollectionToken");
    const collection1Token = await Collection1Collectible.deploy("Collection1", "CLT1");
    console.log("Collection1Collectible deployed to:", (await collection1Token.getAddress()));
    let collection1Contents = JSON.stringify(collectionTokenAbi.abi);
    writeFileSync("../webapp/src/abi/Collection1.tsx", "export const Collection1 = " + collection1Contents);
    const Collection2Collectible = await ethers.getContractFactory("CollectionToken");
    const collection2Token = await Collection2Collectible.deploy("Collection2", "CLT2");
    console.log("Collection2Collectible deployed to:", (await collection2Token.getAddress()));
    let collection2Contents = JSON.stringify(collectionTokenAbi.abi);
    writeFileSync("../webapp/src/abi/Collection2.tsx", "export const Collection2 = " + collection2Contents);
    const Collection3Collectible = await ethers.getContractFactory("CollectionToken");
    const collection3Token = await Collection3Collectible.deploy("Collection3", "CLT3");
    console.log("Collection3Collectible deployed to:", (await collection3Token.getAddress()));
    let collection3Contents = JSON.stringify(collectionTokenAbi.abi);
    writeFileSync("../webapp/src/abi/Collection3.tsx", "export const Collection3 = " + collection3Contents);
    const Collection4Collectible = await ethers.getContractFactory("CollectionToken");
    const collection4Token = await Collection4Collectible.deploy("Collection4", "CLT4");
    console.log("Collection4Collectible deployed to:", (await collection4Token.getAddress()));
    let collection4Contents = JSON.stringify(collectionTokenAbi.abi);
    writeFileSync("../webapp/src/abi/Collection4.tsx", "export const Collection4 = " + collection4Contents);
    const Collection5Collectible = await ethers.getContractFactory("CollectionToken");
    const collection5Token = await Collection5Collectible.deploy("Collection5", "CLT5");
    console.log("Collection5Collectible deployed to:", (await collection5Token.getAddress()));
    let collection5Contents = JSON.stringify(collectionTokenAbi.abi);
    writeFileSync("../webapp/src/abi/Collection5.tsx", "export const Collection5 = " + collection5Contents);
    const Collection6Collectible = await ethers.getContractFactory("CollectionToken");
    const collection6Token = await Collection6Collectible.deploy("Collection6", "CLT6");
    console.log("Collection6Collectible deployed to:", (await collection6Token.getAddress()));
    let collection6Contents = JSON.stringify(collectionTokenAbi.abi);
    writeFileSync("../webapp/src/abi/Collection6.tsx", "export const Collection6 = " + collection6Contents);
  
    const CollectionErc20 = await ethers.getContractFactory("CollectionErc20");
    const collection1Erc20 = await CollectionErc20.deploy("Collection1Erc20", "COL1");
    console.log("ERC20 Coll 1 deployed to:", (await collection1Erc20.getAddress()));
    let collection1Erc20Contents = JSON.stringify(collectionErc20Abi.abi);
    writeFileSync("../webapp/src/abi/Collection1Erc20.tsx", "export const Collection1Erc20 = " + collection1Erc20Contents);  
    collection1Erc20.mint(deployer.address, "10000000000000000000");
    const collection2Erc20 = await CollectionErc20.deploy("Collection2Erc20", "COL2");
    console.log("ERC20 Coll 2 deployed to:", (await collection2Erc20.getAddress()));
    let collection2Erc20Contents = JSON.stringify(collectionErc20Abi.abi);
    writeFileSync("../webapp/src/abi/Collection2Erc20.tsx", "export const Collection2Erc20 = " + collection2Erc20Contents);  
    collection2Erc20.mint(deployer.address, "10000000000000000000");
    const collection3Erc20 = await CollectionErc20.deploy("Collection3Erc20", "COL3");
    console.log("ERC20 Coll 3 deployed to:", (await collection3Erc20.getAddress()));
    let collection3Erc20Contents = JSON.stringify(collectionErc20Abi.abi);
    writeFileSync("../webapp/src/abi/Collection3Erc20.tsx", "export const Collection3Erc20 = " + collection3Erc20Contents);  
    collection3Erc20.mint(deployer.address, "10000000000000000000");
    const collection4Erc20 = await CollectionErc20.deploy("Collection4Erc20", "COL4");
    console.log("ERC20 Coll 4 deployed to:", (await collection4Erc20.getAddress()));
    let collection4Erc20Contents = JSON.stringify(collectionErc20Abi.abi);
    writeFileSync("../webapp/src/abi/Collection4Erc20.tsx", "export const Collection4Erc20 = " + collection4Erc20Contents);  
    collection4Erc20.mint(deployer.address, "10000000000000000000");
    const collection5Erc20 = await CollectionErc20.deploy("Collection5Erc20", "COL5");
    console.log("ERC20 Coll 5 deployed to:", (await collection5Erc20.getAddress()));
    let collection5Erc20Contents = JSON.stringify(collectionErc20Abi.abi);
    writeFileSync("../webapp/src/abi/Collection5Erc20.tsx", "export const Collection5Erc20 = " + collection5Erc20Contents);  
    collection5Erc20.mint(deployer.address, "10000000000000000000");
    const collection6Erc20 = await CollectionErc20.deploy("Collection6Erc20", "COL6");
    console.log("ERC20 Coll 6 deployed to:", (await collection6Erc20.getAddress()));
    let collection6Erc20Contents = JSON.stringify(collectionErc20Abi.abi);
    writeFileSync("../webapp/src/abi/Collection6Erc20.tsx", "export const Collection6Erc20 = " + collection6Erc20Contents);  
    collection6Erc20.mint(deployer.address, "10000000000000000000");

    const SimulationToken = await ethers.getContractFactory("SimulationToken");
    const simToken = await SimulationToken.deploy();
    console.log("SimToken deployed to:", (await simToken.getAddress()));
    let simTokenContents = JSON.stringify(simTokenAbi.abi);
    writeFileSync("../webapp/src/abi/SimulationToken.tsx", "export const SimulationToken = " + simTokenContents);  
    simToken.mint(deployer.address, "10000000000000000000");
    
    console.log("OrangeStandTicket deployed to:", (await orangeStandTicket.getAddress()));
    let orangeStandTicketContents = JSON.stringify(orangeStandTicketAbi.abi);
    writeFileSync("../webapp/src/abi/OrangeStandTicket.tsx", "export const OrangeStandTicket = " + orangeStandTicketContents);

    console.log("OrangeStandSpentTicket deployed to:", (await orangeStandSpentTicket.getAddress()));
    await orangeStandSpentTicket.transferOwnership((await auctionCoordinator.getAddress()));
    let orangeStandSpentTicketContents = JSON.stringify(orangeStandSpentTicketAbi.abi);
    writeFileSync("../webapp/src/abi/OrangeStandSpentTicket.tsx", "export const OrangeStandSpentTicket = " + orangeStandSpentTicketContents);

    let data = '{"auctionCoordinator":"'+(await auctionCoordinator.getAddress())
        +'",\n"tokenAddress":"'+(await token.getAddress())
        +'",\n"collection1Address":"'+(await collection1Token.getAddress())
        +'",\n"collection2Address":"'+(await collection2Token.getAddress())
        +'",\n"collection3Address":"'+(await collection3Token.getAddress())
        +'",\n"collection4Address":"'+(await collection4Token.getAddress())
        +'",\n"collection5Address":"'+(await collection5Token.getAddress())
        +'",\n"collection6Address":"'+(await collection6Token.getAddress())
        +'",\n"orangeStandTicketAddress":"'+(await orangeStandTicket.getAddress())
        +'",\n"orangeStandSpentTicketAddress":"'+(await orangeStandSpentTicket.getAddress())
        +'",\n"collection1Erc20Address":"'+(await collection1Erc20.getAddress())
        +'",\n"collection2Erc20Address":"'+(await collection2Erc20.getAddress())
        +'",\n"collection3Erc20Address":"'+(await collection3Erc20.getAddress())
        +'",\n"collection4Erc20Address":"'+(await collection4Erc20.getAddress())
        +'",\n"collection5Erc20Address":"'+(await collection5Erc20.getAddress())
        +'",\n"collection6Erc20Address":"'+(await collection6Erc20.getAddress())
        +'",\n"simTokenAddress":"'+(await simToken.getAddress())+'"}';
    writeFileSync("../webapp/public/deployed_contracts.json", data);
  
    let erc20Contracts = '{'
      +'"SIM":"'+(await simToken.getAddress())+'",'
      +'"COL1":"'+(await collection1Erc20.getAddress())+'",'
      +'"COL2":"'+(await collection2Erc20.getAddress())+'",'
      +'"COL3":"'+(await collection3Erc20.getAddress())+'",'
      +'"COL4":"'+(await collection4Erc20.getAddress())+'",'
      +'"COL5":"'+(await collection5Erc20.getAddress())+'",'
      +'"COL6":"'+(await collection6Erc20.getAddress())+'"'
    +'}';
    writeFileSync("../webapp/public/erc20tokens.json", erc20Contracts);
  
    let erc721Contracts = '{"BRD":"'+(await token.getAddress())+'"}';
    writeFileSync("../webapp/public/erc721tokens.json", erc721Contracts);  
    simToken.mint(deploymentAddress, "10000000000000000000");
    collection1Erc20.mint(deploymentAddress, "10000000000000000000");
    collection2Erc20.mint(deploymentAddress, "10000000000000000000");
    collection3Erc20.mint(deploymentAddress, "10000000000000000000");
    collection4Erc20.mint(deploymentAddress, "10000000000000000000");
    collection5Erc20.mint(deploymentAddress, "10000000000000000000");
    collection6Erc20.mint(deploymentAddress, "10000000000000000000");
    token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/2');
    token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/3');

    collection1Token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/7');
    collection1Token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/8');
    collection1Token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/9');
    collection2Token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/10');
    collection2Token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/11');
    collection3Token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/12');
    collection4Token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/13');
    collection4Token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/14');
    collection5Token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/15');
    collection5Token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/16');
    collection5Token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/17');
    collection1Token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/18');

    /*let erc20Contents = JSON.stringify(erc20Abi.abi);
    writeFileSync("../webapp/src/abi/ERC20ABI.tsx", "export const ERC20ABI = " + erc20Contents);
    let erc721Contents = JSON.stringify(erc721Abi.abi);
    writeFileSync("../webapp/src/abi/ERC721ABI.tsx", "export const ERC721ABI = " + erc721Contents);*/
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
