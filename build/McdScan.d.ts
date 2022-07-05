import { CalibrationFactors, Concentrations, ICalibrationMixture, PartialPressures, Proportions, RawCalibrationMeasurements, RawMeasurement, Recipe, ResolvedIonCurrents, TestMixture } from "./types";
export declare function calcProportions(recipe: Recipe, calibrationMixture: ICalibrationMixture, completeMeasurement: RawCalibrationMeasurements): Proportions;
export declare function calcPartialPressures(calibrationMixture: ICalibrationMixture, completeMeasurement: RawCalibrationMeasurements): PartialPressures;
export declare function calcCalibrationFactors(calibrationMixture: ICalibrationMixture, recipe: Recipe, completeMeasurement: RawCalibrationMeasurements, partialPressures: PartialPressures, referenceElementSymbol: string): CalibrationFactors;
export declare function resolveIonCurrents(proportions: Proportions, lastCompleteMeasurement: RawMeasurement, testGasMixture: TestMixture[], recipe: Recipe): ResolvedIonCurrents;
export declare function calcConcentrations(testGasMixture: TestMixture[], calibrationFactors: CalibrationFactors, resolvedIonCurrents: ResolvedIonCurrents): Concentrations;
