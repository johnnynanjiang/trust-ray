import { ERC721TransactionParser } from "../../src/common/ERC721TransactionParser"
import { TokenParser } from "../../src/common/TokenParser"
import { ERC721BlockParser } from "../../src/common/ERC721BlockParser";
import { Database } from "../../src/models/Database";
import { Config } from "../../src/common/Config";
import { TransactionParser } from "../../src/common/TransactionParser";
import { ITransaction } from "../../src/common/CommonInterfaces";

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

        it("Should parse a transaction from a block", async () => {
            const transactionHash = "0xb2c6a21504db37e36c5daae3663c704bbba7f1c4b0d16441fc347756e6bbfc9b";
            const rawTransaction = block.transactions.find(tx => tx.hash === transactionHash);
            const transaction: ITransaction = rawTransaction;
            const extractedTransaction = transactionParser.extractTransactionData(block, transaction);

            expect(extractedTransaction._id).to.equal(transactionHash);
            expect(extractedTransaction.blockNumber).to.equal(5665445);
            expect(extractedTransaction.timeStamp).to.equal("1527114762");
            expect(extractedTransaction.nonce).to.equal(4);
            expect(extractedTransaction.from).to.equal("0xe9e9f607d59da01e1c9a12a708ccfe7c9fdf8c32");
            expect(extractedTransaction.to).to.equal("0xbe98850613ae66d49d1da1abeaed09daa0e90660");
            expect(extractedTransaction.value).to.equal("123151800000000000");
            expect(extractedTransaction.gas).to.equal("21000");
            expect(extractedTransaction.gasPrice).to.equal("10000000000");
            expect(extractedTransaction.gasUsed).to.equal("0");
            expect(extractedTransaction.input).to.equal("0x");
            expect(extractedTransaction.addresses.toString()).to.equal("0xe9e9f607d59da01e1c9a12a708ccfe7c9fdf8c32,0xbe98850613ae66d49d1da1abeaed09daa0e90660");
        })

        it("Should fetch receipts from a transaction", async () => {
            const transactionHash = "0xb2c6a21504db37e36c5daae3663c704bbba7f1c4b0d16441fc347756e6bbfc9b";
            const receipts = await transactionParser.fetchTransactionReceipts([transactionHash]);

            expect(receipts.length).to.equal(1);
            expect(receipts[0].from).to.equal("0xe9e9f607d59da01e1c9a12a708ccfe7c9fdf8c32");
            expect(receipts[0].to).to.equal("0xbe98850613ae66d49d1da1abeaed09daa0e90660");
            expect(receipts[0].transactionHash).to.equal(transactionHash);
            expect(receipts[0].transactionIndex).to.equal(177);
            expect(receipts[0].gasUsed).to.equal(21000);
        })

        it("Should merge transactions and receipts into updated transactions", async () => {
            const extractedTransactions = transactionParser.extractTransactionsFromBlock(block);
            const txIDs = transactionParser.getTransactionIDsFromExtractedTransactions(extractedTransactions);
            const receipts = await transactionParser.fetchTransactionReceipts(txIDs);

            expect(extractedTransactions.length).to.equal(178);
            expect(receipts.length).to.equal(178);
            extractedTransactions.map((x) => {
                expect(x.hasOwnProperty("receipt")).to.equal(false);
            });

            const mergedTransactions = await transactionParser.mergeTransactionsAndReceipts(extractedTransactions, receipts);

            expect(mergedTransactions.length).to.equal(178);
            mergedTransactions.map((tx) => {
                expect(tx.receipt).to.equal(
                    receipts.find(r => r.transactionHash === tx._id)
                );
            });
        })

        it("Should parse a block", async () => {
            const transactions = await transactionParser.parseTransactions([block]);

            expect(transactions.length).to.equal(178);
        })
    })
})