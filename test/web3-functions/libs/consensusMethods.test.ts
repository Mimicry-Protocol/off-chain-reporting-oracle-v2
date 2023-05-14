import { expect } from "chai";
import { test } from "mocha";
import { BigNumber } from "ethers";
import { 
    median, 
    mean, 
    random 
} from "./../../../web3-functions/libs/consensusMethods";

describe("median()", () => {
  test("returns the median value of a list of BigNumbers with odd length", () => {
    const values = [
      BigNumber.from(10),
      BigNumber.from(20),
      BigNumber.from(30),
      BigNumber.from(40),
      BigNumber.from(50),
    ];
    expect(median(values)).to.equal(BigNumber.from(30));
  });

  test("returns the median value of a list of BigNumbers with even length", () => {
    const values = [
      BigNumber.from(10),
      BigNumber.from(20),
      BigNumber.from(30),
      BigNumber.from(40),
    ];
    expect(median(values)).to.equal(BigNumber.from(20).add(BigNumber.from(30)).div(2));
  });
});

describe("mean()", () => {
  test("returns the mean value of a list of BigNumbers", () => {
    const values = [
      BigNumber.from(10),
      BigNumber.from(20),
      BigNumber.from(30),
      BigNumber.from(40),
      BigNumber.from(50),
    ];
    expect(mean(values)).to.equal(BigNumber.from(30));
  });

  test("returns zero when given an empty list", () => {
    expect(mean([])).to.equal(BigNumber.from(0));
  });
});

describe("random()", () => {
  test("returns a random value from a list of BigNumbers", () => {
    const values = [
      BigNumber.from(1),
      BigNumber.from(2),
      BigNumber.from(3),
      BigNumber.from(4),
      BigNumber.from(5),
    ];
    const randomValue = random(values);
    expect(values).to.contain(randomValue);
  });
});
