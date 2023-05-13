import { BigNumber } from "ethers";

/**
 * Return the median value of the list of BigNumbers.
 * If the list has an even number of values, return the mean of the two middle values.
 */
export function median(values: Array<BigNumber>): BigNumber
{
    const sortedValues: BigNumber[] = values.sort((a, b) => a.sub(b).toNumber());
    const middleIndex: number = Math.floor(sortedValues.length / 2);

    if (sortedValues.length % 2 === 0) {
        // Even number of values
        return sortedValues[middleIndex].add(sortedValues[middleIndex - 1]).div(2);
    } else {
        // Odd number of values
        return sortedValues[middleIndex];
    }
}

/**
 * Return the mean value of the list of BigNumbers.
 * If the list is empty, return zero.
 */
export function mean(values: Array<BigNumber>): BigNumber
{
    if (values.length === 0) {
        return BigNumber.from(0);
    } else {
        const sum: BigNumber = values.reduce((a, b) => a.add(b));
        return sum.div(values.length);
    }
}

/**
 * Return a random value from the list of BigNumbers
 */
export function random(values: Array<BigNumber>): BigNumber
{
    const randomIndex: number = Math.floor(Math.random() * values.length);
    return values[randomIndex];
}