import * as winston from "winston";
import { Config } from "./Config";
import * as BluebirdPromise from "bluebird";
import { nameABI, ownerOfABI, standardERC721ABI } from "./abi/ABI";

export class ERC721Parser {

    public convertHexToAscii(symbol: string): string {
        if (symbol.startsWith("0x")) {
            return Config.web3.utils.hexToAscii(symbol).replace(/\u0000*$/, "");
        }
        return symbol;
    }

    public getERC721Contract = async (contractAddress) => {
        try {
            const contract = await this.getContractInstance(contractAddress, standardERC721ABI)
            if (contract.indexOf(undefined) != -1) {
                throw new Error()
            }
            return {
                name: contract[0],
                symbol: contract[1],
                totalSupply: contract[2],
                implementsERC721: contract[3],
            }
        } catch (error) {
            winston.error(`Error getting standard ERC721 ${contractAddress} `, error)
            Promise.resolve()
        }
    }

    public getContractInstance = async (contractAddress, ABI, ... args: any[]) => {
            const contractPromise = BluebirdPromise.map(ABI, async (abi: any) => {
                try {
                    const contractInstance = new Config.web3.eth.Contract([abi], contractAddress);
                    if (args.length > 0) {
                        return await contractInstance.methods[abi.name](...args).call()
                    } else {
                        return await contractInstance.methods[abi.name]().call()
                    }
                } catch (error) {
                    winston.error(`Error getting ERC721 contract ${contractAddress} instance method ${abi.name}\n${error}`)
                    Promise.resolve()
                }
            })
            return contractPromise
    }

    public getContractName = async (contractAddress: string) => {
        try {
            const contractPromises = await this.getContractInstance(contractAddress, nameABI)
            const nameResults = await BluebirdPromise.all(contractPromises).then((names: any) => {
                const name =  names.filter((name: any) => typeof name === "string" && name.length > 0)
                return name
            })
            let name = nameResults.length > 0 ? nameResults[0] : "";
            if (name.startsWith("0x")) {
                name = this.convertHexToAscii(name)
            }
            return name;
        } catch (error) {
            winston.error(`Error getting contract ${contractAddress} name`)
            Promise.resolve()
        }
    }

    public getContractOwnerOf = async (contractAddress: string, tokenId: string) => {
        try {
            const contractPromises = await this.getContractInstance(contractAddress, ownerOfABI, tokenId)
            const ownerResults = await BluebirdPromise.all(contractPromises).then((owners: any) => {
                const owner =  owners.filter((owner: any) => typeof owner === "string" && owner.length > 0)
                return owner
            })
            return ownerResults.length > 0 ? ownerResults[0] : "";
        } catch (error) {
            winston.error(`Error getting ERC721 contract ${contractAddress} owner`)
            Promise.resolve()
        }
    }
}