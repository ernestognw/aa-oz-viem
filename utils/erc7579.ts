import {
  Address,
  encodeAbiParameters,
  encodePacked,
  Hex,
  parseAbiParameter,
} from "viem";

const EXEC_TYPE_DEFAULT = "0x00";
const CALL_TYPE_BATCH = "0x01";

const encodeMode = ({
  callType = CALL_TYPE_BATCH,
  execType = EXEC_TYPE_DEFAULT,
  selector = "0x00000000",
  payload = "0x00000000000000000000000000000000000000000000",
}: {
  callType?: Hex;
  execType?: Hex;
  selector?: Hex;
  payload?: Hex;
} = {}) =>
  encodePacked(
    ["bytes1", "bytes1", "bytes4", "bytes4", "bytes22"],
    [callType, execType, "0x00000000", selector, payload]
  );

const encodeBatch = (
  ...entries:
    | [Address, bigint, Hex][]
    | {
        target: Address;
        value?: bigint;
        data?: Hex;
      }[]
) =>
  encodeAbiParameters(
    [parseAbiParameter("(address,uint256,bytes)[]")],
    [
      entries.map<[Address, bigint, Hex]>((entry) =>
        Array.isArray(entry)
          ? [entry[0], entry[1] ?? 0n, entry[2] ?? "0x"]
          : [entry.target, entry.value ?? 0n, entry.data ?? "0x"]
      ),
    ]
  );

export { EXEC_TYPE_DEFAULT, CALL_TYPE_BATCH, encodeMode, encodeBatch };
