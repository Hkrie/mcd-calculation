import * as _ from "lodash";
import {
    CalibrationFactors,
    ICalibrationMixture, IonCurrentsPerUniqAmu,
    Mixture,
    OptimizedMeasurementData,
    PartialPressures, ProportionObjectForUniq,
    Proportions, RawCalibrationMeasurementData, RawCalibrationMeasurements,
    RawMeasurement,
    Recipe, ResolvedIonCurrents, Sensitivities,
    TestMixture, UniqMolecule
} from "./types";

const convertToAbsoluteValueArray = (array: number[]) => {
    return array.map(Math.abs);
}

const isCompleteScan = (value:number[], allowedLengthOfArrays:number) =>{
    return value.length === allowedLengthOfArrays
}

const calcAverageValueArray = (array: number[][], allowedLengthOfArrays: number) => {
    const average_values = [];
    for (let i = 0; i < array[0].length; i++) {
        const ion_currents_of_amu: number[] = [];
        array.forEach((value, index) => {
            //check if the measurement scan was complete and if so get the value
            if (isCompleteScan(value, allowedLengthOfArrays)) {
                ion_currents_of_amu.push(value[i])
            }
        })

        const average_value = _.sum(convertToAbsoluteValueArray(ion_currents_of_amu)) / ion_currents_of_amu.length;
        average_values.push(average_value)
    }
    return average_values
}

const removePressureData = (completeMeasurement: RawCalibrationMeasurementData) => {
    return completeMeasurement.map(data => data.values.slice(1,))
}

export function OptimizeCalibrationMeasurements(
    recipe: Recipe,
    calibrationMixture: Mixture,
    completeMeasurement: RawCalibrationMeasurements
): OptimizedMeasurementData {
    const amus_of_calibration_measurement: number[] = recipe.rows.slice(1).map(row => row.mass!);
    const raw_values = removePressureData(completeMeasurement.data);
    const average_ion_currents = calcAverageValueArray(raw_values, amus_of_calibration_measurement.length);
    return {
        amus: amus_of_calibration_measurement,
        ion_currents: average_ion_currents
    }
}

export function newOptimizeMeasurement(
    recipe: Recipe,
    calibrationMixture: Mixture,
    lastCompleteMeasurement: RawMeasurement
): OptimizedMeasurementData {
    const amus_of_calibration_measurement: number[] = recipe.rows.slice(1).map(row => row.mass!);
    const raw_values = convertToAbsoluteValueArray(lastCompleteMeasurement.data.values.slice(1,));
    const AMPLIFIER_NOISE = 2 * 10 ** -14;
    const reduced_values = raw_values.map(i => i - AMPLIFIER_NOISE)
        .map(i => i < 0 ? 0 : i)

    return {
        amus: amus_of_calibration_measurement,
        ion_currents: reduced_values
    }
}

export function getPartialPressureForSymbol(partialPressures: PartialPressures, symbol: string) {
    return partialPressures.filter(pp_obj => pp_obj.symbol === symbol)[0]["partialPressure"]
}

function getIonCurrentForAmu(measurementData: OptimizedMeasurementData, amu: number) {
    const index = measurementData["amus"].indexOf(amu);
    return measurementData["ion_currents"][index]
}

export function calcSensitivities(calibrationMixture: ICalibrationMixture, partialPressures: PartialPressures, measurementData: OptimizedMeasurementData): Sensitivities {
    return _.flatten(calibrationMixture.map(obj => {
        const partial_pressure = getPartialPressureForSymbol(partialPressures, obj.symbol);
        return obj.atomic_masses.map(amu => {
            const ion_current = getIonCurrentForAmu(measurementData, amu);
            return {
                symbol: obj.symbol,
                amu: amu,
                sensitivity: ion_current / partial_pressure
            }
        })
    }))
}

export function getMoleculesWithUniqAmus(remainingMixture: TestMixture[]): Array<UniqMolecule> {
    const arr: Array<{ symbol: string, uniq_amus: number[] }> = [];
    remainingMixture.forEach(obj => {
        const uniq_amus: number[] = obj.atomic_masses.filter(amu => {
            const amu_occurrences = remainingMixture.filter(obj2 => obj2.atomic_masses.includes(amu));
            return amu_occurrences.length === 1
        });

        if (!_.isEmpty(uniq_amus)) {
            arr.push({
                symbol: obj.symbol,
                uniq_amus: uniq_amus
            })
        }
    });
    return arr;
}

export function calcNormIonCurrents(resolvedIonCurrents: ResolvedIonCurrents, calibrationFactors: CalibrationFactors) {
    return _.flatten(resolvedIonCurrents.map(obj => {
        return obj.amus.map((amu, index) => {
            const ion_current = obj.ion_currents[index];
            const calibration_factor = calibrationFactors.filter(cf_obj => cf_obj.symbol === obj.symbol && cf_obj.amu === amu)[0].calibrationFactor;

            return {
                symbol: obj.symbol,
                amu: amu,
                normIonCurrent: ion_current / calibration_factor
            }
        })
    }))
}

export function getIonCurrentsPerUniqAmu(measurementData: OptimizedMeasurementData, uniqMolecule: UniqMolecule): IonCurrentsPerUniqAmu {
    const uniq_ion_currents_per_amu: { amu: any; ion_current: any; }[] = [];
    measurementData["amus"].forEach((amu, index) => {
        if (uniqMolecule.uniq_amus.includes(amu)) {
            uniq_ion_currents_per_amu.push({
                amu: amu,
                ion_current: measurementData["ion_currents"][index]
            })
        }
    })
    return uniq_ion_currents_per_amu
}

export function calcIonCurrentsForMoleculeAmus(
    proportionObjectForUniq: ProportionObjectForUniq,
    measurementData: OptimizedMeasurementData,
    uniqMolecule: UniqMolecule,
    uniqIonCurrentsPerAmu: IonCurrentsPerUniqAmu
) {
    return proportionObjectForUniq.amu_proportions.amus.map((amu, index) => {
        const md_index = measurementData["amus"].indexOf(amu);
        if (uniqMolecule!.uniq_amus.includes(amu)) {
            const ion_current = _.flatten(uniqIonCurrentsPerAmu.filter(obj => obj!.amu === amu))[0]!.ion_current;
            measurementData.ion_currents[md_index] -= ion_current;
            return ion_current;
        } else {// else the ion currents of the element of this amu has to be calculated
            // get index of first uniq amu for the current symbol
            const uniq_index = proportionObjectForUniq.amu_proportions.amus.indexOf(uniqMolecule!.uniq_amus[0]!);
            const proportion_factor_uniq = proportionObjectForUniq.amu_proportions.proportions[uniq_index];
            const base_ion_current = _.flatten(uniqIonCurrentsPerAmu.filter(obj => obj!.amu === uniqMolecule!.uniq_amus[0]))[0]!.ion_current;

            const proportion_factor_current_amu = proportionObjectForUniq.amu_proportions.proportions[index];
            const ion_current = (base_ion_current / proportion_factor_uniq) * proportion_factor_current_amu;

            measurementData.ion_currents[md_index] -= ion_current;
            if(measurementData.ion_currents[md_index] < 0){
                measurementData.ion_currents[md_index] = 0;
            }
            return ion_current
        }
    })
}

export function checkProportions(testGasMixture: TestMixture[], proportions: Proportions) {
    testGasMixture.map(obj => {
        const amus_of_substance = proportions.filter(proportionsObj => proportionsObj.amu_proportions.amus.sort().join(',') === obj.atomic_masses.sort().join(','));
        if (_.isEmpty(amus_of_substance)) {
            throw new Error("The calibration data is insufficient to resolve the test gas. " +
                "Please make sure that all substances in the test mixture where predefined in the calibration measurement (also with the same atomic masses!).")
        }
    })
}

export function getSensitivityOf100PercentPeakOfReferenceSymbol (sensitivities:Sensitivities, referenceSymbol:string){
    const reference_sensitivities = sensitivities.filter(obj => obj.symbol === referenceSymbol);
    return Math.max(...reference_sensitivities.map(o => o.sensitivity))
}