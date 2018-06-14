import { Config } from "./Config";
import { LastParsedBlock } from "../models/LastParsedBlockModel";

export class BlockchainState {
    getState(): Promise<any> {
        return BlockchainState.getBlockState().then(([blockInChain, blockInDb]) => {
            if (!blockInDb) {
                return new LastParsedBlock({
                    lastBlock: blockInChain,
                    lastBackwardBlock: blockInChain,
                    lastPusherBlock: blockInChain,
                    lastTokensBlock: blockInChain,
                    lastTokensBackwardBlock: blockInChain,
                    lastTokensBlockForERC721: blockInChain,
                    lastTokensBackwardBlockForERC721: blockInChain
                }).save()
            }

            if (!blockInDb.lastBlock) {
                blockInDb.lastBlock = blockInChain
            }

            if (!blockInDb.lastBackwardBlock) {
                blockInDb.lastBackwardBlock = blockInChain
            }

            if (!blockInDb.lastPusherBlock) {
                blockInDb.lastPusherBlock = blockInChain
            }

            if (!blockInDb.lastTokensBlock) {
                blockInDb.lastTokensBlock = blockInChain
            }

            if (!blockInDb.lastTokensBackwardBlock) {
                blockInDb.lastTokensBackwardBlock = blockInChain
            }

            if (!blockInDb.lastTokensBlockForERC721) {
                blockInDb.lastTokensBlockForERC721 = blockInChain
            }

            if (!blockInDb.lastTokensBackwardBlockForERC721) {
                blockInDb.lastTokensBackwardBlockForERC721 = blockInChain
            }

            return blockInDb.save()
        })
    }

    static getBlockState(): Promise<any[]> {
        const latestBlockOnChain = Config.web3.eth.getBlockNumber();
        const latestBlockInDB = LastParsedBlock.findOne();
        return Promise.all([latestBlockOnChain, latestBlockInDB]);
    }
}
