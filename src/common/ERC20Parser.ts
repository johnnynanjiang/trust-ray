import * as winston from "winston";
import { Config } from "./Config";
import * as BluebirdPromise from "bluebird";
import { nameABI, symbolABI, decimalsABI, totalSupplyABI, standardERC20ABI } from "./abi/ABI";

export class ERC20Parser {

    public convertHexToAscii(symbol: string): string {
        if (symbol.startsWith("0x")) {
            return Config.web3.utils.hexToAscii(symbol).replace(/\u0000*$/, "");
        }
        return symbol;
    }

    public getERC20Contract = async (contractAddress) => {
        try {
            const contract = await this.getContractInstance(contractAddress, standardERC20ABI)
            if (contract.indexOf(undefined) != -1) {
                throw new Error()
            }
            return {
                name: contract[0],
                symbol: contract[1],
                decimals: contract[2],
                totalSupply: contract[3],
            }
        } catch (error) {
            winston.error(`Error getting standard ERC20 ${contractAddress} `, error)
            Promise.resolve()
        }
    }

    public getContractInstance = async (contractAddress, ABI) => {
            const contractPromise = BluebirdPromise.map(ABI, async (abi: any) => {
                try {
                    const contractInstance = new Config.web3.eth.Contract([abi], contractAddress);
                    const value = await contractInstance.methods[abi.name]().call()
                    return value;
                } catch (error) {
                    winston.error(`Error getting contract ${contractAddress} instance method ${abi.name}`)
                    Promise.resolve()
                }
            })
            return contractPromise
     }
}