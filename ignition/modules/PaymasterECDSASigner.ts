// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { eoa } from "../../config";

const PaymasterECDSASignerModule = buildModule("PaymasterECDSASignerModule", (m) => {
  const paymasterECDSASigner = m.contract("PaymasterECDSASigner", [eoa.address]);
  return { paymasterECDSASigner };
});

export default PaymasterECDSASignerModule;
