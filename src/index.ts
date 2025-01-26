import chalk from "chalk";
import fs from "fs";
import { layerEdgeRefferal } from "./classes/layerEdge";
import { getRandomProxy, loadProxies } from "./classes/proxy";
import { logMessage, prompt, rl } from "./utils/logger";

async function main(): Promise<void> {
  console.log(
    chalk.cyan(`
░█░░░█▀█░█░█░█▀▀░█▀▄░░░█▀▀░█▀▄░█▀▀░█▀▀
░█░░░█▀█░░█░░█▀▀░█▀▄░░░█▀▀░█░█░█░█░█▀▀
░▀▀▀░▀░▀░░▀░░▀▀▀░▀░▀░░░▀▀▀░▀▀░░▀▀▀░▀▀▀
        By : El Puqus Airdrop
        github.com/ahlulmukh
  `)
  );

  const refCode = await prompt(chalk.yellow("Enter Referral Code: "));
  const count = parseInt(await prompt(chalk.yellow("How many do you want? ")));
  const proxiesLoaded = loadProxies();
  if (!proxiesLoaded) {
    console.log(chalk.yellow("No proxy available. Using default IP."));
  }
  let successful = 0;

  const accountsLayerEdge = fs.createWriteStream("accounts.txt", { flags: "a" });

  for (let i = 0; i < count; i++) {
    console.log(chalk.white("-".repeat(85)));
    logMessage(i + 1, count, "Process", "debug");

    const currentProxy = await getRandomProxy();
    const layerEdge = new layerEdgeRefferal(refCode, currentProxy);

    const valid = await layerEdge.checkInvite();
    if (valid) {
      const registerSuccess = await layerEdge.registerWallet();
      if (registerSuccess) {
        successful++;
        const wallet = layerEdge.getWallet();
        accountsLayerEdge.write(`Wallet Address : ${wallet.address}\nPrivate Key : ${wallet.privateKey}\n`);
        accountsLayerEdge.write(`===================================================================\n`);
        const nodeConnected = await layerEdge.connectNode();
        if (nodeConnected) {
          await layerEdge.checkNodeStatus();
        }
      }
    }
  }

  accountsLayerEdge.end();

  console.log(chalk.magenta("\n[*] Done!"));
  console.log(chalk.green(`[*] Successfully created ${successful} out of ${count} accounts`));
  console.log(chalk.magenta("[*] Results in accounts.txt"));
  rl.close(); 
}

main().catch((err) => {
  console.error(chalk.red("Error occurred:"), err);
  process.exit(1);
});