export interface CarSpec {
  readonly id: CarId
  readonly name: string
  readonly color: string
  readonly accelerationTime: number
  readonly launchBias: number
  readonly mass: number
  readonly handling: number
}

export type CarId = 'car_1' | 'car_2' | 'car_3' | 'car_4'

export const cars = [
  { id: 'car_1', name: 'Stripe', color: '#e23a2b', accelerationTime: 1.85, launchBias: 3.5, mass: 1, handling: 1 },
  { id: 'car_2', name: 'Pickup', color: '#c43c2b', accelerationTime: 2.35, launchBias: 3.5, mass: 1.35, handling: 0.95 },
  { id: 'car_3', name: 'F1', color: '#4c8ee7', accelerationTime: 1.50, launchBias: 3.5, mass: 0.8, handling: 1.08 },
  { id: 'car_4', name: 'Taxi', color: '#f0c53a', accelerationTime: 2.05, launchBias: 3.5, mass: 1.12, handling: 1 },
] as const satisfies readonly CarSpec[]

export const CAR_LENGTH = 24
export const CAR_AXLE = 6.7
export const CAR_RADIUS = 6
export const WHEEL_CENTERS = [-CAR_AXLE, 0, CAR_AXLE] as const
