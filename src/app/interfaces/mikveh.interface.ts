export interface IMikveh {
  id: string
  name: string
  phoneNum: string
  address: string
  lat: number
  lng: number
  details: string
  mainBalanit: MainBalanit
  midWeekHours: MidWeekHours
  fridayOrErevHagSummer: FridayOrErevHag
  motzaeiShabbatOrHagSummer: MotzaeiShabbatOrHag
  fridayOrErevHagWinter: FridayOrErevHag
  motzaeiShabbatOrHagWinter: MotzaeiShabbatOrHag
  isStructured: boolean
  [key: string]: any
}

export interface MidWeekHours {
  open: string
  close: string
}

export interface FridayOrErevHag {
  hoursAfterKnisatRelative: number
  workingHours: number
}

export interface MotzaeiShabbatOrHag {
  hoursAfterMotzaeiRelative: number
  workingHours: number
}

export interface MainBalanit {
  name: string
  phone: string
}
