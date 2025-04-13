// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AccountERC7702Module = buildModule("AccountERC7702Module", (m) => {
  const accountERC7702 = m.contract("AccountERC7702", []);
  return { accountERC7702 };
});

export default AccountERC7702Module;
