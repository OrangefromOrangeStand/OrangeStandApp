import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    hardhat: {
      mining: {
        auto: true
      }
      /*mining: {
        auto: false,
        interval: 1000
      }*/
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  }
};

export default config;
