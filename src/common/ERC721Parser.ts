import * as winston from "winston";
import { Config } from "./Config";
import * as BluebirdPromise from "bluebird";
import { nameABI, ownerOfABI, standardERC721ABI } from "./abi/ABI";
import { NotParsableContracts } from "../models/NotParsableContractModel";
import { contracts } from "./tokens/contracts";
import { ERC721Contract } from "../models/Erc721ContractModel";

export class ERC721Parser {
    private abiDecoder = require("abi-decoder");
    private OperationTypes = ["Transfer", "Approval"];
    private cachedContracts = {};

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
                    return await contractInstance.methods[abi.name](...args).call()
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

    public parseERC721ContractsFromTransactions(transactions: any) {
        if (!transactions) return Promise.resolve([undefined, undefined]);

        const contractAddresses: string[] = [];

        transactions.map((transaction: any) => {
            if (transaction.receipt.logs.length === 0 ) return;

            const decodedLogs = this.abiDecoder.decodeLogs(transaction.receipt.logs).filter((log: any) => log);

            if (decodedLogs.length === 0) return;

            decodedLogs.forEach((decodedLog: any) => {
                if (this.OperationTypes.indexOf(decodedLog.name)) {
                    contractAddresses.push(decodedLog.address.toLowerCase());
                }
            })
        });

        const uniqueContracts = [...(new Set(contractAddresses))];
        const promises = uniqueContracts.map((contractAddress: any) => this.findOrCreateContract(contractAddress));

        return Promise.all(promises).then((contracts: any) => [transactions, this.flatContracts(contracts)])
            .catch((err: Error) => {
                winston.error(`Could not parse erc721 contracts with error: ${err}`);
            });
    }

    private findOrCreateContract(contractAddress: string): Promise<void> {
        if (this.cachedContracts.hasOwnProperty(contractAddress)) {
            return Promise.resolve(this.cachedContracts[contractAddress]);
        }
        const isContractVerified: boolean = this.isContractVerified(contractAddress);
        const options = {new: true};
        return ERC721Contract.findOneAndUpdate({address: contractAddress}, {$set: {verified: isContractVerified}}, options).exec().then((erc721contract: any) => {
            // TODO: doesn't have to do null check, can set returnNewDocument to true
            // Mongodb document says: If returnNewDocument was false, the operation would return null as there is no original document to return.
            // @ https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate/
            if (!erc721contract) {
                return this.getContract(contractAddress);
            } else {
                this.cachedContracts[contractAddress] = erc721contract
                return Promise.resolve(erc721contract);
            }
        }).catch((err: Error) => {
            winston.error(`Could not find contract by id for ${contractAddress} with error: ${err}`);
        });
    }

    private flatContracts(contracts: any) {
        // remove undefined contracts
        const flatUndefinedContracts =  contracts
            .map((contract: any) => (contract !== undefined && contract !== null)
                ? [contract]
                : [])
            .reduce( (a: any, b: any) => a.concat(b), [] );
        // remove duplicates
        return flatUndefinedContracts
            .reduce((a: any, b: any) => a.findIndex((e: any) => e.address == b.address) < 0
                ? [...a, b]
                : a, []);
    }

    public getContract = async (contractAddress: string) => {
        try {
            const notParsableToken = await NotParsableContracts.findOne({address: contractAddress})
            if (notParsableToken) { Promise.resolve() }

            const isContractVerified: boolean = this.isContractVerified(contractAddress)

            var erc721Contract = await this.getERC721Contract(contractAddress)
            if (erc721Contract) {
                erc721Contract = await this.updateERC721Token(contractAddress, erc721Contract.name, erc721Contract.symbol, erc721Contract.totalSupply, isContractVerified)
            }
            return erc721Contract;
        } catch (error) {
            winston.error(`Could not get contract ${contractAddress} with error ${error}`)
            const updateNotParsableContract = await this.updateNotParsableContract(contractAddress)
            return updateNotParsableContract
        }
    }

    private async updateNotParsableContract(address: string) {
        try {
            await NotParsableContracts.findOneAndUpdate({address}, {address}, {upsert: true, new: true}).then((savedNonParsable: any) => {
                winston.info(`Saved ${savedNonParsable} to non-parsable contracts`)
            })
        } catch (error) {
            winston.error(`Could not save non-parsable contract ${address} with error`, error);
            return Promise.reject(error)
        }
    }

    public isContractVerified = (address: string): boolean => contracts[address] ? true : false;

    private async updateERC721Token(address: string, name: string, symbol: string, totalSupply: string, isContractVerified: boolean) {
        try {
            const update = await ERC721Contract.findOneAndUpdate({address}, {
                address,
                name,
                symbol,
                totalSupply,
                verified: isContractVerified
            }, {upsert: true, new: true, setDefaultsOnInsert: true})

            return update
        } catch (error) {
            winston.error(`Error updating ERC721 token`, error)
            return Promise.reject(error)
        }
    }
}