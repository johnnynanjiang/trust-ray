import { contracts } from "../../src/common/tokens/contracts";
import { ERC20Parser } from "../../src/common/ERC20Parser"
import { TokenParser } from "../../src/common/TokenParser"
const chai = require("chai")
chai.use(require("chai-as-promised"))
const should = chai.should()
const expect = chai.expect
const assert = chai.assert

describe("Test ERC20Parser", () => {
    describe("Test isContractVerified", () => {
        const isContractVerified = new TokenParser().isContractVerified;
        it("Should return true when supply verified contract", () => {
            const contract = "0x5f3789907b35dce5605b00c0be0a7ecdbfa8a841"
            const expected = isContractVerified(contract)
            assert(true === expected);
        })
        it("Should return true when supply not verified contract", () => {
            const contract = "0x5f3789907b35dce5605b00c0be0a7ecdbfrandom"
            const expected = isContractVerified(contract)
            assert(false === expected);
        })
    })

    describe("Test getERC20Contract", () => {
        it("Should successfully parse ERC20 compatible contract", async () => {
                const getERC20Contract = new ERC20Parser().getERC20Contract
                const erc20Address = "0xeda8b016efa8b1161208cf041cd86972eee0f31e"
                const erc20contract = await getERC20Contract(erc20Address)

                expect(erc20contract).to.have.property("name").eql("I HOUSE TOKEN")
                expect(erc20contract).to.have.property("symbol").eql("IHT")
                expect(erc20contract).to.have.property("decimals").eql("18")
                expect(erc20contract).to.have.property("totalSupply").eql("1000000000000000000000000000")

        })
    })

    describe("Test getContract", () => {
        const getContract = new TokenParser().getContract

        it("Should get ERC20", async () => {
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