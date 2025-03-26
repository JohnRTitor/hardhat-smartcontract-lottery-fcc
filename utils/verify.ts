import { run } from "hardhat";

const verify = async (contractAddress: string, args: string[]) => {
  console.log("Verifying contract...");
  try {
    // API key defined in hardhat.config.ts
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (error) {
    console.error(error);
  }
};

export default verify;
