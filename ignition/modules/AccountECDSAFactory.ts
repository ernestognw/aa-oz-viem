// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AccountFactoryECDSAModule = buildModule(
  "AccountFactoryECDSAModule",
  (m) => {
    const accountECDSAImplementation = m.contract("AccountECDSA", []);
    const accountFactoryECDSA = m.contract("AccountFactory", [
      accountECDSAImplementation,
    ]);
    return { accountECDSAImplementation, accountFactoryECDSA };
  }
);

export default AccountFactoryECDSAModule;
