pragma solidity >=0.8.0 <0.9.0;

//SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract OrangeStandSpentTicket is ERC20, Ownable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    event TicketRedeemed(address owner, uint256 amount, uint blockNumber);
    address private _userContractAddress;

    constructor(address userContractAddress) public ERC20('OrangeStandSpentTicket', 'OSST') { 
        _userContractAddress = userContractAddress;
    }

    function addMinter(address newMinter) public onlyOwner {
        _grantRole(MINTER_ROLE, newMinter);
    }

    function mint(address account, uint256 amount) public {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
        _mint(account, amount);
    }

    //function burn(address account, uint256 amount) public onlyOwner {
    function burn(address account, uint256 amount) public {
        IERC20(_userContractAddress).transfer(account, amount);
        _burn(account, amount);
        emit TicketRedeemed(account, amount, block.number);
    }
}