import * as winston from "winston";
import { Config } from "./Config";
import { LastParsedBlock } from "../models/LastParsedBlockModel";
import { Token } from "../models/TokenModel";
import { TransactionParser } from "../common/TransactionParser";
import { setDelay } from "./Utils";
import { BlockchainState } from "./BlockchainState";
import { ERC721Parser } from "./ERC721Parser";
import { TokenParser } from "./TokenParser";

export class ERC721TokensParser {
    private transactionParser: TransactionParser;
    private erc721Parser: ERC721Parser;
    private tokenParser: TokenParser;

    constructor() {
        this.transactionParser = new TransactionParser();
        this.erc721Parser = new ERC721Parser();
        this.tokenParser = new TokenParser();
    }

    start() {
        BlockchainState.getBlockState().then(([blockInChain, blockInDb]) => {
            const lastBlock: number = blockInDb.lastBlock
            const lastTokensBlock: number = blockInDb.lastTokensBlock
            if (lastTokensBlock <= lastBlock) {
                this.startParsingNextBlock(lastTokensBlock, lastBlock)
            } else {
                this.scheduleParsing()
            }
        })
    }

    startParsingNextBlock(block: number, lastBlock: number) {
        this.parseBlock(block).then((lastTokensBlock) => {
            return LastParsedBlock.findOneAndUpdate({}, {lastTokensBlock: block}, {new: true}).exec().then((res: any) => res.lastTokensBlock)
        }).then(lastTokensBlock => {
            const nextBlock: number = lastTokensBlock + 1
            if (nextBlock <= lastBlock) {
                setDelay(10).then(() => { this.startParsingNextBlock(nextBlock, lastBlock)} )
            } else {
                this.scheduleParsing()
            }
        }).catch(err => {
            winston.error(`startParsingNextBlock: ${err}`)
            this.scheduleParsing()
        })
    }

    scheduleParsing() {
        setDelay(5000).then(() => {
            this.start()
        })
    }

    parseBlock(blockNumber: number) {
        return Config.web3.eth.getBlock(
            blockNumber, true
        ).then((block) => {
            return this.transactionParser.parseTransactions(this.flatBlocksWithMissingTransactions([block]));
        }).then((transactions: any) => {
            return this.erc721Parser.parseERC721ContractsFromTransactions(transactions);
        }).then(([transactions, contracts]: any) => {
            return this.transactionParser.parseTransactionOperations(transactions, contracts);
        }).then(() => {
            return Promise.resolve();
        });
    }


    private flatBlocksWithMissingTransactions(blocks: any) {
        return blocks
            .map((block: any) => (block !== null && block.transactions !== null && block.transactions.length > 0)
                ? [block]
                : [])
            .reduce( (a: any, b: any) => a.concat(b), [] );
    }
}