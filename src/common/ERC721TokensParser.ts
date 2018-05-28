import * as winston from "winston";
import { Config } from "./Config";
import { LastParsedBlock } from "../models/LastParsedBlockModel";
import { Token } from "../models/TokenModel";
import { TransactionParser } from "../common/TransactionParser";
import { setDelay } from "./Utils";
import { BlockchainState } from "./BlockchainState";
import { ERC721Parser } from "./ERC721Parser";

export class ERC721TokensParser {
    private erc721Parser = new ERC721Parser()

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

    parseBlock(block: number): Promise<any> {
        return TransactionParser.getTransactions(block).then((transactions: any) => {
            return this.erc721Parser.parseContracts(transactions)
        }).catch((error: Error) => {
            winston.error(`Error parsing block ${block}`, error)
        })
    }
}