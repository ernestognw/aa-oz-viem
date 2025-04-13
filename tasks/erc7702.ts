import { task } from "hardhat/config";
import { createWalletClient, encodePacked, getContract, Hex, http } from "viem";
import EntrypointV08Abi from "../config/EntrypointV08.abi";
import AccountERC7702Module from "../ignition/modules/AccountERC7702";
import { eoa } from "../config";
import MyTokenVaultModule from "../ignition/modules/MyTokenVault";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { executeBatchMintApproveDeposit } from "../utils";
import { ENTRYPOINT_V08 } from "../utils/erc4337";

const setup = async (hre: HardhatRuntimeEnvironment) => {
  const publicClient = await hre.viem.getPublicClient();
  const eoaClient = createWalletClient({
    account: eoa,
    chain: publicClient.chain,
    transport: http(),
  });
  const { accountERC7702 } = await hre.ignition.deploy(AccountERC7702Module);
  const { myToken, myTokenVault } = await hre.ignition.deploy(
    MyTokenVaultModule
  );
  const authorization = await eoaClient.signAuthorization({
    contractAddress: accountERC7702.address,
    executor: "self",
  });
  const entrypoint = getContract({
    abi: EntrypointV08Abi,
    address: ENTRYPOINT_V08,
    client: eoaClient,
  });

  return {
    publicClient,
    eoaClient,
    accountERC7702,
    myToken,
    myTokenVault,
    authorization,
    entrypoint,
  };
};

task("erc7702", "Sends a batched self execution", async (_, hre) => {
  const {
    publicClient,
    eoaClient,
    accountERC7702,
    myToken,
    myTokenVault,
    authorization,
  } = await setup(hre);

  const data = executeBatchMintApproveDeposit(
    { abi: accountERC7702.abi, address: eoa.address },
    myToken,
    myTokenVault
  );

  const receipt = await eoaClient
    .sendTransaction({
      authorizationList: [authorization],
      data,
      to: eoa.address,
    })
    .then((txHash) =>
      publicClient.waitForTransactionReceipt({
        hash: txHash,
      })
    );

  console.log(receipt);
});

task("erc7702Entrypoint", "Sends a batched userOp", async (_, hre) => {
  const {
    publicClient,
    eoaClient,
    accountERC7702,
    myToken,
    myTokenVault,
    authorization,
    entrypoint,
  } = await setup(hre);

  const data = executeBatchMintApproveDeposit(
    { abi: accountERC7702.abi, address: eoa.address },
    myToken,
    myTokenVault
  );

  const nonce = await entrypoint.read.getNonce([eoa.address, 0n]);

  const userOp = {
    sender: eoa.address,
    nonce,
    initCode: "0x" as Hex,
    callData: data,
    accountGasLimits: encodePacked(
      ["uint128", "uint128"],
      [
        100_000n, // verificationGas
        300_000n, // callGas
      ]
    ),
    preVerificationGas: 0n,
    gasFees: encodePacked(
      ["uint128", "uint128"],
      [
        0n, // maxPriorityFeePerGas
        0n, // maxFeePerGas
      ]
    ),
    paymasterAndData: "0x" as Hex,
    signature: "0x" as Hex,
  };

  const userOpHash = await entrypoint.read.getUserOpHash([userOp]);
  userOp.signature = await eoa.sign({ hash: userOpHash });

  const userOpReceipt = await eoaClient
    .writeContract({
      abi: EntrypointV08Abi,
      address: entrypoint.address,
      authorizationList: [authorization],
      functionName: "handleOps",
      args: [[userOp], eoa.address],
    })
    .then((txHash) =>
      publicClient.waitForTransactionReceipt({
        hash: txHash,
      })
    );

  console.log(userOpReceipt);
});
