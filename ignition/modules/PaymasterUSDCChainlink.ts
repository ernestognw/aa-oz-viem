// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { eoa } from "../../config";

const PaymasterUSDCChainlinkModule = buildModule("PaymasterUSDCChainlinkModule", (m) => {
  const paymasterUSDCChainlink = m.contract("PaymasterUSDCChainlink", [eoa.address]);
  return { paymasterUSDCChainlink };
});

export default PaymasterUSDCChainlinkModule; 
