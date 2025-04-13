import "dotenv/config";
import { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const eoa = privateKeyToAccount(process.env.EOA_PRIVATE_KEY as Hex);
