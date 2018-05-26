import * as winston from "winston";
import { Config } from "./Config";
import * as BluebirdPromise from "bluebird";
import { ownerOfABI, standardERC721ABI } from "./abi/ABI";

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

    public getContractInstance = async (contractAddress, ABI) => {
            const contractPromise = BluebirdPromise.map(ABI, async (abi: any) => {
                try {
                    const contractInstance = new Config.web3.eth.Contract([abi], contractAddress);
                    const value = await contractInstance.methods[abi.name]().call()
                    return value;
                } catch (error) {
                    winston.error(`Error getting ERC721 contract ${contractAddress} instance method ${abi.name}`)
                    Promise.resolve()
                }
            })
            return contractPromise
    }

    // TODO: to implement
    public getOwnerOf = async (contractAddress: string) => {
        try {
            const contractPromises = await this.getContractInstance(contractAddress, ownerOfABI)
            const ownerResults = await BluebirdPromise.all(contractPromises).then((owners: any) => {
                const owner =  owners.filter((owner: any) => typeof owner === "string" && owner.length > 0)
                return owner
            })
            let owner = ownerResults.length > 0 ? ownerResults[0] : "";
            if (owner.startsWith("0x")) {
                owner = this.convertHexToAscii(owner)
            }
            return owner;
        } catch (error) {
            winston.error(`Error getting ERC721 contract ${contractAddress} owner`)
            Promise.resolve()
        }
    }
}