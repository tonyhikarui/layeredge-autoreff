import axios, { AxiosRequestConfig } from "axios";
import chalk from "chalk";
import fs from "fs";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

let proxyList: string[] = [];
let axiosConfig: AxiosRequestConfig = {};

export function getProxyAgent(proxyUrl: string): HttpsProxyAgent<any> | SocksProxyAgent | null {
  try {
    const isSocks = proxyUrl.toLowerCase().startsWith("socks");
    if (isSocks) {
      return new SocksProxyAgent(proxyUrl);
    }
    return new HttpsProxyAgent(
      proxyUrl.startsWith("http") ? proxyUrl : `http://${proxyUrl}`
    );
  } catch (error) {
    if (error instanceof Error) {
      console.log(chalk.red(`[!] Error creating proxy agent: ${error.message}`));
    } else {
      console.log(chalk.red(`[!] Error creating proxy agent`));
    }
    return null;
  }
}

export function loadProxies(): boolean {
  try {
    const proxyFile = fs.readFileSync("proxy.txt", "utf8");
    proxyList = proxyFile
      .split("\n")
      .filter((line) => line.trim())
      .map((proxy) => {
        proxy = proxy.trim();
        if (!proxy.includes("://")) {
          return `http://${proxy}`;
        }
        return proxy;
      });

    if (proxyList.length === 0) {
      throw new Error("No proxies found in proxies.txt");
    }
    console.log(
      chalk.green(`✓ Loaded ${proxyList.length} proxies from proxies.txt`)
    );
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`[!] Error loading proxies: ${error.message}`));
    } else {
      console.error(chalk.red(`[!] Error loading proxies`));
    }
    return false;
  }
}

export async function checkIP(): Promise<boolean> {
  try {
    const response = await axios.get(
      "https://api.ipify.org?format=json",
      { ...axiosConfig, timeout: 10000 } // Set timeout to 10 seconds
    );
    const ip = response.data.ip;
    console.log(chalk.green(`[+] Ip Using: ${ip}`));
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.log(chalk.red(`[!] Failed to get IP: ${error.message}`));
    } else {
      console.log(chalk.red(`[!] Failed to get IP`));
    }
    return false;
  }
}

export async function getRandomProxy(): Promise<string | null> {
  if (proxyList.length === 0) {
    axiosConfig = {};
    await checkIP();
    return null;
  }

  let proxyAttempt = 0;
  while (proxyAttempt < proxyList.length) {
    const proxy = proxyList[Math.floor(Math.random() * proxyList.length)];
    try {
      const agent = getProxyAgent(proxy);
      if (!agent) continue;

      axiosConfig.httpsAgent = agent;
      await checkIP();
      return proxy;
    } catch (error) {
      proxyAttempt++;
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Add delay before retrying
    }
  }

  console.log(chalk.red("[!] Using default IP"));
  axiosConfig = {};
  await checkIP();
  return null;
}