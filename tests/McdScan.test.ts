import {
    calcCalibrationFactors,
    calcPartialPressures,
    calcProportions,
    getResolveOrder,
    updatedResolveIonCurrents
} from "../src/McdScan";
import {
    calcIonCurrentsForMoleculeAmus,
    calcSensitivities,
    getIonCurrentsPerUniqAmu,
    getSensitivityOf100PercentPeakOfReferenceSymbol,
    OptimizeCalibrationMeasurements
} from "../src/HelperFunctions";
import {RawMeasurement} from "../src/types";

export {
    calcProportions,
    calcCalibrationFactors,
    calcConcentrations,
    calcPartialPressures,
    resolveIonCurrents,
    getResolveOrder
} from "../src/McdScan";

test("getResolveOrder returns the correct order to resolve the gas mixture", () => {
    const example_testgas_data = [
        {
            "atomic_masses": [1, 2, 3],
            "symbol": "test0"
        },
        {
            "atomic_masses": [1, 2, 3, 4],
            "symbol": "test1"
        },
        {
            "atomic_masses": [1, 2, 3, 4, 5],
            "symbol": "test2"
        },
        {
            "atomic_masses": [6, 1, 2, 3, 4],
            "symbol": "test3"
        }];
    expect(getResolveOrder(example_testgas_data)).toStrictEqual([
        {
            "symbol": "test2",
            "uniq_amus": [5]
        },
        {
            "symbol": "test3",
            "uniq_amus": [6]
        },
        {
            "symbol": "test1",
            "uniq_amus": [4]
        },
        {
            "symbol": "test0",
            "uniq_amus": [1, 2, 3]
        }
    ]);
})

test("getIonCurrentsPerUniqAmu", () => {
    const completeOptimizedMeasurement = {
        "amus": [1, 2, 3, 4, 5, 6],
        "ion_currents": [10, 2, 3, 5, 1, 1.35]
    }
    const uniqMolecule = [
        {
            "symbol": "test2",
            "uniq_amus": [5]
        },
        {
            "symbol": "test3",
            "uniq_amus": [6]
        },
        {
            "symbol": "test1",
            "uniq_amus": [4]
        },
        {
            "symbol": "test0",
            "uniq_amus": [1, 2, 3]
        }
    ]

    expect(getIonCurrentsPerUniqAmu(completeOptimizedMeasurement, uniqMolecule[0])).toStrictEqual([{"amu": 5, "ion_current": 1}])
    expect(getIonCurrentsPerUniqAmu(completeOptimizedMeasurement, uniqMolecule[1])).toStrictEqual([{"amu": 6, "ion_current": 1.35}])
    expect(getIonCurrentsPerUniqAmu(completeOptimizedMeasurement, uniqMolecule[2])).toStrictEqual([{"amu": 4, "ion_current": 5}])
    expect(getIonCurrentsPerUniqAmu(completeOptimizedMeasurement, uniqMolecule[3])).toStrictEqual([{"amu": 1, "ion_current": 10},{"amu": 2, "ion_current": 2},{"amu": 3, "ion_current": 3}])
})

test("calcIonCurrentsForMoleculeAmus", ()=>{
    const proportionObjectForUniq = {
        "amu_proportions": {
            "amus": [
                1,
                2,
                3,
                4,
                5
            ],
            "proportions": [
                5 / 11,
                2 / 11,
                3 / 11,
                11 / 11,
                3 / 11
            ]
        },
        "symbol": "test2"
    };
    const measurementData = {
        "amus": [1, 2, 3, 4, 5, 6],
        "ion_currents": [10, 2, 3, 3.5, 1, 1.35]
    };
    const uniqMolecule = {
        "symbol": "test2",
        "uniq_amus": [5]
    }
    const uniqIonCurrentsPerAmu = [{"amu": 5, "ion_current": 1}];

    expect(calcIonCurrentsForMoleculeAmus(proportionObjectForUniq, measurementData, uniqMolecule, uniqIonCurrentsPerAmu)).toStrictEqual([
        1 / (3/11) * (5/11),
        1 / (3/11) * (2/11),
        1 / (3/11) * (3/11),
        1 / (3/11) * (11/11),
        1 / (3/11) * (3/11)
    ])
    expect(measurementData).toStrictEqual({
        "amus": [1, 2, 3, 4, 5, 6],
        "ion_currents": [
            10 - 1 / (3/11) * (5/11),
            2 - 1 / (3/11) * (2/11),
            3 - 1 / (3/11) * (3/11),
            0, //because: 3.5 - 1 / (3/11) * (11/11) is smaller than zero, it's set to zero
            1 - 1 / (3/11) * (3/11),
            1.35
        ]
    })
})

test("updatedResolveIonCurrents to return the correct array with resolve Order specified", ()=>{
    const testGasMixture = [
        {
            "atomic_masses": [1, 2, 3],
            "symbol": "test0"
        },
        {
            "atomic_masses": [1, 2, 3, 4],
            "symbol": "test1"
        },
        {
            "atomic_masses": [1, 2, 3, 4, 5],
            "symbol": "test2"
        },
        {
            "atomic_masses": [6, 1, 2, 3, 4],
            "symbol": "test3"
        }];
    const resolveOrder = getResolveOrder(testGasMixture);
    const proportions = [
        {
            "amu_proportions": {
                "amus": [
                    1,
                    2,
                    3
                ],
                "proportions": [
                    10 / 10,
                    2 / 10,
                    3 / 10
                ]
            },
            "symbol": "test0"
        },
        {
            "amu_proportions": {
                "amus": [
                    1,
                    2,
                    3,
                    4
                ],
                "proportions": [
                    1 / 9,
                    2 / 9,
                    9 / 9,
                    1.5/9
                ]
            },
            "symbol": "test1"
        },
        {
            "amu_proportions": {
                "amus": [
                    1,
                    2,
                    3,
                    4,
                    5
                ],
                "proportions": [
                    5 / 11,
                    2 / 11,
                    3 / 11,
                    11 / 11,
                    3 / 11
                ]
            },
            "symbol": "test2"
        },
        {
            "amu_proportions": {
                "amus": [
                    6,
                    1,
                    2,
                    3,
                    4
                ],
                "proportions": [
                    1 / 4,
                    2 / 4,
                    1 / 4,
                    0.5 / 4,
                    0.25 / 4
                ]
            },
            "symbol": "test3"
        },
    ];
    const completeMeasurement = {
        name: "got",
        origin: "/mmsp/measurement/scans",
        data: {
            scannum: 0,
            scansize: 7,
            values: [
                5 * 10 ** -5,
                10,
                2,
                3,
                5,
                1,
                1.35
            ]
        }
    } as RawMeasurement;
    const recipe = {
        dwell: 32,
        mode: "MASSES",
        rows: [
            {
                type: "MASS",
                special: "PRESSURE"
            },
            {
                type: "MASS",
                mass: 1
            },
            {
                type: "MASS",
                mass: 2
            },
            {
                type: "MASS",
                mass: 3
            },
            {
                type: "MASS",
                mass: 4
            },
            {
                type: "MASS",
                mass: 5
            },
            {
                type: "MASS",
                mass: 6
            }
        ]
    };
    expect(updatedResolveIonCurrents(proportions, completeMeasurement, testGasMixture, recipe, resolveOrder)).toStrictEqual([
        {
            "amus": [
                1,
                2,
                3,
                4,
                5
            ],
            "ion_currents": [
                1.6666666666666334,
                0.6666666666666534,
                0.99999999999998,
                3.6666666666665937,
                0.99999999999998
            ],
            "symbol": "test2",
            "total_ion_current": 7.99999999999984
        },
        {
            "amus": [
                1,
                2,
                3,
                4,
                6
            ],
            "ion_currents": [
                5.39999999999992,
                10.79999999999984,
                5.39999999999992,
                2.69999999999996,
                1.34999999999998
            ],
            "symbol": "test3",
            "total_ion_current": 25.649999999999622
        },
        {
            "amus": [
                1,
                2,
                3,
                4
            ],
            "ion_currents": [
                0,
                0,
                0,
                0
            ],
            "symbol": "test1",
            "total_ion_current": 0
        },
        {
            "amus": [
                1,
                2,
                3
            ],
            "ion_currents": [
                2.933333333333426,
                0,
                0
            ],
            "symbol": "test0",
            "total_ion_current": 2.933333333333426
        }
    ])
})

test("calcProportions returns correct proportions per amu per symbol", () => {
    const recipe = {
        dwell: 32,
        mode: "MASSES",
        rows: [
            {
                type: "MASS",
                special: "PRESSURE"
            },
            {
                type: "MASS",
                mass: 1
            },
            {
                type: "MASS",
                mass: 2
            },
            {
                type: "MASS",
                mass: 3
            },
            {
                type: "MASS",
                mass: 4
            },
            {
                type: "MASS",
                mass: 5
            },
            {
                type: "MASS",
                mass: 6
            },
            {
                type: "MASS",
                mass: 7
            },
            {
                type: "MASS",
                mass: 8
            },

        ]
    };

    const calibrationMixture = [
        {
            "atomic_masses": [1, 2, 3],
            "symbol": "test0",
            concentration: 10
        },
        {
            "atomic_masses": [4, 5],
            "symbol": "test1",
            concentration: 20
        },
        {
            "atomic_masses": [6, 7],
            "symbol": "test2",
            concentration: 30
        },
        {
            "atomic_masses": [8],
            "symbol": "test3",
            concentration: 40
        }];

    const completeMeasurement = {
        name: "got",
        origin: "/mmsp/measurement/scans",
        data: [{
            scannum: 0,
            scansize: 7,
            values: [
                5 * 10 ** -5,
                10,
                2,
                3,
                5,
                1,
                1.35,
                3.4,
                1.23
            ]
        }]
    };
    expect(calcProportions(recipe, calibrationMixture, completeMeasurement)).toStrictEqual([
        {
            "amu_proportions": {
                "amus": [
                    1,
                    2,
                    3
                ],
                "proportions": [
                    10 / 10,
                    2 / 10,
                    3 / 10
                ]
            },
            "symbol": "test0"
        },
        {
            "amu_proportions": {
                "amus": [
                    4,
                    5
                ],
                "proportions": [
                    5 / 5,
                    1 / 5
                ]
            },
            "symbol": "test1"
        },
        {
            "amu_proportions": {
                "amus": [
                    6,
                    7
                ],
                "proportions": [
                    1.35 / 3.4,
                    3.4 / 3.4
                ]
            },
            "symbol": "test2"
        },
        {
            "amu_proportions": {
                "amus": [
                    8
                ],
                "proportions": [
                    1.23 / 1.23
                ]
            },
            "symbol": "test3"
        }
    ])
})

test("calcPartialPressures return correct partial pressures per symbol", () => {
    const calibrationMixture = [
        {
            "atomic_masses": [1, 2, 3],
            "symbol": "test0",
            concentration: 10
        },
        {
            "atomic_masses": [4, 5],
            "symbol": "test1",
            concentration: 20
        },
        {
            "atomic_masses": [6, 7],
            "symbol": "test2",
            concentration: 30
        },
        {
            "atomic_masses": [8],
            "symbol": "test3",
            concentration: 40
        }];

    const completeMeasurement = {
        name: "got",
        origin: "/mmsp/measurement/scans",
        data: [{
            scannum: 0,
            scansize: 9,
            values: [
                5 * 10 ** -5,
                10,
                2,
                3,
                5,
                1,
                1.35,
                3.4,
                1.23
            ]
        }]
    };

    expect(calcPartialPressures(calibrationMixture, completeMeasurement)).toStrictEqual([
        {
            "partialPressure": 5 * 10 ** -5 * 10,
            "symbol": "test0"
        },
        {
            "partialPressure": 5 * 10 ** -5 * 20,
            "symbol": "test1"
        },
        {
            "partialPressure": 5 * 10 ** -5 * 30,
            "symbol": "test2"
        },
        {
            "partialPressure": 5 * 10 ** -5 * 40,
            "symbol": "test3"
        }
    ]);
})

test("OptimizeCalibrationMeasurements return the correct array", () => {
    const calibrationMixture = [
        {
            "atomic_masses": [1, 2, 3],
            "symbol": "test0",
            concentration: 10
        },
        {
            "atomic_masses": [4, 5],
            "symbol": "test1",
            concentration: 20
        },
        {
            "atomic_masses": [6, 7],
            "symbol": "test2",
            concentration: 30
        },
        {
            "atomic_masses": [8],
            "symbol": "test3",
            concentration: 40
        }];
    const completeMeasurement = {
        name: "got",
        origin: "/mmsp/measurement/scans",
        data: [{
            scannum: 0,
            scansize: 9,
            values: [
                5 * 10 ** -5,
                10,
                2,
                3,
                5,
                1,
                1.35,
                3.4,
                1.23
            ]
        }]
    };
    const recipe = {
        dwell: 32,
        mode: "MASSES",
        rows: [
            {
                type: "MASS",
                special: "PRESSURE"
            },
            {
                type: "MASS",
                mass: 1
            },
            {
                type: "MASS",
                mass: 2
            },
            {
                type: "MASS",
                mass: 3
            },
            {
                type: "MASS",
                mass: 4
            },
            {
                type: "MASS",
                mass: 5
            },
            {
                type: "MASS",
                mass: 6
            },
            {
                type: "MASS",
                mass: 7
            },
            {
                type: "MASS",
                mass: 8
            },

        ]
    };

    expect(OptimizeCalibrationMeasurements(recipe, calibrationMixture, completeMeasurement)).toStrictEqual({
        "amus": [1, 2, 3, 4, 5, 6, 7, 8],
        "ion_currents": [10, 2, 3, 5, 1, 1.35, 3.4, 1.23]
    })
})

test("calcSensitivities return the correct array", () => {
    const calibrationMixture = [
        {
            "atomic_masses": [1, 2, 3],
            "symbol": "test0",
            concentration: 10
        },
        {
            "atomic_masses": [4, 5],
            "symbol": "test1",
            concentration: 20
        },
        {
            "atomic_masses": [6, 7],
            "symbol": "test2",
            concentration: 30
        },
        {
            "atomic_masses": [8],
            "symbol": "test3",
            concentration: 40
        }];

    const partialPressures = [
        {
            "partialPressure": 5 * 10 ** -5 * 10,
            "symbol": "test0"
        },
        {
            "partialPressure": 5 * 10 ** -5 * 20,
            "symbol": "test1"
        },
        {
            "partialPressure": 5 * 10 ** -5 * 30,
            "symbol": "test2"
        },
        {
            "partialPressure": 5 * 10 ** -5 * 40,
            "symbol": "test3"
        }
    ];
    const optimizedMeasurementData = {
        "amus": [1, 2, 3, 4, 5, 6, 7, 8],
        "ion_currents": [10, 2, 3, 5, 1, 1.35, 3.4, 1.23]
    };

    expect(calcSensitivities(calibrationMixture, partialPressures, optimizedMeasurementData)).toStrictEqual([
        {
            "amu": 1,
            "sensitivity": optimizedMeasurementData.ion_currents[0] / partialPressures[0].partialPressure,
            "symbol": "test0"
        },
        {
            "amu": 2,
            "sensitivity": optimizedMeasurementData.ion_currents[1] / partialPressures[0].partialPressure,
            "symbol": "test0"
        },
        {
            "amu": 3,
            "sensitivity": optimizedMeasurementData.ion_currents[2] / partialPressures[0].partialPressure,
            "symbol": "test0"
        },
        {
            "amu": 4,
            "sensitivity": optimizedMeasurementData.ion_currents[3] / partialPressures[1].partialPressure,
            "symbol": "test1"
        },
        {
            "amu": 5,
            "sensitivity": optimizedMeasurementData.ion_currents[4] / partialPressures[1].partialPressure,
            "symbol": "test1"
        },
        {
            "amu": 6,
            "sensitivity": optimizedMeasurementData.ion_currents[5] / partialPressures[2].partialPressure,
            "symbol": "test2"
        },
        {
            "amu": 7,
            "sensitivity": optimizedMeasurementData.ion_currents[6] / partialPressures[2].partialPressure,
            "symbol": "test2"
        },
        {
            "amu": 8,
            "sensitivity": optimizedMeasurementData.ion_currents[7] / partialPressures[3].partialPressure,
            "symbol": "test3"
        }
    ])
})

test("getSensitivityOf100PercentPeakOfReferenceSymbol", () => {
    const partialPressures = [
        {
            "partialPressure": 5 * 10 ** -5 * 10,
            "symbol": "test0"
        },
        {
            "partialPressure": 5 * 10 ** -5 * 20,
            "symbol": "test1"
        },
        {
            "partialPressure": 5 * 10 ** -5 * 30,
            "symbol": "test2"
        },
        {
            "partialPressure": 5 * 10 ** -5 * 40,
            "symbol": "test3"
        }
    ];
    const optimizedMeasurementData = {
        "amus": [1, 2, 3, 4, 5, 6, 7, 8],
        "ion_currents": [2, 9, 3, 5, 1, 1.35, 3.4, 1.23]
    };
    const sensitivities = [
        {
            "amu": 1,
            "sensitivity": optimizedMeasurementData.ion_currents[0] / partialPressures[0].partialPressure,
            "symbol": "test0"
        },
        {
            "amu": 2,
            "sensitivity": optimizedMeasurementData.ion_currents[1] / partialPressures[0].partialPressure,
            "symbol": "test0"
        },
        {
            "amu": 3,
            "sensitivity": optimizedMeasurementData.ion_currents[2] / partialPressures[0].partialPressure,
            "symbol": "test0"
        },
        {
            "amu": 4,
            "sensitivity": optimizedMeasurementData.ion_currents[3] / partialPressures[1].partialPressure,
            "symbol": "test1"
        },
        {
            "amu": 5,
            "sensitivity": optimizedMeasurementData.ion_currents[4] / partialPressures[1].partialPressure,
            "symbol": "test1"
        },
        {
            "amu": 6,
            "sensitivity": optimizedMeasurementData.ion_currents[5] / partialPressures[2].partialPressure,
            "symbol": "test2"
        },
        {
            "amu": 7,
            "sensitivity": optimizedMeasurementData.ion_currents[6] / partialPressures[2].partialPressure,
            "symbol": "test2"
        },
        {
            "amu": 8,
            "sensitivity": optimizedMeasurementData.ion_currents[7] / partialPressures[3].partialPressure,
            "symbol": "test3"
        }
    ]


    expect(getSensitivityOf100PercentPeakOfReferenceSymbol(sensitivities, "test0")).toBe(
        optimizedMeasurementData.ion_currents[1] / partialPressures[0].partialPressure
    )
})

test("calcCalibrationFactors return the correct array", () => {

    const calibrationMixture = [
        {
            "atomic_masses": [1, 2, 3],
            "symbol": "test0",
            concentration: 10
        },
        {
            "atomic_masses": [4, 5],
            "symbol": "test1",
            concentration: 20
        },
        {
            "atomic_masses": [6, 7],
            "symbol": "test2",
            concentration: 30
        },
        {
            "atomic_masses": [8],
            "symbol": "test3",
            concentration: 40
        }];
    const completeMeasurement = {
        name: "got",
        origin: "/mmsp/measurement/scans",
        data: [{
            scannum: 0,
            scansize: 9,
            values: [
                5 * 10 ** -5,
                2,
                9,
                3,
                5,
                1,
                1.35,
                3.4,
                1.23
            ]
        }]
    };
    const recipe = {
        dwell: 32,
        mode: "MASSES",
        rows: [
            {
                type: "MASS",
                special: "PRESSURE"
            },
            {
                type: "MASS",
                mass: 1
            },
            {
                type: "MASS",
                mass: 2
            },
            {
                type: "MASS",
                mass: 3
            },
            {
                type: "MASS",
                mass: 4
            },
            {
                type: "MASS",
                mass: 5
            },
            {
                type: "MASS",
                mass: 6
            },
            {
                type: "MASS",
                mass: 7
            },
            {
                type: "MASS",
                mass: 8
            },

        ]
    };
    const partialPressures = [
        {
            "partialPressure": 5 * 10 ** -5 * 10,
            "symbol": "test0"
        },
        {
            "partialPressure": 5 * 10 ** -5 * 20,
            "symbol": "test1"
        },
        {
            "partialPressure": 5 * 10 ** -5 * 30,
            "symbol": "test2"
        },
        {
            "partialPressure": 5 * 10 ** -5 * 40,
            "symbol": "test3"
        }
    ];
    const referenceElementSymbol = "test0";

    const optimizedMeasurementData = {
        "amus": [1, 2, 3, 4, 5, 6, 7, 8],
        "ion_currents": [2, 9, 3, 5, 1, 1.35, 3.4, 1.23]
    };
    const sensitivities = [
        {
            "amu": 1,
            "sensitivity": optimizedMeasurementData.ion_currents[0] / partialPressures[0].partialPressure,
            "symbol": "test0"
        },
        {
            "amu": 2,
            "sensitivity": optimizedMeasurementData.ion_currents[1] / partialPressures[0].partialPressure,
            "symbol": "test0"
        },
        {
            "amu": 3,
            "sensitivity": optimizedMeasurementData.ion_currents[2] / partialPressures[0].partialPressure,
            "symbol": "test0"
        },
        {
            "amu": 4,
            "sensitivity": optimizedMeasurementData.ion_currents[3] / partialPressures[1].partialPressure,
            "symbol": "test1"
        },
        {
            "amu": 5,
            "sensitivity": optimizedMeasurementData.ion_currents[4] / partialPressures[1].partialPressure,
            "symbol": "test1"
        },
        {
            "amu": 6,
            "sensitivity": optimizedMeasurementData.ion_currents[5] / partialPressures[2].partialPressure,
            "symbol": "test2"
        },
        {
            "amu": 7,
            "sensitivity": optimizedMeasurementData.ion_currents[6] / partialPressures[2].partialPressure,
            "symbol": "test2"
        },
        {
            "amu": 8,
            "sensitivity": optimizedMeasurementData.ion_currents[7] / partialPressures[3].partialPressure,
            "symbol": "test3"
        }
    ];

    expect(calcCalibrationFactors(calibrationMixture, recipe, completeMeasurement, partialPressures, referenceElementSymbol)).toStrictEqual([
        {
            "amu": 1,
            "calibrationFactor": sensitivities[0].sensitivity / sensitivities[1].sensitivity,
            "sensitivity": 4000,
            "symbol": "test0"
        },
        {
            "amu": 2,
            "calibrationFactor": sensitivities[1].sensitivity / sensitivities[1].sensitivity,
            "sensitivity": 18000,
            "symbol": "test0"
        },
        {
            "amu": 3,
            "calibrationFactor": sensitivities[2].sensitivity / sensitivities[1].sensitivity,
            "sensitivity": 6000,
            "symbol": "test0"
        },
        {
            "amu": 4,
            "calibrationFactor": sensitivities[3].sensitivity / sensitivities[1].sensitivity,
            "sensitivity": 5000,
            "symbol": "test1"
        },
        {
            "amu": 5,
            "calibrationFactor": sensitivities[4].sensitivity / sensitivities[1].sensitivity,
            "sensitivity": 1000,
            "symbol": "test1"
        },
        {
            "amu": 6,
            "calibrationFactor": sensitivities[5].sensitivity / sensitivities[1].sensitivity,
            "sensitivity": 900.0000000000002,
            "symbol": "test2"
        },
        {
            "amu": 7,
            "calibrationFactor": sensitivities[6].sensitivity / sensitivities[1].sensitivity,
            "sensitivity": 2266.666666666667,
            "symbol": "test2"
        },
        {
            "amu": 8,
            "calibrationFactor": sensitivities[7].sensitivity / sensitivities[1].sensitivity,
            "sensitivity": 615,
            "symbol": "test3"
        }
    ])
})

// test("calcConcentrations", ()=>{
//
// })