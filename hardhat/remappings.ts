import fs from "fs";
import { task } from "hardhat/config";
import { TASK_COMPILE_GET_REMAPPINGS } from "hardhat/builtin-tasks/task-names";

task(TASK_COMPILE_GET_REMAPPINGS).setAction(
  async (_taskArgs, _env, runSuper: () => Promise<Record<string, string>>) => {
    const remappings = await runSuper();
    return Object.assign(
      remappings,
      Object.fromEntries(
        fs
          .readFileSync("remappings.txt", "utf-8")
          .split("\n")
          .filter(Boolean)
          .filter((line: string) => !line.startsWith("#"))
          .map((line: string) => line.trim().split("="))
      )
    );
  }
);
