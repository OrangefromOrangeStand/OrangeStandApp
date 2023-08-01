import { ethers } from "hardhat";
import { writeFileSync, promises as fsPromises } from 'fs';

import * as auctionCoordinatorAbi from '../artifacts/contracts/AuctionCoordinator.sol/AuctionCoordinator.json';
import * as auctionAbi from '../artifacts/contracts/Auction.sol/Auction.json';
import * as bidAbi from '../artifacts/contracts/Bid.sol/Bid.json';
import * as itemAbi from '../artifacts/contracts/Item.sol/Item.json';
import * as orangeStandTicketAbi from '../artifacts/contracts/OrangeStandTicket.sol/OrangeStandTicket.json';
import * as localCollectionAbi from '../artifacts/contracts/LocalCollectible.sol/LocalCollectible.json';
import * as simTokenAbi from '../artifacts/contracts/SimulationToken.sol/SimulationToken.json';

async function main() {
    var deploymentAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    var deploymentAddress2 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    var testingAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
    const [deployer] = await ethers.getSigners();
    const actualDeployer = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc";
    console.log("Deploying contracts with the account:", deployer.address);
    let contract_owner = await ethers.getSigner(deployer.address);
    //console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const OrangeStandTicket = await ethers.getContractFactory("OrangeStandTicket");
    const orangeStandTicket = await OrangeStandTicket.deploy();
    //await orangeStandTicket.deployed();
    orangeStandTicket.mint(deploymentAddress, "15000000000000000000");
    orangeStandTicket.mint(testingAddress, "10000000000000000000");
    let oldOrangeStandOwner = await orangeStandTicket.owner();
    console.log("Old OrangeStand owner:", oldOrangeStandOwner);
  
    const AuctionCoordinator = await ethers.getContractFactory("AuctionCoordinator");
    const auctionCoordinator = await AuctionCoordinator.deploy(orangeStandTicket.address);
    //await auctionCoordinator.deployed();
    console.log("AuctionCoordinator deployed to:", auctionCoordinator.address);
    await orangeStandTicket.transferOwnership(auctionCoordinator.address);
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
    await token.deployed();
    console.log("LocalCollectible deployed to:", token.address);
    let yourCollectionContents = JSON.stringify(localCollectionAbi.abi);
    writeFileSync("../webapp/src/abi/LocalCollectible.tsx", "export const LocalCollectible = " + yourCollectionContents);
  
    const SimulationToken = await ethers.getContractFactory("SimulationToken");
    const simToken = await SimulationToken.deploy();
    await simToken.deployed();
    console.log("SimToken deployed to:", simToken.address);
    let simTokenContents = JSON.stringify(simTokenAbi.abi);
    writeFileSync("../webapp/src/abi/SimulationToken.tsx", "export const SimulationToken = " + simTokenContents);  
    
    console.log("OrangeStandTicket deployed to:", orangeStandTicket.address);
    let orangeStandTicketContents = JSON.stringify(orangeStandTicketAbi.abi);
    writeFileSync("../webapp/src/abi/OrangeStandTicket.tsx", "export const OrangeStandTicket = " + orangeStandTicketContents);
  
    let data = '{"auctionCoordinator":"'+auctionCoordinator.address
        +'",\n"tokenAddress":"'+token.address
        +'",\n"orangeStandTicketAddress":"'+orangeStandTicket.address
        +'",\n"simTokenAddress":"'+simToken.address+'"}';
    writeFileSync("../webapp/public/deployed_contracts.json", data);
  
    let erc20Contracts = '{"SIM":"'+simToken.address+'"}';
    writeFileSync("../webapp/public/erc20tokens.json", erc20Contracts);
  
    let erc721Contracts = '{"BRD":"'+token.address+'"}';
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
