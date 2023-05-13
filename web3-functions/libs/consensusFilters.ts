import { BigNumber } from "ethers";

/**
 * @TODO: Update these functions so they work with small numbers
 *        Right now they only work with large numbers
 */

/**
 * Return all values with no filtering
 *
 * @param values A list of BigNumbers
 * @returns The orignal list of BigNumbers
 */
export function none(values: Array<BigNumber>): Array<BigNumber> {
  return values;
}

/**
 * Return all values that fall within the Mean Absolute Deviation of the mean
 *
 * @param values A list of BigNumbers
 * @returns A filtered list of BigNumbers
 */
export function mad(values: Array<BigNumber>): Array<BigNumber> {
  if (values.length === 0) return values;

  const mean: BigNumber = values
    .reduce((acc: BigNumber, val: BigNumber) => acc.add(val), BigNumber.from(0))
    .div(values.length);

  const deviations: BigNumber[] = values.map((num) => num.sub(mean).abs());

  const meanAbsoluteDeviation: BigNumber = deviations
    .reduce((acc: BigNumber, val: BigNumber) => acc.add(val), BigNumber.from(0))
    .div(deviations.length);

  // Calculate the lower and upper bounds of the filtered range
  const lowerBound: BigNumber = mean.sub(meanAbsoluteDeviation);
  const upperBound: BigNumber = mean.add(meanAbsoluteDeviation);

  // Filter the values that fall within the range
  const filteredValues: BigNumber[] = values.filter(
    (num) => num.gte(lowerBound) && num.lte(upperBound)
  );

  return filteredValues;
}

/**
 * Check to see if there is a majority of numbers that match each other
 * and return the majority value if there is one.
 *
 * If there are multiple sets of majority values, return all the values
 * that have a majority. If there is no majority, return the input array.
 *
 * For example:
 * [1, 1, 1, 2, 2, 3] would return [1]
 * [1, 1, 2, 2, 3] would return [1, 2]
 * [1, 2, 3] would return [1, 2, 3]
 *
 * @param values A list of BigNumbers
 * @returns A filtered list of BigNumbers
 */
export function majority(values: Array<BigNumber>): Array<BigNumber> {
  const majority = values.reduce((acc: any, curr) => {
    acc[curr.toString()] = (acc[curr.toString()] || 0) + 1;
    return acc;
  }, {});

  // Sort the keys by the number of times they appear in the array
  // Then create a set of the keys that appear the most often
  const mostCommon = new Set(
    Object.keys(majority)
      .sort((a, b) => majority[b] - majority[a])
      .filter((v, i, a) => majority[v] === majority[a[0]])
  );

  // Replace the values array with the set of most common values
  const filteredValues: BigNumber[] = Array.from(mostCommon).map((v) =>
    BigNumber.from(v)
  );

  return filteredValues;
}
