import * as _ from 'lodash';

const convertToAbsoluteValueArray = (array) => {
    return array.map(Math.abs);
};
const calcAverageValueArray = (array, allowedLengthOfArrays) => {
    const average_values = [];
    for (let i = 0; i < array.length; i++) {
        const ion_currents_of_amu = [];
        array.forEach((value, index) => {
            //check if the measurement scan was complete and if so get the value
            if (value.length === allowedLengthOfArrays) {
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
    // get amus
    const amus_of_calibration_measurement = recipe.rows.slice(1).map(row => row.mass);
    const raw_values = removePressureData(completeMeasurement.data);
    const average_ion_currents = calcAverageValueArray(raw_values, amus_of_calibration_measurement.length);
    // const AMPLIFIER_NOISE = 2 * 10 ** -14;
    // const reduced_values = raw_values.map(i => i - AMPLIFIER_NOISE)
    //     .map(i => i < 0 ? 0 : i)
    return {
        amus: amus_of_calibration_measurement,
        ion_currents: average_ion_currents
    };
}
function newOptimizeMeasurement(recipe, calibrationMixture, lastCompleteMeasurement) {
    // get amus
    const amus_of_calibration_measurement = recipe.rows.slice(1).map(row => row.mass);
    // get ion_currents
    const raw_values = convertToAbsoluteValueArray(lastCompleteMeasurement.data.values.slice(1));
    // const AMPLIFIER_NOISE = 2 * 10 ** -14;
    // const reduced_values = raw_values.map(i => i - AMPLIFIER_NOISE)
    //     .map(i => i < 0 ? 0 : i)
    return {
        amus: amus_of_calibration_measurement,
        ion_currents: raw_values
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
            return ion_current;
        }
    });
}
// export function optimizeCalibrationMeasurementData(rawPrismaproCalibrationMeasurementData: RawMeasurement, ppAMU: number, calibrationMixture: ICalibrationMixture) {
//     const usableDataOfFirstDataset = rawPrismaproCalibrationMeasurementData.data[-2]["values"].slice(2,);
//
//     const prismaProMeasurementData = {
//         "amus": _.range(0, usableDataOfFirstDataset.length * (1 / ppAMU), 1 / ppAMU),
//         "ion_currents": absoluteValueArray(usableDataOfFirstDataset)
//     }
//
//     const wholeAmuData = {
//         "amus": roundToWholeNumbers(getEveryNth(prismaProMeasurementData["amus"], ppAMU)),
//         "ion_currents": getEveryNth(prismaProMeasurementData["ion_currents"], ppAMU),
//     }
//
//     const amuList: number[] = get100PercentPeaks(calibrationMixture);
//     const IntensitiesForAmus: number[] = getIntensitiesForAmus(amuList, wholeAmuData)
//
//     return {
//         "amus": amuList,
//         "ion_currents": IntensitiesForAmus
//     };
// }
// export function optimizeMeasurementData(rawPrismaproMeasurementData: RawMeasurement, ppAMU: number, calibrationMixture: ICalibrationMixture) {
//     const usableDataOfFirstDataset = rawPrismaproMeasurementData.data[0]["values"].slice(2,);
//
//     const prismaProMeasurementData = {
//         "amus": _.range(0, usableDataOfFirstDataset.length * (1 / ppAMU), 1 / ppAMU),
//         "ion_currents": absoluteValueArray(usableDataOfFirstDataset)
//     }
//
//     const wholeAmuData = {
//         "amus": roundToWholeNumbers(getEveryNth(prismaProMeasurementData["amus"], ppAMU)),
//         "ion_currents": getEveryNth(prismaProMeasurementData["ion_currents"], ppAMU),
//     }
//
//     const amuList: number[] = get100PercentPeaks(calibrationMixture);
//     const IntensitiesForAmus: number[] = getIntensitiesForAmus(amuList, wholeAmuData)
//
//     return {
//         "amus": amuList,
//         "ion_currents": IntensitiesForAmus
//     };
// }
// function absoluteValueArray(array: number[]) {
//     return array.map(Math.abs);
// }
// function getEveryNth(arr: Array<any>, nth: number) {
//     const result = [];
//
//     for (let i = 0; i < arr.length; i += nth) {
//         result.push(arr[i]);
//     }
//
//     return result;
// }
// function roundToWholeNumbers(arrOfNumbers: number[]) {
//     return arrOfNumbers.map(num => {
//         return Math.round(num);
//     });
// }
// function getIntensitiesForAmus(amuList: number[], wholeAmuData: { amus: number[], ion_currents: number[] }) {
//     return amuList.map(amu => {
//         const indexOfAmu = wholeAmuData.amus.indexOf(amu);
//         return wholeAmuData.ion_currents[indexOfAmu]
//     })
// }
// function get100PercentPeaks(calibrationMixture: ICalibrationMixture) {
//     const allAmuList = calibrationMixture.map(element => element["atomic_masses"][0]);
//
//     return _.uniq(allAmuList)
// }
// export function calcSensitivities(
//     optimizedCalibrationMeasurementData: IOptimizedMeasurementData,
//     calibrationMixture: ICalibrationMixture,
//     totalPressure: number
// ) {
//     const partialPressures: IPartialPressures = calcPartialPressures(calibrationMixture, totalPressure);
//
//     const sensitivities = {};
//     calibrationMixture.forEach(elementData => {
//         const atomic_mass = elementData["atomic_masses"][0];
//         const intensityIndex = optimizedCalibrationMeasurementData.amus.indexOf(atomic_mass);
//         const intensity = optimizedCalibrationMeasurementData.ion_currents[intensityIndex];
//
//         sensitivities[elementData.symbol] = intensity / partialPressures[elementData.symbol]
//     })
//     return sensitivities;
// }
// export function calcPartialPressures(calibrationMixture: ICalibrationMixture, totalPressure: number) {
//     const partialPressures = {}
//     calibrationMixture.forEach(elementData => {
//         partialPressures[elementData.symbol] = elementData.concentration * totalPressure
//     })
//     return partialPressures
// }
// export function calcConcentrations(
//     calibrationMixture: ICalibrationMixture,
//     sensitivities: ISensitivities,
//     REFERENCE_ELEMENT_SYMBOL: string,
//     optimizedTestGasMeasurementData: IOptimizedMeasurementData
// ) {
//     const calibrationFactors: ICalibrationFactors = calcCalibrationFactors(calibrationMixture, sensitivities, REFERENCE_ELEMENT_SYMBOL);
//     const normIntensities: INormIntensities = calcNormIntensities(calibrationMixture, optimizedTestGasMeasurementData, calibrationFactors);
//     const sumNormIntensities: number = _.sum(Object.values(normIntensities));
//
//     const result_concentrations = {};
//     calibrationMixture.forEach(elementData => {
//         result_concentrations[elementData.symbol] = normIntensities[elementData.symbol] / sumNormIntensities
//     })
//     return result_concentrations;
// }
// function calcCalibrationFactors(calibrationMixture: ICalibrationMixture, sensitivities: ISensitivities, REFERENCE_ELEMENT_SYMBOL: string) {
//     const calibrationFactors = {};
//     calibrationMixture.forEach(elementData => {
//         calibrationFactors[elementData.symbol] = sensitivities[elementData.symbol] / sensitivities[REFERENCE_ELEMENT_SYMBOL]
//     })
//     return calibrationFactors
// }
//
// function calcNormIntensities(calibrationMixture: ICalibrationMixture, optimizedTestGasMeasurementData: IOptimizedMeasurementData, calibrationFactors: ICalibrationFactors) {
//     const normIntensities = {};
//     calibrationMixture.forEach(elementData => {
//         const atomic_mass = elementData["atomic_masses"][0];
//         const intensityIndex = optimizedTestGasMeasurementData.amus.indexOf(atomic_mass);
//         const intensity = optimizedTestGasMeasurementData.ion_currents[intensityIndex];
//
//         normIntensities[elementData.symbol] = intensity / calibrationFactors[elementData.symbol]
//     })
//     return normIntensities
// }
function checkProportions(testGasMixture, proportions) {
    testGasMixture.map(obj => {
        const amus_of_substance = proportions.filter(proportionsObj => proportionsObj.amu_proportions.amus.sort().join(',') === obj.atomic_masses.sort().join(','));
        if (_.isEmpty(amus_of_substance)) {
            throw new Error("The calibration data is insufficient to resolve the test gas. " +
                "Please make sure that all substances in the test mixture where predefined in the calibration measurement (also with the same atomic masses!).");
        }
    });
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
    const reference_sensitivity = sensitivities.filter(obj => obj.symbol === referenceElementSymbol)[0]["sensitivity"];
    const calibrationFactors = sensitivities.map(obj => {
        return Object.assign(Object.assign({}, obj), { calibrationFactor: obj.sensitivity / reference_sensitivity });
    });
    return calibrationFactors;
}
function resolveIonCurrents(proportions, lastCompleteMeasurement, testGasMixture, recipe) {
    const measurement_data = newOptimizeMeasurement(recipe, testGasMixture, lastCompleteMeasurement);
    //check if all substances in testMixture have their proportions defined
    checkProportions(testGasMixture, proportions);
    const ion_currents_per_amu_per_molecule = [];
    const remaining_mixture = [...testGasMixture];
    while (remaining_mixture.length) {
        const uniq_molecule_amus = getMoleculesWithUniqAmus(remaining_mixture);
        if (uniq_molecule_amus.length === 0) {
            throw new Error("There are to many overlapps in the atomic masses of the individual substances." +
                "Therefore the system of equations cannot be solved. Please try to use a different test gas mixture.");
        }
        uniq_molecule_amus.forEach((uniqMolecule) => {
            const proportion_object_for_uniq = _.flatten(proportions.filter(obj => obj.symbol === uniqMolecule.symbol))[0];
            const uniq_ion_currents_per_amu = getIonCurrentsPerUniqAmu(measurement_data, uniqMolecule);
            const all_ion_currents = calcIonCurrentsForMoleculeAmus(proportion_object_for_uniq, measurement_data, uniqMolecule, uniq_ion_currents_per_amu);
            ion_currents_per_amu_per_molecule.push({
                symbol: uniqMolecule.symbol,
                amus: proportion_object_for_uniq.amu_proportions.amus,
                ion_currents: all_ion_currents,
                total_ion_current: _.sum(all_ion_currents)
            });
            _.remove(remaining_mixture, obj => obj.symbol === uniqMolecule.symbol);
        });
    }
    return ion_currents_per_amu_per_molecule;
}
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

export { calcCalibrationFactors, calcConcentrations, calcPartialPressures, calcProportions, resolveIonCurrents };
//# sourceMappingURL=index.es.js.map
