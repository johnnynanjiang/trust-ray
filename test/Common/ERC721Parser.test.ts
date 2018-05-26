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
            const ERC721ContractAddress = "0x87d598064c736dd0c712d329afcfaa0ccc1921a1"
            const ERC721contract = await getERC721Contract(ERC721ContractAddress)

            expect(ERC721contract).to.have.property("name").eql("CryptoFighters")
            expect(ERC721contract).to.have.property("symbol").eql("CF")
            expect(ERC721contract).to.have.property("totalSupply").a("string")
            expect(ERC721contract).to.have.property("implementsERC721").eql(true)

        })
    })

    // TODO: to implement
    describe("Test getOwnerOf", () => {
        it("Should successfully the owner", async () => {
            const getOwnerOf = new ERC721Parser().getOwnerOf
            const ERC721TokenId = "0x0000000000000000000000000000000000000000000000000000000000000e50"
            const owner = await getOwnerOf(ERC721TokenId)

            expect(owner).to.be.eq("string")
        })
    })
})