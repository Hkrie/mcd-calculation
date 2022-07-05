import { CalibrationFactors, ICalibrationMixture, Mixture, OptimizedMeasurementData, PartialPressures, Proportions, RawCalibrationMeasurements, RawMeasurement, Recipe, ResolvedIonCurrents, Sensitivities, TestMixture } from "./types";
export declare function OptimizeCalibrationMeasurements(recipe: Recipe, calibrationMixture: Mixture, completeMeasurement: RawCalibrationMeasurements): OptimizedMeasurementData;
export declare function newOptimizeMeasurement(recipe: Recipe, calibrationMixture: Mixture, lastCompleteMeasurement: RawMeasurement): OptimizedMeasurementData;
export declare function getPartialPressureForSymbol(partialPressures: PartialPressures, symbol: string): number;
export declare function calcSensitivities(calibrationMixture: ICalibrationMixture, partialPressures: PartialPressures, measurementData: OptimizedMeasurementData): Sensitivities;
export declare function getMoleculesWithUniqAmus(remainingMixture: TestMixture[]): Array<{
    symbol: string;
    uniq_amus: number[];
}>;
export declare function calcNormIonCurrents(resolvedIonCurrents: ResolvedIonCurrents, calibrationFactors: CalibrationFactors): {
    symbol: string;
    amu: number;
    normIonCurrent: number;
}[];
export declare function getIonCurrentsPerUniqAmu(measurementData: OptimizedMeasurementData, uniqMolecule: {
    symbol: string;
    uniq_amus: number[];
}): Array<{
    amu: number;
    ion_current: number;
}>;
export declare function calcIonCurrentsForMoleculeAmus(proportionObjectForUniq: {
    symbol: string;
    amu_proportions: {
        amus: number[];
        proportions: number[];
    };
}, measurementData: OptimizedMeasurementData, uniqMolecule: {
    symbol: string;
    uniq_amus: number[];
}, uniqIonCurrentsPerAmu: {
    amu: number;
    ion_current: number;
}[]): number[];
export declare function checkProportions(testGasMixture: TestMixture[], proportions: Proportions): void;
