export const cars = [
  { id: 'car_1', name: 'Stripe', color: '#e23a2b' },
  { id: 'car_2', name: 'Pickup', color: '#c43c2b' },
  { id: 'car_3', name: 'F1', color: '#4c8ee7' },
  { id: 'car_4', name: 'Taxi', color: '#f0c53a' },
] as const

export type CarId = typeof cars[number]['id']
export const CAR_LENGTH = 24
export const CAR_AXLE = 6.7
export const CAR_RADIUS = 6
export const WHEEL_CENTERS = [-CAR_AXLE, 0, CAR_AXLE] as const
