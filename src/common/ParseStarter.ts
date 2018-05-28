import { BlockchainParser } from "./BlockchainParser";
import { TokensParser } from "./TokensParser";
import { BlockchainState } from "./BlockchainState";
import { PusherScanner } from "../pusher/PusherScanner";
import { setDelay } from "./Utils";
import { ERC721TokensParser } from "./ERC721TokensParser";

const parser = new BlockchainParser();
const pusher = new PusherScanner();
const tokensParser = new TokensParser();
const blockchainState = new BlockchainState();
const erc721TokensParser = new ERC721TokensParser();

export class ParseStarter {
    start(): void {
        blockchainState.getState().then(value => {
            this.startParsers()
        }).catch(err => {
            setDelay(5000).then(value => {
                this.start()
            })
        })
    }

    startParsers(): void {
        parser.start();
        pusher.start();
        tokensParser.start();
        erc721TokensParser.start();
    }
}
