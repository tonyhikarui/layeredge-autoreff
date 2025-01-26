import axios, { AxiosResponse } from "axios";
import chalk from "chalk";
import Web3 from "web3";
import { logMessage } from "../utils/logger";
import { getProxyAgent } from "./proxy";
import http from 'http';
import https from 'https';

export class layerEdgeRefferal {
  private refCode: string;
  private proxy: string | null;
  private axiosConfig: any;
  private wallet: any;

  constructor(refCode: string, proxy: string | null = null) {
    this.refCode = refCode;
    this.proxy = proxy;
    
    // Create base agent configuration
    const agentConfig = {
      keepAlive: true,
      timeout: 30000,
      keepAliveMsecs: 5000,
    };

    // Configure agents based on proxy or direct connection
    if (this.proxy) {
      const proxyAgent = getProxyAgent(this.proxy);
      this.axiosConfig = {
        httpsAgent: proxyAgent,
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: (status: number): boolean => status < 500,
      };
    } else {
      this.axiosConfig = {
        httpAgent: new http.Agent(agentConfig),
        httpsAgent: new https.Agent({
          ...agentConfig,
          rejectUnauthorized: false
        }),
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: (status: number): boolean => status < 500,
      };
    }

    const web3 = new Web3();
    this.wallet = web3.eth.accounts.create();
  }

  public getWallet(): any {
    return this.wallet;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(method: string, url: string, config: any = {}, retries: number = 3): Promise<AxiosResponse | null> {
    for (let i = 0; i < retries; i++) {
      try {
        const requestConfig = {
          method,
          url,
          ...this.axiosConfig,
          ...config,
          headers: {
            'Connection': 'keep-alive',
            'Keep-Alive': 'timeout=30',
            ...config.headers,
          },
        };

        const response = await axios(requestConfig);
        return response;
      } catch (error: any) {
        const errorMessage = error.message;
        const isConnectionError = errorMessage.includes('socket') || 
                                errorMessage.includes('TLS') || 
                                errorMessage.includes('timeout') ||
                                errorMessage.includes('network');

        if (isConnectionError) {
          logMessage(null, null, `Connection error: ${errorMessage}`, "error");
          if (i < retries - 1) {
            const delayTime = Math.min(2000 * (i + 1), 10000);
            await this.delay(delayTime);
            continue;
          }
        }

        if (i === retries - 1) {
          logMessage(null, null, `Request failed: ${errorMessage}`, "error");
          if (this.proxy) {
            logMessage(null, null, `Failed proxy: ${this.proxy}`, "error");
          }
          return null;
        }

        await this.delay(2000);
      }
    }
    return null;
  }

  async checkInvite(): Promise<boolean> {
    const inviteData = {
      invite_code: this.refCode,
    };
    const response = await this.makeRequest("post", "https://referral.layeredge.io/api/referral/verify-referral-code", {
      data: inviteData,
    });
  
    if (response && response.data && response.data.data.valid === true) {
      logMessage(null, null, "Invite Code Valid", "success");
      return true;
    } else {
      logMessage(null, null, "Failed to check invite", "error");
      return false;
    }
  }

  async registerWallet(): Promise<boolean> {
    const registerData = {
      walletAddress: this.wallet.address,
    };
  
    const response = await this.makeRequest("post", `https://referral.layeredge.io/api/referral/register-wallet/${this.refCode}`, {
      data: registerData,
    });
  
    if (response && response.data) {
      logMessage(null, null, "Wallet successfully registered", "success");
      return true;
    } else {
      logMessage(null, null, "Failed Referral", "error");
      return false;
    }
  }

  async connectNode(): Promise<boolean> {
    const timestamp = Date.now();
    const message = `Node activation request for ${this.wallet.address} at ${timestamp}`;
    const sign = this.wallet.sign(message).signature;
  
    const dataSign = {
      sign: sign,
      timestamp: timestamp,
    };
  
    const response = await this.makeRequest(
      "post",
      `https://referral.layeredge.io/api/light-node/node-action/${this.wallet.address}/start`,
      { data: dataSign }
    );

    if (response && response.data && response.data.message === 'node action executed successfully') {
      logMessage(null, null, "Connected Node", "success");
      return true;
    } else {
      logMessage(null, null, "Failed to connect Node", "error");
      return false;
    }
  }

  async checkNodeStatus(): Promise<boolean> {
    const response = await this.makeRequest("get", `https://referral.layeredge.io/api/light-node/node-status/${this.wallet.address}`);
    if (response && response.data && response.data.data.startTimestamp !== null) {
      logMessage(null, null, "Node Status Running", "success");
      return true;
    } else {
      logMessage(null, null, "Failed to check Node Status", "error");
      return false;
    }
  }
}