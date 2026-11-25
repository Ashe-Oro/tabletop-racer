export const cars = [
  { id: 'car_1', name: 'Hero Red', color: '#e23a2b' },
  { id: 'car_2', name: 'Cobalt GT', color: '#4c8ee7' },
  { id: 'car_3', name: 'Sunburst', color: '#f0c53a' },
  { id: 'car_4', name: 'Emerald', color: '#47bd80' },
] as const

export type CarId = typeof cars[number]['id']
export const CAR_LENGTH = 24
export const CAR_AXLE = 6.7
export const CAR_RADIUS = 6
