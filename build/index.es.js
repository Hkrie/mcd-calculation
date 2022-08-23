import * as _ from 'lodash';

const convertToAbsoluteValueArray = (array) => {
    return array.map(Math.abs);
};
const isCompleteScan = (value, allowedLengthOfArrays) => {
    return value.length === allowedLengthOfArrays;
};
const calcAverageValueArray = (array, allowedLengthOfArrays) => {
    const average_values = [];
    for (let i = 0; i < array[0].length; i++) {
        const ion_currents_of_amu = [];
        array.forEach((value, index) => {
            //check if the measurement scan was complete and if so get the value
            if (isCompleteScan(value, allowedLengthOfArrays)) {
                ion_currents_of_amu.push(value[i]);
            }
        });
        const average_value = _.sum(convertToAbsoluteValueArray(ion_currents_of_amu)) / ion_currents_of_amu.length;
        average_values.push(average_value);
    }
    return average_values;
};
const removePressureData = (completeMeasurement) => {
    return completeMeasurement.map(data => data.values.slice(1));
};
function OptimizeCalibrationMeasurements(recipe, calibrationMixture, completeMeasurement) {
    const amus_of_calibration_measurement = recipe.rows.slice(1).map(row => row.mass);
    const raw_values = removePressureData(completeMeasurement.data);
    const average_ion_currents = calcAverageValueArray(raw_values, amus_of_calibration_measurement.length);
    return {
        amus: amus_of_calibration_measurement,
        ion_currents: average_ion_currents
    };
}
function newOptimizeMeasurement(recipe, calibrationMixture, lastCompleteMeasurement) {
    const amus_of_calibration_measurement = recipe.rows.slice(1).map(row => row.mass);
    const raw_values = convertToAbsoluteValueArray(lastCompleteMeasurement.data.values.slice(1));
    const AMPLIFIER_NOISE = 2 * Math.pow(10, -14);
    const reduced_values = raw_values.map(i => i - AMPLIFIER_NOISE)
        .map(i => i < 0 ? 0 : i);
    return {
        amus: amus_of_calibration_measurement,
        ion_currents: reduced_values
    };
}
function getPartialPressureForSymbol(partialPressures, symbol) {
    return partialPressures.filter(pp_obj => pp_obj.symbol === symbol)[0]["partialPressure"];
}
function getIonCurrentForAmu(measurementData, amu) {
    const index = measurementData["amus"].indexOf(amu);
    return measurementData["ion_currents"][index];
}
function calcSensitivities(calibrationMixture, partialPressures, measurementData) {
    return _.flatten(calibrationMixture.map(obj => {
        const partial_pressure = getPartialPressureForSymbol(partialPressures, obj.symbol);
        return obj.atomic_masses.map(amu => {
            const ion_current = getIonCurrentForAmu(measurementData, amu);
            return {
                symbol: obj.symbol,
                amu: amu,
                sensitivity: ion_current / partial_pressure
            };
        });
    }));
}
function getMoleculesWithUniqAmus(remainingMixture) {
    const arr = [];
    remainingMixture.forEach(obj => {
        const uniq_amus = obj.atomic_masses.filter(amu => {
            const amu_occurrences = remainingMixture.filter(obj2 => obj2.atomic_masses.includes(amu));
            return amu_occurrences.length === 1;
        });
        if (!_.isEmpty(uniq_amus)) {
            arr.push({
                symbol: obj.symbol,
                uniq_amus: uniq_amus
            });
        }
    });
    return arr;
}
function calcNormIonCurrents(resolvedIonCurrents, calibrationFactors) {
    return _.flatten(resolvedIonCurrents.map(obj => {
        return obj.amus.map((amu, index) => {
            const ion_current = obj.ion_currents[index];
            const calibration_factor = calibrationFactors.filter(cf_obj => cf_obj.symbol === obj.symbol && cf_obj.amu === amu)[0].calibrationFactor;
            return {
                symbol: obj.symbol,
                amu: amu,
                normIonCurrent: ion_current / calibration_factor
            };
        });
    }));
}
function getIonCurrentsPerUniqAmu(measurementData, uniqMolecule) {
    const uniq_ion_currents_per_amu = [];
    measurementData["amus"].forEach((amu, index) => {
        if (uniqMolecule.uniq_amus.includes(amu)) {
            uniq_ion_currents_per_amu.push({
                amu: amu,
                ion_current: measurementData["ion_currents"][index]
            });
        }
    });
    return uniq_ion_currents_per_amu;
}
function calcIonCurrentsForMoleculeAmus(proportionObjectForUniq, measurementData, uniqMolecule, uniqIonCurrentsPerAmu) {
    return proportionObjectForUniq.amu_proportions.amus.map((amu, index) => {
        const md_index = measurementData["amus"].indexOf(amu);
        if (uniqMolecule.uniq_amus.includes(amu)) {
            const ion_current = _.flatten(uniqIonCurrentsPerAmu.filter(obj => obj.amu === amu))[0].ion_current;
            measurementData.ion_currents[md_index] -= ion_current;
            return ion_current;
        }
        else { // else the ion currents of the element of this amu has to be calculated
            // get index of first uniq amu for the current symbol
            const uniq_index = proportionObjectForUniq.amu_proportions.amus.indexOf(uniqMolecule.uniq_amus[0]);
            const proportion_factor_uniq = proportionObjectForUniq.amu_proportions.proportions[uniq_index];
            const base_ion_current = _.flatten(uniqIonCurrentsPerAmu.filter(obj => obj.amu === uniqMolecule.uniq_amus[0]))[0].ion_current;
            const proportion_factor_current_amu = proportionObjectForUniq.amu_proportions.proportions[index];
            const ion_current = (base_ion_current / proportion_factor_uniq) * proportion_factor_current_amu;
            measurementData.ion_currents[md_index] -= ion_current;
            if (measurementData.ion_currents[md_index] < 0) {
                measurementData.ion_currents[md_index] = 0;
            }
            return ion_current;
        }
    });
}
function checkProportions(testGasMixture, proportions) {
    testGasMixture.map(obj => {
        const amus_of_substance = proportions.filter(proportionsObj => proportionsObj.amu_proportions.amus.sort().join(',') === obj.atomic_masses.sort().join(','));
        if (_.isEmpty(amus_of_substance)) {
            throw new Error("The calibration data is insufficient to resolve the test gas. " +
                "Please make sure that all substances in the test mixture where predefined in the calibration measurement (also with the same atomic masses!).");
        }
    });
}
function getSensitivityOf100PercentPeakOfReferenceSymbol(sensitivities, referenceSymbol) {
    const reference_sensitivities = sensitivities.filter(obj => obj.symbol === referenceSymbol);
    return Math.max(...reference_sensitivities.map(o => o.sensitivity));
}

function calcProportions(recipe, calibrationMixture, completeMeasurement) {
    const measurement_data = OptimizeCalibrationMeasurements(recipe, calibrationMixture, completeMeasurement);
    return calibrationMixture.map(obj => {
        const measurement_data_subset = {
            amus: obj.atomic_masses,
            ion_currents: obj.atomic_masses.map((amu) => {
                const index = measurement_data.amus.indexOf(amu);
                return measurement_data.ion_currents[index];
            })
        };
        const hundred_percent_peak_ion_current = _.max(measurement_data_subset["ion_currents"]) || 0;
        return {
            symbol: obj.symbol,
            amu_proportions: {
                amus: measurement_data_subset.amus,
                proportions: measurement_data_subset.ion_currents.map(ion_current => ion_current / hundred_percent_peak_ion_current)
            }
        };
    });
}
function calcPartialPressures(calibrationMixture, completeMeasurement) {
    const totalPressure = completeMeasurement.data[0]["values"][0];
    return calibrationMixture.map(obj => {
        return {
            symbol: obj.symbol,
            partialPressure: obj.concentration * totalPressure
        };
    });
}
function calcCalibrationFactors(calibrationMixture, recipe, completeMeasurement, partialPressures, referenceElementSymbol) {
    const measurement_data = OptimizeCalibrationMeasurements(recipe, calibrationMixture, completeMeasurement);
    const sensitivities = calcSensitivities(calibrationMixture, partialPressures, measurement_data);
    const reference_sensitivity = getSensitivityOf100PercentPeakOfReferenceSymbol(sensitivities, referenceElementSymbol);
    const calibrationFactors = sensitivities.map(obj => {
        return Object.assign(Object.assign({}, obj), { calibrationFactor: obj.sensitivity / reference_sensitivity });
    });
    return calibrationFactors;
}
function getResolveOrder(testGasMixture) {
    const resolveOrderSymbols = [];
    let remaining_mixture = [...testGasMixture];
    while (remaining_mixture.length) {
        const uniq_molecule_amus = getMoleculesWithUniqAmus(remaining_mixture);
        if (uniq_molecule_amus.length === 0) {
            throw new Error("There are to many overlapps in the atomic masses of the individual substances." +
                "Therefore the system of equations cannot be solved. Please try to use a different test gas mixture.");
        }
        resolveOrderSymbols.push(...uniq_molecule_amus);
        uniq_molecule_amus.forEach(item => {
            _.remove(remaining_mixture, (obj) => {
                return obj.symbol === item.symbol;
            });
        });
    }
    return resolveOrderSymbols;
}
function resolveIonCurrents(proportions, lastCompleteMeasurement, testGasMixture, recipe, resolveOrder) {
    const measurement_data = newOptimizeMeasurement(recipe, testGasMixture, lastCompleteMeasurement);
    checkProportions(testGasMixture, proportions);
    const ion_currents_per_amu_per_molecule = [];
    if (!resolveOrder) {
        resolveOrder = getResolveOrder(testGasMixture);
    }
    resolveOrder.forEach(uniqMolecule => {
        const proportion_object_for_uniq = _.flatten(proportions.filter(obj => obj.symbol === uniqMolecule.symbol))[0];
        const uniq_ion_currents_per_amu = getIonCurrentsPerUniqAmu(measurement_data, uniqMolecule);
        const all_ion_currents = calcIonCurrentsForMoleculeAmus(proportion_object_for_uniq, measurement_data, uniqMolecule, uniq_ion_currents_per_amu);
        ion_currents_per_amu_per_molecule.push({
            symbol: uniqMolecule.symbol,
            amus: proportion_object_for_uniq.amu_proportions.amus,
            ion_currents: all_ion_currents,
            total_ion_current: _.sum(all_ion_currents)
        });
    });
    return ion_currents_per_amu_per_molecule;
}
// export function resolveIonCurrents(proportions: Proportions, lastCompleteMeasurement: RawMeasurement, testGasMixture: TestMixture[], recipe: Recipe): ResolvedIonCurrents {
//     const measurement_data = newOptimizeMeasurement(recipe, testGasMixture, lastCompleteMeasurement);
//     //check if all substances in testMixture have their proportions defined
//     checkProportions(testGasMixture, proportions)
//     const ion_currents_per_amu_per_molecule: ResolvedIonCurrents = [];
//     const remaining_mixture = [...testGasMixture];
//     while (remaining_mixture.length) {
//
//         const uniq_molecule_amus = getMoleculesWithUniqAmus(remaining_mixture);
//
//         if (uniq_molecule_amus.length === 0) {
//             throw new Error("There are to many overlapps in the atomic masses of the individual substances." +
//                 "Therefore the system of equations cannot be solved. Please try to use a different test gas mixture.")
//         }
//
//
//         uniq_molecule_amus.forEach((uniqMolecule) => {
//             const proportion_object_for_uniq = _.flatten(proportions.filter(obj => obj.symbol === uniqMolecule!.symbol))[0];
//             const uniq_ion_currents_per_amu = getIonCurrentsPerUniqAmu(measurement_data, uniqMolecule);
//
//             // const all_ion_currents = proportion_object_for_uniq.amu_proportions.amus.map((amu, index) => {
//             //     const md_index = measurement_data["amus"].indexOf(amu);
//             //     if (uniqMolecule!.uniq_amus.includes(amu)) {
//             //         const ion_current = _.flatten(uniq_ion_currents_per_amu.filter(obj => obj!.amu === amu))[0]!.ion_current;
//             //         measurement_data.ion_currents[md_index] -= ion_current;
//             //         return ion_current;
//             //     } else {// else the ion currents of the element of this amu has to be calculated
//             //         // get index of first uniq amu for the current symbol
//             //         const uniq_index = proportion_object_for_uniq.amu_proportions.amus.indexOf(uniqMolecule!.uniq_amus[0]!);
//             //         const proportion_factor_uniq = proportion_object_for_uniq.amu_proportions.proportions[uniq_index];
//             //         const base_ion_current = _.flatten(uniq_ion_currents_per_amu.filter(obj => obj!.amu === uniqMolecule!.uniq_amus[0]))[0]!.ion_current;
//             //
//             //         const proportion_factor_current_amu = proportion_object_for_uniq.amu_proportions.proportions[index];
//             //         const ion_current = (base_ion_current / proportion_factor_uniq) * proportion_factor_current_amu;
//             //
//             //         measurement_data.ion_currents[md_index] -= ion_current;
//             //         return ion_current
//             //     }
//             // })
//             const all_ion_currents = calcIonCurrentsForMoleculeAmus(proportion_object_for_uniq, measurement_data, uniqMolecule, uniq_ion_currents_per_amu);
//
//             ion_currents_per_amu_per_molecule.push({
//                 symbol: uniqMolecule!.symbol,
//                 amus: proportion_object_for_uniq.amu_proportions.amus,
//                 ion_currents: all_ion_currents,
//                 total_ion_current: _.sum(all_ion_currents)
//             })
//             _.remove(remaining_mixture, obj => obj.symbol === uniqMolecule!.symbol)
//         })
//     }
//     return ion_currents_per_amu_per_molecule
// }
function calcConcentrations(testGasMixture, calibrationFactors, resolvedIonCurrents) {
    const norm_ion_currents = calcNormIonCurrents(resolvedIonCurrents, calibrationFactors);
    const sum_norm_ion_currents = _.sum(norm_ion_currents.map(obj => obj.normIonCurrent));
    const concentration_per_symbol_per_amu = norm_ion_currents.map(nic_obj => {
        return {
            symbol: nic_obj.symbol,
            amu: nic_obj.amu,
            concentration: nic_obj.normIonCurrent / sum_norm_ion_currents
        };
    });
    const concentrations = testGasMixture.map(obj => {
        const concentrationList = obj.atomic_masses.map(amu => {
            return concentration_per_symbol_per_amu.filter(object => object.symbol === obj.symbol && object.amu === amu)[0].concentration;
        });
        return {
            symbol: obj.symbol,
            amus: obj.atomic_masses,
            concentrations: concentrationList,
            total_concentration: _.sum(concentrationList)
        };
    });
    return concentrations;
}

export { calcCalibrationFactors, calcConcentrations, calcPartialPressures, calcProportions, getResolveOrder, resolveIonCurrents };
//# sourceMappingURL=index.es.js.map
