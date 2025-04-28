import { Abi, Address, encodeFunctionData, Hex } from "viem";
import { encodeBatch, encodeMode } from "./erc7579";

const executeBatchMintApproveDeposit = (
  account: { abi: Abi; address: Address },
  myToken: { abi: Abi; address: Address },
  myTokenVault: { abi: Abi; address: Address },
  ...extraFns:
    | {
        target: Address;
        value?: bigint;
        data?: Hex;
      }[]
) =>
  encodeFunctionData({
    abi: account.abi,
    functionName: "execute",
    args: [
      encodeMode(),
      encodeBatch(
        {
          target: myToken.address,
          value: 0n,
          data: encodeFunctionData({
            abi: myToken.abi,
            functionName: "mint",
            args: [account.address, 100_000n],
          }),
        },
        {
          target: myToken.address,
          value: 0n,
          data: encodeFunctionData({
            abi: myToken.abi,
            functionName: "approve",
            args: [myTokenVault.address, 100_000n],
          }),
        },
        {
          target: myTokenVault.address,
          value: 0n,
          data: encodeFunctionData({
            abi: myTokenVault.abi,
            functionName: "deposit",
            args: [100_000n, account.address],
          }),
        },
        ...extraFns
      ),
    ],
  });

export { executeBatchMintApproveDeposit };
