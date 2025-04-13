// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import MyTokenModule from "./MyToken";

const MyTokenVaultModule = buildModule("MyTokenVaultModule", (m) => {
  const { myToken } = m.useModule(MyTokenModule);
  const myTokenVault = m.contract("MyTokenVault", [myToken]);
  return { myTokenVault, myToken };
});

export default MyTokenVaultModule;
