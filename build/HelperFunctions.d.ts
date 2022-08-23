import { CalibrationFactors, ICalibrationMixture, IonCurrentsPerUniqAmu, Mixture, OptimizedMeasurementData, PartialPressures, ProportionObjectForUniq, Proportions, RawCalibrationMeasurements, RawMeasurement, Recipe, ResolvedIonCurrents, Sensitivities, TestMixture, UniqMolecule } from "./types";
export declare function OptimizeCalibrationMeasurements(recipe: Recipe, calibrationMixture: Mixture, completeMeasurement: RawCalibrationMeasurements): OptimizedMeasurementData;
export declare function newOptimizeMeasurement(recipe: Recipe, calibrationMixture: Mixture, lastCompleteMeasurement: RawMeasurement): OptimizedMeasurementData;
export declare function getPartialPressureForSymbol(partialPressures: PartialPressures, symbol: string): number;
export declare function calcSensitivities(calibrationMixture: ICalibrationMixture, partialPressures: PartialPressures, measurementData: OptimizedMeasurementData): Sensitivities;
export declare function getMoleculesWithUniqAmus(remainingMixture: TestMixture[]): Array<UniqMolecule>;
export declare function calcNormIonCurrents(resolvedIonCurrents: ResolvedIonCurrents, calibrationFactors: CalibrationFactors): {
    symbol: string;
    amu: number;
    normIonCurrent: number;
}[];
export declare function getIonCurrentsPerUniqAmu(measurementData: OptimizedMeasurementData, uniqMolecule: UniqMolecule): IonCurrentsPerUniqAmu;
export declare function calcIonCurrentsForMoleculeAmus(proportionObjectForUniq: ProportionObjectForUniq, measurementData: OptimizedMeasurementData, uniqMolecule: UniqMolecule, uniqIonCurrentsPerAmu: IonCurrentsPerUniqAmu): number[];
export declare function checkProportions(testGasMixture: TestMixture[], proportions: Proportions): void;
export declare function getSensitivityOf100PercentPeakOfReferenceSymbol(sensitivities: Sensitivities, referenceSymbol: string): number;
