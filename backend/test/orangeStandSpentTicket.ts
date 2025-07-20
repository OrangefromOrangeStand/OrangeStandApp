import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer } from "ethers";

describe("OrangeStandSpentTicket", function () {
  let OrangeStandSpentTicket: any;
  let CollectionErc20: any;
  let ticket: Contract;
  let userToken: Contract;
  let owner: Signer;
  let minter: Signer;
  let user1: Signer;
  let user2: Signer;
  let user3: Signer;
  let ownerAddr: string;
  let minterAddr: string;
  let user1Addr: string;
  let user2Addr: string;
  let user3Addr: string;

  beforeEach(async function () {
    [owner, minter, user1, user2, user3] = await ethers.getSigners();
    ownerAddr = await owner.getAddress();
    minterAddr = await minter.getAddress();
    user1Addr = await user1.getAddress();
    user2Addr = await user2.getAddress();
    user3Addr = await user3.getAddress();

    CollectionErc20 = await ethers.getContractFactory("CollectionErc20");
    userToken = await CollectionErc20.deploy("usdTCollection", "USDT", 6);
    OrangeStandSpentTicket = await ethers.getContractFactory("OrangeStandSpentTicket");
    ticket = await OrangeStandSpentTicket.deploy(await userToken.getAddress());
  });

  describe("Deployment", function () {
    it("should set the correct user contract address", async function () {
      expect(await ticket.decimals()).to.equal(await userToken.decimals());
    });

    it("should have correct name and symbol", async function () {
      expect(await ticket.name()).to.equal("OrangeStandSpentTicket");
      expect(await ticket.symbol()).to.equal("OSST");
    });
  });

  describe("Roles", function () {
    it("owner should be able to add minter", async function () {
      await ticket.addMinter(minterAddr);
      expect(await ticket.hasRole(await ticket.MINTER_ROLE(), minterAddr)).to.be.true;
    });

    it("non-owner should not be able to add minter", async function () {
      await expect(ticket.connect(user1).addMinter(user2Addr)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Minting", function () {
    beforeEach(async function () {
      await ticket.addMinter(minterAddr);
    });

    it("minter can mint tokens", async function () {
      await ticket.connect(minter).mint(user1Addr, 10);
      expect(await ticket.balanceOf(user1Addr)).to.equal(10);
    });

    it("non-minter cannot mint tokens", async function () {
      await expect(ticket.connect(user1).mint(user2Addr, 5)).to.be.revertedWith("Caller is not a minter");
    });

    it("minting zero tokens does not change balance", async function () {
      await ticket.connect(minter).mint(user2Addr, 0);
      expect(await ticket.balanceOf(user2Addr)).to.equal(0);
    });

    it("multiple minters can mint", async function () {
      await ticket.addMinter(user1Addr);
      await ticket.connect(minter).mint(user2Addr, 3);
      await ticket.connect(user1).mint(user3Addr, 7);
      expect(await ticket.balanceOf(user2Addr)).to.equal(3);
      expect(await ticket.balanceOf(user3Addr)).to.equal(7);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await ticket.addMinter(ownerAddr);
      await userToken.mint(await ticket.getAddress(), 100);
      await ticket.mint(user1Addr, 10);
    });

    it("should burn tokens and emit TicketRedeemed", async function () {
      await expect(ticket.burn(user1Addr, 10))
        .to.emit(ticket, "TicketRedeemed")
        .withArgs(user1Addr, 10, await ethers.provider.getBlockNumber() + 1);
      expect(await ticket.balanceOf(user1Addr)).to.equal(0);
    });

    it("should transfer userToken to account on burn", async function () {
      const userTokenBalanceBefore = await userToken.balanceOf(user1Addr);
      await ticket.burn(user1Addr, 5);
      const userTokenBalanceAfter = await userToken.balanceOf(user1Addr);
      expect(userTokenBalanceAfter - userTokenBalanceBefore).to.equal(5);
    });

    it("should revert if burning more than balance", async function () {
      await expect(ticket.burn(user1Addr, 20)).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    it("should revert if burning from zero balance", async function () {
      await expect(ticket.burn(user2Addr, 1)).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });
  });

  describe("Decimals", function () {
    it("should return decimals from user contract", async function () {
      expect(await ticket.decimals()).to.equal(await userToken.decimals());
    });
  });

  describe("Edge Cases", function () {
    it("should handle minting and burning with zero address", async function () {
      await ticket.addMinter(ownerAddr);
      await expect(ticket.burn(ethers.ZeroAddress, 1)).to.be.revertedWith("ERC20: burn from the zero address");
    });

    it("should revert if minting to zero address with nonzero amount", async function () {
      await ticket.addMinter(ownerAddr);
      await expect(ticket.mint(ethers.ZeroAddress, 5)).to.be.revertedWith("ERC20: mint to the zero address");
    });
  });
});