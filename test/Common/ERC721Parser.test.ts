import { ERC721TransactionParser } from "../../src/common/ERC721TransactionParser"
import { TokenParser } from "../../src/common/TokenParser"
import { ERC721BlockParser } from "../../src/common/ERC721BlockParser";
import { Database } from "../../src/models/Database";
import { Config } from "../../src/common/Config";
import { TransactionParser } from "../../src/common/TransactionParser";
import {block, ethTransferTrx} from "../SeedData";
import {ITransaction} from "../../src/common/CommonInterfaces";

const config = require("config");
const chai = require("chai")
chai.use(require("chai-as-promised"))
const expect = chai.expect
const assert = chai.assert

describe("Test ERC721TransactionParser", () => {
    describe("Test isContractVerified", () => {
        const isContractVerified = new TokenParser().isContractVerified;
        it("Should return true when supply verified contract", () => {
            const contract = "0x87d598064c736dd0c712d329afcfaa0ccc1921a1"
            const expected = isContractVerified(contract)
            assert(true === expected);
        })
        it("Should return true when supply not verified contract", () => {
            const contract = "0x87d598064c736dd0c712d329afcfaa0ccc192???"
            const expected = isContractVerified(contract)
            assert(false === expected);
        })
    })

    describe("Test getERC721Contract", () => {
        it("Should successfully parse ERC721 compatible contract", async () => {
            const getERC721Contract = new ERC721TransactionParser().getERC721Contract
            const ERC721ContractAddress = "0x87d598064c736dd0c712d329afcfaa0ccc1921a1"
            const ERC721contract = await getERC721Contract(ERC721ContractAddress)

            expect(ERC721contract).to.have.property("name").eql("CryptoFighters")
            expect(ERC721contract).to.have.property("symbol").eql("CF")
            expect(ERC721contract).to.have.property("totalSupply").a("string")
            expect(ERC721contract).to.have.property("implementsERC721").eql(true)

        })
    })

    describe("Test getContractOwnerOf", () => {
        it("Should successfully the owner", async () => {
            const ERC721ContractAddress = "0x87d598064c736dd0c712d329afcfaa0ccc1921a1"
            const ERC721TokenId = "0x0000000000000000000000000000000000000000000000000000000000000e50"
            const name = await new ERC721TransactionParser().getContractName(ERC721ContractAddress)
            const owner = await new ERC721TransactionParser().getContractOwnerOf(ERC721ContractAddress, ERC721TokenId)

            expect(name).to.be.eq("CryptoFighters")
            expect(owner).to.be.eq("0xf126154B74B69cAe1Fbf2d8Cf7c43424C6eC5541")
        })
    })

    describe("Test ERC721BlockParser", () => {
        let db: Database;
        let erc721BlockParser: ERC721BlockParser;
        let transactionParser: TransactionParser;
        let block: any;

        before(async () => {
            db = new Database(config.get("MONGO.URI"));
            db.connect();

            erc721BlockParser = new ERC721BlockParser();
            transactionParser = new TransactionParser();

            block = await Config.web3.eth.getBlock(5665445, true);
        })

        it("Should parse block", () => {
            const result = erc721BlockParser.parseBlock(5665445)

            return expect(result).to.eventually.equal("result")
        })

        it("Should flatten blocks by filtering out invalid blocks such as null, block.transaction being null, and etc", () => {
            const blocks = [block, null, { transactions: null }, { transactions: [] }];
            const flatBlocks = erc721BlockParser.flatBlocksWithMissingTransactions(blocks);

            expect(flatBlocks.length).to.equal(1);
            expect(flatBlocks[0]).to.equal(block);
        })

        it("Should parse transactions from blocks", async () => {
            const rawTransaction = block.transactions.find (
                tx => tx.hash === "0xb2c6a21504db37e36c5daae3663c704bbba7f1c4b0d16441fc347756e6bbfc9b"
            );
            const transaction: ITransaction = rawTransaction;
            const extractedTransactionData = transactionParser.extractTransactionData(block, transaction);

            expect(extractedTransactionData._id).to.equal("0xb2c6a21504db37e36c5daae3663c704bbba7f1c4b0d16441fc347756e6bbfc9b");
            expect(extractedTransactionData.blockNumber).to.equal(5665445);
            expect(extractedTransactionData.timeStamp).to.equal("1527114762");
            expect(extractedTransactionData.nonce).to.equal(4);
            expect(extractedTransactionData.from).to.equal("0xe9e9f607d59da01e1c9a12a708ccfe7c9fdf8c32");
            expect(extractedTransactionData.to).to.equal("0xbe98850613ae66d49d1da1abeaed09daa0e90660");
            expect(extractedTransactionData.value).to.equal("123151800000000000");
            expect(extractedTransactionData.gas).to.equal("21000");
            expect(extractedTransactionData.gasPrice).to.equal("10000000000");
            expect(extractedTransactionData.gasUsed).to.equal("0");
            expect(extractedTransactionData.input).to.equal("0x");
            expect(extractedTransactionData.addresses.toString()).to.equal("0xe9e9f607d59da01e1c9a12a708ccfe7c9fdf8c32,0xbe98850613ae66d49d1da1abeaed09daa0e90660");

            const transactions = await transactionParser.parseTransactions([block]);

            expect(transactions.length).to.equal(178);
        })
    })
})