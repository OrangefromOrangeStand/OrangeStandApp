pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CollectionErc20 is ERC20 {
    uint8 private decimalPlaces;
    constructor(string memory name, string memory symbol, uint8 decs) public ERC20(name, symbol) {
        decimalPlaces = decs;
    }
    function mint(address initialOwner, uint256 amount) public {
        _mint(initialOwner, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return decimalPlaces;
    }
}