pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimulationToken is ERC20 {
    constructor() public ERC20('SimulationToken', 'SIM') {}
    function mint(address initialOwner, uint256 amount) public {
        _mint(initialOwner, amount);
    }
}