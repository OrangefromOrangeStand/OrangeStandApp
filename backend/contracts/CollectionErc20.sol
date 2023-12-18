pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CollectionErc20 is ERC20 {
    constructor(string memory name, string memory symbol) public ERC20(name, symbol) {}
    function mint(address initialOwner, uint256 amount) public {
        _mint(initialOwner, amount);
    }
}