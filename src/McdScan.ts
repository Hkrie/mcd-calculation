import {
    calcIonCurrentsForMoleculeAmus,
    calcNormIonCurrents,
    checkProportions,
    getIonCurrentForAmu,
    getIonCurrentsPerUniqAmu,
    getMoleculesWithUniqAmus,
    getPartialPressureForSymbol,
    getSensitivityOf100PercentPeakOfReferenceSymbol,
    newOptimizeMeasurement,
    OptimizeCalibrationMeasurements
} from "./HelperFunctions";
import {
    CalibrationFactors,
    Concentrations,
    ICalibrationMixture,
    PartialPressures,
    Proportions,
    RawCalibrationMeasurements,
    RawMeasurement,
    Recipe,
    ResolvedIonCurrents,
    Sensitivities,
    TestMixture,
    UniqMolecule
} from "./types";
import * as _ from "lodash";


export function calcProportions(recipe: Recipe, calibrationMixture: ICalibrationMixture, completeMeasurement: RawCalibrationMeasurements): Proportions {
    const measurement_data = OptimizeCalibrationMeasurements(recipe, calibrationMixture, completeMeasurement);
    return calibrationMixture.map(obj => {
        const measurement_data_subset = {
            amus: obj.atomic_masses,
            ion_currents: obj.atomic_masses.map((amu) => {
                const index = measurement_data.amus.indexOf(amu);
                return measurement_data.ion_currents[index]
            })
        };

        const hundred_percent_peak_ion_current = _.max(measurement_data_subset["ion_currents"]) || 0;

        return {
            symbol: obj.symbol,
            amu_proportions: {
                amus: measurement_data_subset.amus,
                proportions: measurement_data_subset.ion_currents.map(ion_current => ion_current / hundred_percent_peak_ion_current)
            }
        }
    })
}

export function calcPartialPressures(calibrationMixture: ICalibrationMixture, completeMeasurement: RawCalibrationMeasurements): PartialPressures {
    const totalPressure = completeMeasurement.data[0]["values"][0];
    return calibrationMixture.map(obj => {
        return {
            symbol: obj.symbol,
            partialPressure: obj.concentration * totalPressure
        }
    })
}

export function calcSensitivities(calibrationMixture: ICalibrationMixture, recipe: Recipe, completeMeasurement: RawCalibrationMeasurements, partialPressures: PartialPressures): Sensitivities {
    const measurement_data = OptimizeCalibrationMeasurements(recipe, calibrationMixture, completeMeasurement);
    return _.flatten(calibrationMixture.map(obj => {
        const partial_pressure = getPartialPressureForSymbol(partialPressures, obj.symbol);
        return obj.atomic_masses.map(amu => {
            const ion_current = getIonCurrentForAmu(measurement_data, amu);
            return {
                symbol: obj.symbol,
                amu: amu,
                sensitivity: ion_current / partial_pressure
            }
        })
    }))
}


export function calcCalibrationFactors(sensitivities: Sensitivities, referenceElementSymbol: string): CalibrationFactors {
    const reference_sensitivity = getSensitivityOf100PercentPeakOfReferenceSymbol(sensitivities, referenceElementSymbol);
    const calibrationFactors = sensitivities.map(obj => {
        return {
            ...obj,
            calibrationFactor: obj.sensitivity / reference_sensitivity
        }
    })
    return calibrationFactors
}

export function getResolveOrder(testGasMixture: TestMixture[]): UniqMolecule[] {
    const resolveOrderSymbols = [];
    let remaining_mixture = [...testGasMixture];
    while (remaining_mixture.length) {

        const uniq_molecule_amus = getMoleculesWithUniqAmus(remaining_mixture);

        if (uniq_molecule_amus.length === 0) {
            throw new Error("There are to many overlapps in the atomic masses of the individual substances." +
                "Therefore the system of equations cannot be solved. Please try to use a different test gas mixture.")
        }

        resolveOrderSymbols.push(...uniq_molecule_amus)
        uniq_molecule_amus.forEach(item => {
            _.remove(remaining_mixture, (obj) => {
                return obj.symbol === item.symbol;
            })
        })
    }
    return resolveOrderSymbols
}


export function resolveIonCurrents(proportions: Proportions, lastCompleteMeasurement: RawMeasurement, testGasMixture: TestMixture[], recipe: Recipe, resolveOrder?: UniqMolecule[]): ResolvedIonCurrents {
    const measurement_data = newOptimizeMeasurement(recipe, testGasMixture, lastCompleteMeasurement);
    checkProportions(testGasMixture, proportions)
    const ion_currents_per_amu_per_molecule: ResolvedIonCurrents = [];

    if (!resolveOrder) {
        resolveOrder = getResolveOrder(testGasMixture);
    }

    resolveOrder.forEach(uniqMolecule => {
        const proportion_object_for_uniq = _.flatten(proportions.filter(obj => obj.symbol === uniqMolecule!.symbol))[0];
        const uniq_ion_currents_per_amu = getIonCurrentsPerUniqAmu(measurement_data, uniqMolecule);
        const all_ion_currents = calcIonCurrentsForMoleculeAmus(proportion_object_for_uniq, measurement_data, uniqMolecule, uniq_ion_currents_per_amu);

        ion_currents_per_amu_per_molecule.push({
            symbol: uniqMolecule!.symbol,
            amus: proportion_object_for_uniq.amu_proportions.amus,
            ion_currents: all_ion_currents,
            total_ion_current: _.sum(all_ion_currents)
        })
    })

    return ion_currents_per_amu_per_molecule
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

export function calcConcentrations(testGasMixture: TestMixture[], calibrationFactors: CalibrationFactors, resolvedIonCurrents: ResolvedIonCurrents): Concentrations {
    const norm_ion_currents = calcNormIonCurrents(resolvedIonCurrents, calibrationFactors);

    const sum_norm_ion_currents = _.sum(norm_ion_currents.map(obj => obj.normIonCurrent));
    const concentration_per_symbol_per_amu = norm_ion_currents.map(nic_obj => {
        return {
            symbol: nic_obj.symbol,
            amu: nic_obj.amu,
            concentration: nic_obj.normIonCurrent / sum_norm_ion_currents
        }
    });
    const concentrations = testGasMixture.map(obj => {
        const concentrationList = obj.atomic_masses.map(amu => {
            return concentration_per_symbol_per_amu.filter(object => object.symbol === obj.symbol && object.amu === amu)[0].concentration
        })
        return {
            symbol: obj.symbol,
            amus: obj.atomic_masses,
            concentrations: concentrationList,
            total_concentration: _.sum(concentrationList)
        }
    });
    return concentrations
}
