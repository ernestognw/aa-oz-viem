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
  Address,
  PublicClient,
  WalletClient,
} from "viem";
import EntrypointV08Abi from "../config/EntrypointV08.abi";
import AccountECDSAFactoryModule from "../ignition/modules/AccountECDSAFactory";
import { eoa } from "../config";
import MyTokenVaultModule from "../ignition/modules/MyTokenVault";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { executeBatchMintApproveDeposit } from "../utils";
import { ENTRYPOINT_V08 } from "../utils/erc4337";
import PaymasterECDSASignerModule from "../ignition/modules/PaymasterECDSASigner";
import { PackedUserOperation } from "viem/_types/account-abstraction/types/userOperation";

const predictAndFundWallet = async (
  accountFactory: any,
  publicClient: PublicClient,
  eoaClient: WalletClient,
  salt: Hex,
  initializationData: Hex
) => {
  const [predictedAddress] = await accountFactory.read.predictAddress([
    salt,
    initializationData,
  ]);
  const balance = await publicClient.getBalance({ address: predictedAddress });
  if (balance === 0n) {
    await eoaClient
      .sendTransaction({
        value: parseEther("0.0005"),
        to: predictedAddress,
        account: eoaClient.account as any,
        chain: eoaClient.chain as any,
      })
      .then((tx) => publicClient.waitForTransactionReceipt({ hash: tx }));
  }
  return predictedAddress;
};

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

  const salt = keccak256(stringToHex("salt"));
  const initializationData = encodeFunctionData({
    abi: accountECDSAImplementation.abi,
    functionName: "initializeECDSA",
    args: [eoa.address],
  });

  const predictedAddress = await predictAndFundWallet(
    accountFactoryECDSA,
    publicClient,
    eoaClient,
    salt,
    initializationData
  );

  const nonce = await entrypoint.read.getNonce([predictedAddress, 0n]);

  const initCode = encodePacked(
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

  return {
    publicClient,
    eoaClient,
    accountECDSAImplementation,
    myToken,
    myTokenVault,
    entrypoint,
    predictedAddress,
    nonce,
    initCode,
  };
};

const prepareUserOp = async (
  publicClient: PublicClient,
  predictedAddress: Address,
  nonce: bigint,
  data: Hex,
  {
    initCode,
    paymasterAndData,
  }: {
    initCode?: Hex;
    paymasterAndData?: Hex;
  }
): Promise<PackedUserOperation> => {
  const deployed = await publicClient.getCode({ address: predictedAddress });
  const userOp = {
    sender: predictedAddress,
    nonce,
    initCode: !deployed ? initCode ?? "0x" : "0x",
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
    paymasterAndData: paymasterAndData ?? "0x",
    signature: "0x" as Hex,
  };

  return userOp;
};

const signUserOp = async (entryPoint: any, userOp: PackedUserOperation) => {
  const userOpHash = await entryPoint.read.getUserOpHash([userOp]);
  userOp.signature = await eoa.sign({ hash: userOpHash });
  return userOp;
};

task("erc4337ECDSA", "Sends a batched userOp", async (_, hre) => {
  const {
    publicClient,
    eoaClient,
    accountECDSAImplementation,
    myToken,
    myTokenVault,
    entrypoint,
    predictedAddress,
    nonce,
    initCode,
  } = await setup(hre);

  const data = executeBatchMintApproveDeposit(
    {
      abi: accountECDSAImplementation.abi,
      address: predictedAddress,
    },
    myToken,
    myTokenVault
  );

  const userOp = await prepareUserOp(
    publicClient,
    predictedAddress,
    nonce,
    data,
    { initCode }
  ).then((userOp) => signUserOp(entrypoint, userOp));

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

task("erc4337ECDSASponsored", "Sends a sponsored userOp", async (_, hre) => {
  const {
    publicClient,
    eoaClient,
    accountECDSAImplementation,
    myToken,
    myTokenVault,
    entrypoint,
    predictedAddress,
    nonce,
    initCode,
  } = await setup(hre);

  const { paymasterECDSASigner } = await hre.ignition.deploy(
    PaymasterECDSASignerModule
  );

  const balance = await entrypoint.read.balanceOf([
    paymasterECDSASigner.address,
  ]);
  if (balance === 0n) {
    await eoaClient
      .sendTransaction({
        to: paymasterECDSASigner.address,
        value: parseEther("0.01"),
        data: encodeFunctionData({
          abi: paymasterECDSASigner.abi,
          functionName: "deposit",
          args: [],
        }),
      })
      .then((tx) => publicClient.waitForTransactionReceipt({ hash: tx }));
  }

  const data = executeBatchMintApproveDeposit(
    {
      abi: accountECDSAImplementation.abi,
      address: predictedAddress,
    },
    myToken,
    myTokenVault
  );

  const userOp = await prepareUserOp(
    publicClient,
    predictedAddress,
    nonce,
    data,
    { initCode }
  );

  const now = Math.floor(Date.now() / 1000);
  const validAfter = now - 60; // Valid from 1 minute ago
  const validUntil = now + 3600; // Valid for 1 hour
  const paymasterVerificationGasLimit = 100_000n;
  const paymasterPostOpGasLimit = 300_000n;

  const paymasterSignature = await eoa.signTypedData({
    domain: {
      chainId: await eoaClient.getChainId(),
      name: "MyPaymasterECDSASigner",
      verifyingContract: paymasterECDSASigner.address,
      version: "1",
    },
    types: {
      UserOperationRequest: [
        { name: "sender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "initCode", type: "bytes" },
        { name: "callData", type: "bytes" },
        { name: "accountGasLimits", type: "bytes32" },
        { name: "preVerificationGas", type: "uint256" },
        { name: "gasFees", type: "bytes32" },
        { name: "paymasterVerificationGasLimit", type: "uint256" },
        { name: "paymasterPostOpGasLimit", type: "uint256" },
        { name: "validAfter", type: "uint48" },
        { name: "validUntil", type: "uint48" },
      ],
    },
    primaryType: "UserOperationRequest",
    message: {
      sender: userOp.sender,
      nonce: userOp.nonce,
      initCode: userOp.initCode,
      callData: userOp.callData,
      accountGasLimits: userOp.accountGasLimits,
      preVerificationGas: userOp.preVerificationGas,
      gasFees: userOp.gasFees,
      paymasterVerificationGasLimit,
      paymasterPostOpGasLimit,
      validAfter: validAfter,
      validUntil: validUntil,
    },
  });

  userOp.paymasterAndData = encodePacked(
    ["address", "uint128", "uint128", "bytes"],
    [
      paymasterECDSASigner.address,
      paymasterVerificationGasLimit,
      paymasterPostOpGasLimit,
      encodePacked(
        ["uint48", "uint48", "bytes"],
        [validAfter, validUntil, paymasterSignature]
      ),
    ]
  );

  const userOpReceipt = await eoaClient
    .writeContract({
      abi: EntrypointV08Abi,
      address: entrypoint.address,
      functionName: "handleOps",
      args: [[await signUserOp(entrypoint, userOp)], eoa.address],
    })
    .then((tx) =>
      publicClient.waitForTransactionReceipt({
        hash: tx,
      })
    );

  console.log(userOpReceipt);
});
