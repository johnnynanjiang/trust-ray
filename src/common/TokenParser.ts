import * as winston from "winston";
import { ERC20Contract } from "../models/Erc20ContractModel";
import { ERC721Contract } from "../models/Erc721ContractModel";
import { Config } from "./Config";
import { getTokenBalanceForAddress, loadContractABIs } from "./Utils";
import { TransactionOperation } from "../models/TransactionOperationModel";
import { NotParsableContracts } from "../models/NotParsableContractModel";
import { Transaction } from "../models/TransactionModel";
import * as BluebirdPromise from "bluebird";
import { contracts } from "./tokens/contracts";
import { ERC20Parser }  from "./ERC20Parser";
import { ERC721TransactionParser }  from "./ERC721TransactionParser";
const flattenDeep = require("lodash.flattendeep");

export class TokenParser {
    private abiDecoder = require("abi-decoder");
    private abiList = loadContractABIs();
    private OperationTypes = {
        Transfer: "Transfer",
    }

    private erc20Parser = new ERC20Parser()
    private erc721Parser = new ERC721TransactionParser()

    private cachedContracts = {}

    constructor() {
        for (const abi of this.abiList) {
            this.abiDecoder.addABI(abi);
        }
    }

    public parseERC20Contracts(transactions: any) {
        if (!transactions) return Promise.resolve([undefined, undefined]);

        const contractAddresses: string[] = [];

        transactions.map((transaction: any) => {
            if (transaction.receipt.logs.length === 0 ) return;

            const decodedLogs = this.abiDecoder.decodeLogs(transaction.receipt.logs).filter((log: any) => log);

            if (decodedLogs.length === 0) return;

            decodedLogs.forEach((decodedLog: any) => {
                if (decodedLog.name === this.OperationTypes.Transfer) {
                    contractAddresses.push(decodedLog.address.toLowerCase());
                }
            })
        });

        const uniqueContracts = [...(new Set(contractAddresses))];
        const promises = uniqueContracts.map((contractAddress: any) => this.findOrCreateERC20Contract(contractAddress));

        return Promise.all(promises).then((contracts: any) => [transactions, this.flatContracts(contracts)])
            .catch((err: Error) => {
                winston.error(`Could not parse erc20 contracts with error: ${err}`);
            });
    }

    public extractContractAddressesFromTransactionsReceiptLogs(transactions): any[] {
        const contractAddresses: string[] = [];

        transactions.map((transaction: any) => {
            if (transaction.receipt.logs.length === 0 ) return;

            const decodedLogs = this.abiDecoder.decodeLogs(transaction.receipt.logs).filter((log: any) => log);

            if (decodedLogs.length === 0) return;

            decodedLogs.forEach((decodedLog: any) => {
                if (decodedLog.name === this.OperationTypes.Transfer) {
                    contractAddresses.push(decodedLog.address.toLowerCase());
                }
            })
        });

        return contractAddresses;
    }

    public filterOutDuplicates(contractAddresses): any[] {
        return [...(new Set(contractAddresses))];
    }

    public findOrCreateERC20Contract(contractAddress: string): Promise<any> {
        if (this.cachedContracts.hasOwnProperty(contractAddress)) {
            return Promise.resolve(this.cachedContracts[contractAddress]);
        }
        const isContractVerified: boolean = this.isContractVerified(contractAddress);
        const options = {new: true};
        return ERC20Contract.findOneAndUpdate({address: contractAddress}, {$set: {verified: isContractVerified}}, options).exec().then((erc20contract: any) => {
            // TODO: doesn't have to do null check, can set returnNewDocument to true
            // Mongodb document says: If returnNewDocument was false, the operation would return null as there is no original document to return.
            // @ https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate/
            if (!erc20contract) {
                return this.getContract(contractAddress);
            } else {
                this.cachedContracts[contractAddress] = erc20contract
                return Promise.resolve(erc20contract);
            }
        }).catch((err: Error) => {
            winston.error(`Could not find contract by id for ${contractAddress} with error: ${err}`);
        });
    }

    public getContract = async (contractAddress: string) => {
        try {
            const notParsableToken = await NotParsableContracts.findOne({address: contractAddress})
            if (notParsableToken) { Promise.resolve() }

            const isContractVerified: boolean = this.isContractVerified(contractAddress)

            const erc20Contract = await this.erc20Parser.getERC20Contract(contractAddress)

            const erc721Contract = await this.erc721Parser.getERC721Contract(contractAddress)
            if (erc721Contract) {
                const updatedERC721 = await this.updateERC721Token(contractAddress, erc721Contract.name, erc721Contract.symbol, erc721Contract.totalSupply, isContractVerified)
            }

            if (erc20Contract) {
                const updatedERC20 = await this.updateERC20Token(contractAddress, erc20Contract.name, erc20Contract.symbol, erc20Contract.decimals, erc20Contract.totalSupply, isContractVerified)
                return updatedERC20
            }

            const namePromise = await this.erc20Parser.getContractName(contractAddress)
            const symbolPromise = await this.erc20Parser.getContractSymbol(contractAddress)
            const decimalsPromise = await this.erc20Parser.getContractDecimals(contractAddress)
            const totalSupplyPromise = await this.erc20Parser.getContractTotalSupply(contractAddress)

            const [name, symbol, decimals, totalSupply] = await Promise.all([namePromise, symbolPromise, decimalsPromise, totalSupplyPromise])
            const updateERC20Token = await this.updateERC20Token(contractAddress, erc20Contract.name, erc20Contract.symbol, erc20Contract.decimals, erc20Contract.totalSupply, isContractVerified)

            return updateERC20Token;
        } catch (error) {
            winston.error(`Could not get contract ${contractAddress} with error ${error}`)
            const updateNotParsableContract = await this.updateNotParsableContract(contractAddress)
            return updateNotParsableContract
        }
    }

    public isContractVerified = (address: string): boolean => contracts[address] ? true : false;

    private convertSymbol(symbol: string): string {
        if (symbol.startsWith("0x")) {
            return Config.web3.utils.hexToAscii(symbol).replace(/\u0000*$/, "");
        }
        return symbol;
    }

    private async updateERC721Token(address: string, name: string, symbol: string, totalSupply: string, isContractVerified: boolean) {
        winston.warn(`****** updateERC721Token ${address}`)

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

    private async updateERC20Token(address: string, name: string, symbol: string, decimal: string, totalSupply: string, isContractVerified: boolean) {
        try {
            const update = await ERC20Contract.findOneAndUpdate({address}, {
                address,
                name,
                symbol,
                decimals: decimal,
                totalSupply,
                verified: isContractVerified
            }, {upsert: true, new: true, setDefaultsOnInsert: true})

            return update
        } catch (error) {
            winston.error(`Error updating ERC20 token`, error)
            return Promise.reject(error)
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


    public async getTokenBalances(address: string) {
        const addressOperations = await this.getOperationsByAddress(address);
        const flattenOperations = flattenDeep(addressOperations);
        const tokenContracts: any[] = this.extractTokenContracts(flattenOperations);
        const contractDetails: any = await this.getContractDetails(tokenContracts);

        return BluebirdPromise.map(contractDetails, (contract: any) => {
            return this.getTokenBalance(address, contract.address).then((balance: string) => {
                return {
                    balance,
                    contract: {
                        address: contract.address,
                        name: contract.name,
                        symbol: contract.symbol,
                        decimals: contract.decimals,
                    }
                }
            });
        });
    }

    public getTokenBalance(address: string, contractAddress: string) {
        const tokenAddress: string = address.substring(2);
        const getBalanceSelector: string = Config.web3.utils.sha3("balanceOf(address)").slice(0, 10);

        return Config.web3.eth.call({
            to: contractAddress,
            data: `${getBalanceSelector}000000000000000000000000${tokenAddress}`
        }).then((balance: string) => Config.web3.utils.toBN(balance).toString()
        ).catch((error: Error) => {
            winston.info("Error getting token balance ", error);
        });
    }

    private getOperationsByAddress(address: string) {
        return Transaction.find({"addresses": {$in: [address]}})
            .populate({
                path: "operations",
                model: "TransactionOperation",
                match: {$or: [
                                {to: {$eq: address}},
                                {from: {$eq: address}}
                            ]},
                populate: {
                    path: "contract",
                    model: "ERC20Contract",
                }
            }).exec().then((transactions: any) => transactions.map((transaction: any) => transaction.operations))
            .catch((error: Error) => {
                winston.error(`Error getting operations by address ${error}`)
            });
    }

    private extractTokenContracts(operations: any) {
        const tokenContracts: string[] = [];
        // extract tokens
        operations.map((operation: any) => {
            tokenContracts.push(operation.contract.address);
        });
        // remove duplicates
        return tokenContracts.reduce((a: any, b: any) => a.findIndex((e: any) => String(e) === String(b)) < 0
            ? [...a, b]
            : a, []);
    }

    private getContractDetails(contracts: string[]) {
        return BluebirdPromise.map(contracts, (contract: string) => {
            const contractPromise = ERC20Contract.findOne({address: contract}).exec();

            return contractPromise.then((contract: any) => {
                return {
                    address: contract.address,
                    symbol: contract.symbol,
                    decimals: contract.decimals,
                    name: contract.name,
                }
            }).catch((error: Error) => {
                winston.error(`Can not find ERC20 contract by address`, error);
            });
        });
    }
}