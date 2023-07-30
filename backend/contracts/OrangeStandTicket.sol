pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract OrangeStandTicket is ERC20, Ownable, AccessControl {
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    event TicketIssued(address owner, uint256 amount, uint blockNumber);

    constructor() public ERC20('OrangeStandTicket', 'OSTI') { }

    function addBurner(address newBurner) public onlyOwner {
        _grantRole(BURNER_ROLE, newBurner);
    }

    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
        emit TicketIssued(account, amount, block.number);
    }

    function burn(address account, uint256 amount) public {
        require(hasRole(BURNER_ROLE, msg.sender), "Caller is not a burner");

        _burn(account, amount);
    }
}