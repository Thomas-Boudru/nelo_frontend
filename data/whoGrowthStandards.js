/*
 * WHO Child Growth Standards — 0 à 18 mois.
 *
 * Paramètres LMS officiels pour :
 * - le poids selon l’âge ;
 * - la longueur selon l’âge ;
 * - le périmètre crânien selon l’âge.
 */

export const WHO_PERCENTILES = [
  {
    id: "p3",
    percentile: 3,
    zScore: -1.880794,
  },
  {
    id: "p15",
    percentile: 15,
    zScore: -1.036433,
  },
  {
    id: "p50",
    percentile: 50,
    zScore: 0,
  },
  {
    id: "p85",
    percentile: 85,
    zScore: 1.036433,
  },
  {
    id: "p97",
    percentile: 97,
    zScore: 1.880794,
  },
];

const girls = {
  weight: [
    [0.3809, 3.2322, 0.14171],
    [0.1714, 4.1873, 0.13724],
    [0.0962, 5.1282, 0.13],
    [0.0402, 5.8458, 0.12619],
    [-0.005, 6.4237, 0.12402],
    [-0.043, 6.8985, 0.12274],
    [-0.0756, 7.297, 0.12204],
    [-0.1039, 7.6422, 0.12178],
    [-0.1288, 7.9487, 0.12181],
    [-0.1507, 8.2254, 0.12199],
    [-0.17, 8.48, 0.12223],
    [-0.1872, 8.7192, 0.12247],
    [-0.2024, 8.9481, 0.12268],
    [-0.2158, 9.1699, 0.12283],
    [-0.2278, 9.387, 0.12294],
    [-0.2384, 9.6008, 0.12299],
    [-0.2478, 9.8124, 0.12303],
    [-0.2562, 10.0226, 0.12306],
    [-0.2637, 10.2315, 0.12309],
  ],

  height: [
    [1, 49.1477, 0.0379],
    [1, 53.6872, 0.0364],
    [1, 57.0673, 0.03568],
    [1, 59.8029, 0.0352],
    [1, 62.0899, 0.03486],
    [1, 64.0301, 0.03463],
    [1, 65.7311, 0.03448],
    [1, 67.2873, 0.03441],
    [1, 68.7498, 0.0344],
    [1, 70.1435, 0.03444],
    [1, 71.4818, 0.03452],
    [1, 72.771, 0.03464],
    [1, 74.015, 0.03479],
    [1, 75.2176, 0.03496],
    [1, 76.3817, 0.03514],
    [1, 77.5099, 0.03534],
    [1, 78.6055, 0.03555],
    [1, 79.671, 0.03576],
    [1, 80.7079, 0.03598],
  ],

  headCircumference: [
    [1, 33.8787, 0.03496],
    [1, 36.5463, 0.0321],
    [1, 38.2521, 0.03168],
    [1, 39.5328, 0.0314],
    [1, 40.5817, 0.03119],
    [1, 41.459, 0.03102],
    [1, 42.1995, 0.03087],
    [1, 42.829, 0.03075],
    [1, 43.3671, 0.03063],
    [1, 43.83, 0.03053],
    [1, 44.2319, 0.03044],
    [1, 44.5844, 0.03035],
    [1, 44.8965, 0.03027],
    [1, 45.1752, 0.03019],
    [1, 45.4265, 0.03012],
    [1, 45.6551, 0.03006],
    [1, 45.865, 0.02999],
    [1, 46.0598, 0.02993],
    [1, 46.2424, 0.02987],
  ],
};

const boys = {
  weight: [
    [0.3487, 3.3464, 0.14602],
    [0.2297, 4.4709, 0.13395],
    [0.197, 5.5675, 0.12385],
    [0.1738, 6.3762, 0.11727],
    [0.1553, 7.0023, 0.11316],
    [0.1395, 7.5105, 0.1108],
    [0.1257, 7.934, 0.10958],
    [0.1134, 8.297, 0.10902],
    [0.1021, 8.6151, 0.10882],
    [0.0917, 8.9014, 0.10881],
    [0.082, 9.1649, 0.10891],
    [0.073, 9.4122, 0.10906],
    [0.0644, 9.6479, 0.10925],
    [0.0563, 9.8749, 0.10949],
    [0.0487, 10.0953, 0.10976],
    [0.0413, 10.3108, 0.11007],
    [0.0343, 10.5228, 0.11041],
    [0.0275, 10.7319, 0.11079],
    [0.0211, 10.9385, 0.11119],
  ],

  height: [
    [1, 49.8842, 0.03795],
    [1, 54.7244, 0.03557],
    [1, 58.4249, 0.03424],
    [1, 61.4292, 0.03328],
    [1, 63.886, 0.03257],
    [1, 65.9026, 0.03204],
    [1, 67.6236, 0.03165],
    [1, 69.1645, 0.03139],
    [1, 70.5994, 0.03124],
    [1, 71.9687, 0.03117],
    [1, 73.2812, 0.03118],
    [1, 74.5388, 0.03125],
    [1, 75.7488, 0.03137],
    [1, 76.9186, 0.03154],
    [1, 78.0497, 0.03174],
    [1, 79.1458, 0.03197],
    [1, 80.2113, 0.03222],
    [1, 81.2487, 0.0325],
    [1, 82.2587, 0.03279],
  ],

  headCircumference: [
    [1, 34.4618, 0.03686],
    [1, 37.2759, 0.03133],
    [1, 39.1285, 0.02997],
    [1, 40.5135, 0.02918],
    [1, 41.6317, 0.02868],
    [1, 42.5576, 0.02837],
    [1, 43.3306, 0.02817],
    [1, 43.9803, 0.02804],
    [1, 44.53, 0.02796],
    [1, 44.9998, 0.02792],
    [1, 45.4051, 0.0279],
    [1, 45.7573, 0.02789],
    [1, 46.0661, 0.02789],
    [1, 46.3395, 0.02789],
    [1, 46.5844, 0.02791],
    [1, 46.806, 0.02792],
    [1, 47.0088, 0.02795],
    [1, 47.1962, 0.02797],
    [1, 47.3711, 0.028],
  ],
};

export const WHO_GROWTH_LMS = {
  female: girls,
  male: boys,
};

export function getWhoValue(lms, zScore) {
  if (!lms) {
    return null;
  }

  const [L, M, S] = lms;

  if (L === 0) {
    return M * Math.exp(S * zScore);
  }

  const base = 1 + L * S * zScore;

  return base > 0 ? M * Math.pow(base, 1 / L) : null;
}

export function getWhoCurves(sex, measurementId) {
  const normalizedSex = sex === "male" ? "male" : "female";

  const rows = WHO_GROWTH_LMS[normalizedSex]?.[measurementId] ?? [];

  return WHO_PERCENTILES.map((percentile) => ({
    ...percentile,

    points: rows.map((lms, month) => ({
      month,
      value: getWhoValue(lms, percentile.zScore),
    })),
  }));
}

export function getWhoPercentileEstimate(sex, measurementId, ageMonths, value) {
  if (!Number.isFinite(ageMonths) || !Number.isFinite(value)) {
    return null;
  }

  const normalizedSex = sex === "male" ? "male" : "female";

  const rows = WHO_GROWTH_LMS[normalizedSex]?.[measurementId];

  if (!rows?.length) {
    return null;
  }

  const lowerMonth = Math.max(
    0,
    Math.min(Math.floor(ageMonths), rows.length - 1),
  );

  const upperMonth = Math.min(lowerMonth + 1, rows.length - 1);

  const ratio = Math.max(0, Math.min(ageMonths - lowerMonth, 1));

  const interpolated = rows[lowerMonth].map(
    (number, index) => number + (rows[upperMonth][index] - number) * ratio,
  );

  const [L, M, S] = interpolated;

  const zScore =
    L === 0 ? Math.log(value / M) / S : (Math.pow(value / M, L) - 1) / (L * S);

  /*
   * Approximation de la fonction de répartition normale.
   */
  const sign = zScore < 0 ? -1 : 1;
  const absolute = Math.abs(zScore) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * absolute);

  const erf =
    sign *
    (1 -
      ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
        t +
        0.254829592) *
        t *
        Math.exp(-absolute * absolute));

  return Math.max(1, Math.min(99, Math.round(((1 + erf) / 2) * 100)));
}
