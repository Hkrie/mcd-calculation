export type ICalibrationMixture = {
    symbol: string,
    atomic_masses: number[],
    concentration: number
}[]

export type Mixture = {
    symbol: string,
    atomic_masses: number[],
    concentration?: number
}[]

export type OptimizedMeasurementData = {
    amus: number[],
    ion_currents: number[]
}

export type RawMeasurement = {
    name: "got",
    origin: "/mmsp/measurement/scans"
    data: {
        scannum: number,
        scansize: number,
        values: number[]
    }
}

export type RawCalibrationMeasurements = {
    name: "got",
    origin: "/mmsp/measurement/scans"
    data: {
        scannum: number,
        scansize: number,
        values: number[]
    }[]
}

export type RawCalibrationMeasurementData = {
    scannum: number,
    scansize: number,
    values: number[]
}[]

export type IPartialPressures = Record<string, number>

export type ISensitivities = Record<string, number>

export type ICalibrationFactors = Record<string, number>

export type INormIntensities = Record<string, number>

export type RecipeRow = {
    id?: string,
    dwell?: number,
    mass?: number,
    type: string,
    special?: string,
    leadIn?: number,
    em?: number,
    outputAnalog?: string,
    outputDigital?: string
}

export type Recipe = {
    id?: string,
    name?: string,
    isDefault?: boolean,
    fromAMU?: number,
    toAMU?: number,
    pointsPerAMU?: number,
    dwell: number,
    mode: string,
    rows: RecipeRow[]
}

export type TestMixture = {
    symbol: string,
    atomic_masses: number[]
}

export type Proportions = {
    symbol: string,
    amu_proportions: {
        amus: number[],
        proportions: number[]
    }
}[]

export type PartialPressures = {
    symbol: string,
    partialPressure: number
}[]

export type CalibrationFactors = {
    symbol: string,
    amu: number,
    sensitivity: number,
    calibrationFactor: number
}[]

export type ResolvedIonCurrents = {
    symbol: string,
    amus: number[],
    ion_currents: number[],
    total_ion_current: number
}[]

export type Concentrations = {
    symbol: string,
    amus: number[],
    concentrations: number[],
    total_concentration: number
}[]

export type Sensitivities = {
    symbol: string,
    amu: number,
    sensitivity: number
}[]
