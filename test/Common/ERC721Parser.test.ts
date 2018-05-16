import { contracts } from "../../src/common/tokens/contracts";
import { ERC721Parser } from "../../src/common/ERC721Parser"
import { TokenParser } from "../../src/common/TokenParser"
const chai = require("chai")
chai.use(require("chai-as-promised"))
const should = chai.should()
const expect = chai.expect
const assert = chai.assert

describe("Test ERC721Parser", () => {
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
                const getERC721Contract = new ERC721Parser().getERC721Contract
                const ERC721Address = "0x87d598064c736dd0c712d329afcfaa0ccc1921a1"
                const ERC721contract = await getERC721Contract(ERC721Address)

                expect(ERC721contract).to.have.property("name").eql("CryptoFighters")
                expect(ERC721contract).to.have.property("symbol").eql("CF")
                expect(ERC721contract).to.have.property("totalSupply").eql("4668")
                expect(ERC721contract).to.have.property("implementsERC721").eql(true)

        })
    })

    describe("Test getContract", () => {
        const getContract = new TokenParser().getContract

        it("Should get ERC721", async () => {
            const contract = "0xeda8b016efa8b1161208cf041cd86972eee0f31e"
            const result = await getContract(contract)

            result.should.have.property("verified").to.equal(true)
            result.should.have.property("name").eql("I HOUSE TOKEN")
            result.should.have.property("symbol").eql("IHT")
            result.should.have.property("decimals").eql(18)
            result.should.have.property("totalSupply").eql("1000000000000000000000000000")
        })
    })
})