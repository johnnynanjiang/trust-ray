import { ERC721TransactionParser } from "../../src/common/ERC721TransactionParser"
import { TokenParser } from "../../src/common/TokenParser"
import {ERC721BlockParser} from "../../src/common/ERC721BlockParser";
import { Database } from "../../src/models/Database";

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
        it("Should run", () => {
            const db = new Database(config.get("MONGO.URI"));
            db.connect();

            const erc721BlockParser = new ERC721BlockParser()
            const result = erc721BlockParser.parseBlock(5665445)

            return expect(result).to.eventually.equal("result")
        })
    })
})