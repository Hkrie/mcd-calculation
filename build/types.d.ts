export declare type ICalibrationMixture = {
    symbol: string;
    atomic_masses: number[];
    concentration: number;
}[];
export declare type Mixture = {
    symbol: string;
    atomic_masses: number[];
    concentration?: number;
}[];
export declare type OptimizedMeasurementData = {
    amus: number[];
    ion_currents: number[];
};
export declare type RawMeasurement = {
    name: "got";
    origin: "/mmsp/measurement/scans";
    data: {
        scannum: number;
        scansize: number;
        values: number[];
    };
};
export declare type RawCalibrationMeasurements = {
    name: string;
    origin: string;
    data: {
        scannum: number;
        scansize: number;
        values: number[];
    }[];
};
export declare type x = {
    data: {
        scansize: number;
        values: number[];
        scannum: number;
    }[];
    origin: string;
    name: string;
};
export declare type RawCalibrationMeasurementData = {
    scannum: number;
    scansize: number;
    values: number[];
}[];
export declare type UniqMolecule = {
    symbol: string;
    uniq_amus: number[];
};
export declare type IonCurrentsPerUniqAmu = Array<{
    amu: number;
    ion_current: number;
}>;
export declare type ProportionObjectForUniq = {
    symbol: string;
    amu_proportions: {
        amus: number[];
        proportions: number[];
    };
};
export declare type RecipeRow = {
    id?: string;
    dwell?: number;
    mass?: number;
    type: string;
    special?: string;
    leadIn?: number;
    em?: number;
    outputAnalog?: string;
    outputDigital?: string;
};
export declare type Recipe = {
    id?: string;
    name?: string;
    isDefault?: boolean;
    fromAMU?: number;
    toAMU?: number;
    pointsPerAMU?: number;
    dwell: number;
    mode: string;
    rows: RecipeRow[];
};
export declare type TestMixture = {
    symbol: string;
    atomic_masses: number[];
};
export declare type Proportions = {
    symbol: string;
    amu_proportions: {
        amus: number[];
        proportions: number[];
    };
}[];
export declare type PartialPressures = {
    symbol: string;
    partialPressure: number;
}[];
export declare type CalibrationFactors = {
    symbol: string;
    amu: number;
    sensitivity: number;
    calibrationFactor: number;
}[];
export declare type ResolvedIonCurrents = {
    symbol: string;
    amus: number[];
    ion_currents: number[];
    total_ion_current: number;
}[];
export declare type Concentrations = {
    symbol: string;
    amus: number[];
    concentrations: number[];
    total_concentration: number;
}[];
export declare type Sensitivities = {
    symbol: string;
    amu: number;
    sensitivity: number;
}[];
