import { task } from "hardhat/config";
import {
  createWalletClient,
  encodeFunctionData,
  encodePacked,
  getContract,
  Hex,
  http,
  keccak256,
  parseEther,
  stringToHex,
} from "viem";
import EntrypointV08Abi from "../config/EntrypointV08.abi";
import AccountECDSAFactoryModule from "../ignition/modules/AccountECDSAFactory";
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
  const { accountECDSAImplementation, accountFactoryECDSA } =
    await hre.ignition.deploy(AccountECDSAFactoryModule);
  const { myToken, myTokenVault } = await hre.ignition.deploy(
    MyTokenVaultModule
  );

  const entrypoint = getContract({
    abi: EntrypointV08Abi,
    address: ENTRYPOINT_V08,
    client: eoaClient,
  });

  return {
    publicClient,
    eoaClient,
    accountECDSAImplementation,
    accountFactoryECDSA,
    myToken,
    myTokenVault,
    entrypoint,
  };
};

task("erc4337ECDSA", "Sends a batched userOp", async (_, hre) => {
  const {
    publicClient,
    eoaClient,
    accountECDSAImplementation,
    accountFactoryECDSA,
    myToken,
    myTokenVault,
    entrypoint,
  } = await setup(hre);

  const salt = keccak256(stringToHex("salt"));
  const initializationData = encodeFunctionData({
    abi: accountECDSAImplementation.abi,
    functionName: "initializeECDSA",
    args: [eoa.address],
  });
  const [predictedAddress] = await accountFactoryECDSA.read.predictAddress([
    salt,
    initializationData,
  ]);
  const balance = await publicClient.getBalance({ address: predictedAddress });
  if (balance === 0n) {
    await eoaClient.sendTransaction({
      value: parseEther("0.0005"),
      to: predictedAddress,
    });
  }

  const data = executeBatchMintApproveDeposit(
    {
      abi: accountECDSAImplementation.abi,
      address: predictedAddress,
    },
    myToken,
    myTokenVault
  );

  const userOp = {
    sender: predictedAddress,
    nonce: await entrypoint.read.getNonce([predictedAddress, 0n]),
    initCode: "0x" as Hex,
    callData: data,
    accountGasLimits: encodePacked(
      ["uint128", "uint128"],
      [300_000n, 300_000n]
    ),
    preVerificationGas: 300_000n,
    gasFees: encodePacked(["uint128", "uint128"], [300_000n, 300_000n]),
    paymasterAndData: "0x" as Hex,
    signature: "0x" as Hex,
  };

  const deployed = await publicClient.getCode({ address: predictedAddress });

  if (!deployed) {
    userOp.initCode = encodePacked(
      ["address", "bytes"],
      [
        accountFactoryECDSA.address,
        encodeFunctionData({
          abi: accountFactoryECDSA.abi,
          functionName: "cloneAndInitialize",
          args: [salt, initializationData],
        }),
      ]
    );
  }

  const userOpHash = await entrypoint.read.getUserOpHash([userOp]);
  userOp.signature = await eoa.sign({ hash: userOpHash });

  const userOpReceipt = await eoaClient
    .writeContract({
      abi: EntrypointV08Abi,
      address: entrypoint.address,
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
