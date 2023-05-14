import { expect } from "chai";
import { test } from "mocha";
import { BigNumber } from "ethers";
import { 
    none, 
    mad, 
    majority
} from "../../../web3-functions/libs/consensusFilters";

const values: Array<BigNumber> = [
    BigNumber.from(10),
    BigNumber.from(20),
    BigNumber.from(30),
    BigNumber.from(40),
    BigNumber.from(50),
    BigNumber.from(60),
    BigNumber.from(70),
    BigNumber.from(80),
    BigNumber.from(90),
    BigNumber.from(100),
];

describe("none", () => {
    test("returns the original list of values", () => {
        expect(none(values)).to.equal(values);
    });
});

// describe("mad", () => {
//     test("filters out values outside the mean absolute deviation", () => {
//         const filtered = mad(values);
//         expect(filtered).to.equal([
//             BigNumber.from(30),
//             BigNumber.from(40),
//             BigNumber.from(50),
//             BigNumber.from(60),
//             BigNumber.from(70),
//             BigNumber.from(80),
//         ]);
//     });
// });

// describe("majority", () => {
//     test("returns the majority value(s)", () => {
//       const filtered = majority([BigNumber.from(10), BigNumber.from(10), BigNumber.from(20), BigNumber.from(20), BigNumber.from(30)]);
//       expect(filtered).to.equal([BigNumber.from(10), BigNumber.from(20)]);
//     });
  
//     test("returns all values if there is no majority", () => {
//       const filtered = majority([BigNumber.from(10), BigNumber.from(20), BigNumber.from(30)]);
//       expect(filtered).to.equal([BigNumber.from(10), BigNumber.from(20), BigNumber.from(30)]);
//     });
// });
