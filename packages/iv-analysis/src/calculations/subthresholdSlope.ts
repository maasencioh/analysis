import { MeasurementXY } from 'cheminfo-types';
import fit from 'ml-savitzky-golay';

import { MedianSlopeResult, SlopeOptions } from './types';

/**
 * Calculates the slope of the subthreshold current.
 *
 * @param measurement - The measurement to calculate the subthreshold slope.
 * @param options - Options for the calculation.
 * @returns - The subthreshold slope.
 */
export function subthresholdSlope(
  measurement: MeasurementXY,
  options: SlopeOptions = {},
): MedianSlopeResult | null {
  const { delta = 1e-2 } = options;
  let { fromIndex, toIndex } = options;

  const x = measurement.variables.x.data as number[];
  const dx = Math.abs(x[0] - x[1]);
  if (dx === 0) return null;

  const y = measurement.variables.y.data.map((val) =>
    Math.log10(val),
  ) as number[];
  const dy = fit(y, dx, { derivative: 1 });

  if (fromIndex === undefined) {
    let maxDiffIndex = 0;
    let maxDiff = -1;
    for (let i = 0; i < dy.length - 1; i++) {
      const diff = Math.abs(dy[i] - dy[i + 1]);
      if (diff > maxDiff) {
        maxDiff = diff;
        maxDiffIndex = i;
      }
    }

    if (maxDiff !== -1) {
      fromIndex = maxDiffIndex;
    }
  }

  let xRes = [];
  let yRes = [];
  let firstSkip = false;

  for (
    let j = fromIndex ?? 0;
    j < y.length - 1 && (toIndex === undefined || j < toIndex);
    j++
  ) {
    if (Math.abs(dy[j + 1] - dy[j]) > delta) {
      xRes.push(x[j]);
      yRes.push(y[j]);
    } else if (firstSkip) {
      toIndex = j;
    } else {
      firstSkip = true;
    }
  }

  // Checks convergence
  if (toIndex === undefined || fromIndex === undefined) return null;

  const medianIndex = fromIndex + Math.floor((toIndex - fromIndex) / 2);
  return {
    medianSlope: { value: 1 / dy[medianIndex], units: 'V/dec' },
    toIndex,
    fromIndex,
  };
}
