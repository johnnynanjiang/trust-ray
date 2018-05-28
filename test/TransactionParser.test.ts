
import { TransactionParser } from "../src/common/TransactionParser";
import * as mocha from "mocha";
import { block, contractCreateTrx, ethTransferTrx } from "./SeedData";
import { should, expect } from "chai"
import { Config } from "../src/common/Config";


describe("Test TransactionParser", () => {
    describe("Test extractTransactionData()", () => {
        const extractTransactionData = new TransactionParser().extractTransactionData;
        it("Should extract transaction data", () => {
            const transaction = extractTransactionData(block, ethTransferTrx);

            transaction.should.to.have.property("_id").to.be.a("string");
            transaction.should.to.have.property("blockNumber").to.be.a("number");
            transaction.should.to.have.property("timeStamp").to.be.a("string");
            transaction.should.to.have.property("nonce").to.be.a("number");
            transaction.should.to.have.property("from").to.be.a("string");
            transaction.should.to.have.property("to").to.be.a("string");
            transaction.should.to.have.property("value").to.be.a("string");
            transaction.should.to.have.property("gas").to.be.a("string");
            transaction.should.to.have.property("gasPrice").to.be.a("string");
            transaction.should.to.have.property("gasUsed").to.be.a("string");
            transaction.should.to.have.property("input").to.be.a("string");
            transaction.should.to.have.property("addresses").to.be.a("array").to.have.lengthOf(2);
        })

        it("Should extract contract creation transaction correctly", () => {
            const transaction = extractTransactionData(block, contractCreateTrx);

            expect(transaction.to).to.equal("");
            expect(transaction.addresses).to.have.lengthOf(1);
        })
    })

    describe("Test parseTransactions()", () => {
        it("Should parse transactions from a block", async () => {
            const block = await Config.web3.eth.getBlock(5577780, true);
            expect(block.transactions.length).to.equal(157);
        })
    })
})