import { ethers } from "hardhat";
import { writeFileSync, promises as fsPromises } from 'fs';

import * as auctionCoordinatorAbi from '../artifacts/contracts/AuctionCoordinator.sol/AuctionCoordinator.json';
import * as auctionAbi from '../artifacts/contracts/Auction.sol/Auction.json';
import * as bidAbi from '../artifacts/contracts/Bid.sol/Bid.json';
import * as itemAbi from '../artifacts/contracts/Item.sol/Item.json';
import * as orangeStandTicketAbi from '../artifacts/contracts/OrangeStandTicket.sol/OrangeStandTicket.json';
import * as orangeStandSpentTicketAbi from '../artifacts/contracts/OrangeStandSpentTicket.sol/OrangeStandSpentTicket.json';
import * as localCollectionAbi from '../artifacts/contracts/LocalCollectible.sol/LocalCollectible.json';
import * as simTokenAbi from '../artifacts/contracts/SimulationToken.sol/SimulationToken.json';

async function main() {
    var treasuryAddress = '0x119117fb67285be332c3511E52b25441172cf129';
    var deploymentAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    var testingAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
  
    const OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
    const orangeStandTicket = await OrangeStandTicket.deploy();
    orangeStandTicket.mint(deploymentAddress, "15000000000000000000");
    orangeStandTicket.mint(testingAddress, "10000000000000000000");
    let oldOrangeStandOwner = await orangeStandTicket.owner();
    console.log("Old OrangeStand owner:", oldOrangeStandOwner);

    const OrangeStandSpentTicket = await ethers.getContractFactory("OrangeStandSpentTicket");
    const orangeStandSpentTicket = await OrangeStandSpentTicket.deploy();
  
    const AuctionCoordinator = await ethers.getContractFactory("AuctionCoordinator");
    const auctionCoordinator = await AuctionCoordinator.deploy(await orangeStandTicket.getAddress(), 
      treasuryAddress, await orangeStandSpentTicket.getAddress());
    console.log("AuctionCoordinator deployed to:", (await auctionCoordinator.getAddress()));
    await orangeStandTicket.transferOwnership((await auctionCoordinator.getAddress()));
    let auctionCoordinatorContents = JSON.stringify(auctionCoordinatorAbi.abi);
    writeFileSync("../webapp/src/abi/AuctionCoordinator.tsx", "export const AuctionCoordinator = " + auctionCoordinatorContents);
    let orangeStandOwner = await orangeStandTicket.owner();
    console.log("New OrangeStand owner:", orangeStandOwner);
  
    let auctionContents = JSON.stringify(auctionAbi.abi);
    writeFileSync("../webapp/src/abi/Auction.tsx", "export const Auction = " + auctionContents);
    let bidContents = JSON.stringify(bidAbi.abi);
    writeFileSync("../webapp/src/abi/Bid.tsx", "export const Bid = " + bidContents);
    let itemContents = JSON.stringify(itemAbi.abi);
    writeFileSync("../webapp/src/abi/Item.tsx", "export const Item = " + itemContents);
  
    const LocalCollectible = await ethers.getContractFactory("LocalCollectible");
    const token = await LocalCollectible.deploy();
    console.log("LocalCollectible deployed to:", (await token.getAddress()));
    let yourCollectionContents = JSON.stringify(localCollectionAbi.abi);
    writeFileSync("../webapp/src/abi/LocalCollectible.tsx", "export const LocalCollectible = " + yourCollectionContents);
  
    const SimulationToken = await ethers.getContractFactory("SimulationToken");
    const simToken = await SimulationToken.deploy();
    console.log("SimToken deployed to:", (await simToken.getAddress()));
    let simTokenContents = JSON.stringify(simTokenAbi.abi);
    writeFileSync("../webapp/src/abi/SimulationToken.tsx", "export const SimulationToken = " + simTokenContents);  
    
    console.log("OrangeStandTicket deployed to:", (await orangeStandTicket.getAddress()));
    let orangeStandTicketContents = JSON.stringify(orangeStandTicketAbi.abi);
    writeFileSync("../webapp/src/abi/OrangeStandTicket.tsx", "export const OrangeStandTicket = " + orangeStandTicketContents);

    console.log("OrangeStandSpentTicket deployed to:", (await orangeStandSpentTicket.getAddress()));
    let orangeStandSpentTicketContents = JSON.stringify(orangeStandSpentTicketAbi.abi);
    writeFileSync("../webapp/src/abi/OrangeStandSpentTicket.tsx", "export const OrangeStandSpentTicket = " + orangeStandSpentTicketContents);

    let data = '{"auctionCoordinator":"'+(await auctionCoordinator.getAddress())
        +'",\n"tokenAddress":"'+(await token.getAddress())
        +'",\n"orangeStandTicketAddress":"'+(await orangeStandTicket.getAddress())
        +'",\n"simTokenAddress":"'+(await simToken.getAddress())+'"}';
    writeFileSync("../webapp/public/deployed_contracts.json", data);
  
    let erc20Contracts = '{"SIM":"'+(await simToken.getAddress())+'"}';
    writeFileSync("../webapp/public/erc20tokens.json", erc20Contracts);
  
    let erc721Contracts = '{"BRD":"'+(await token.getAddress())+'"}';
    writeFileSync("../webapp/public/erc721tokens.json", erc721Contracts);  
    simToken.mint(deploymentAddress, "10000000000000000000");
    token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/2');
    token.mintItem(deploymentAddress, 'bafybeihpjhkeuiq3k6nqa3fkgeigeri7iebtrsuyuey5y6vy36n345xmbi/3');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
