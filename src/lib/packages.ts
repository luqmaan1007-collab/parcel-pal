export type PackageStatus = "in_transit" | "out_for_delivery" | "ready" | "delivered";

export interface Package {
  id: string;
  trackingNumber: string;
  sender: string;
  status: PackageStatus;
  lockerLocation: string;
  lockerAddress: string;
  lockerNumber: string;
  pickupCode: string;
  eta: "today" | "tomorrow";
  distanceKm: number;
}

export const mockPackages: Package[] = [
  {
    id: "1",
    trackingNumber: "PK982341290SE",
    sender: "Zalando",
    status: "ready",
    lockerLocation: "ICA Maxi Lindhagen",
    lockerAddress: "Lindhagensgatan 126, 112 51 Stockholm",
    lockerNumber: "A-14",
    pickupCode: "4827",
    eta: "today",
    distanceKm: 0.4,
  },
  {
    id: "2",
    trackingNumber: "PK773410982SE",
    sender: "H&M",
    status: "out_for_delivery",
    lockerLocation: "Pressbyrån Odenplan",
    lockerAddress: "Odengatan 65, 113 22 Stockholm",
    lockerNumber: "B-07",
    pickupCode: "1193",
    eta: "today",
    distanceKm: 1.2,
  },
  {
    id: "3",
    trackingNumber: "PK552109834SE",
    sender: "Adlibris",
    status: "in_transit",
    lockerLocation: "7-Eleven Sveavägen",
    lockerAddress: "Sveavägen 88, 113 50 Stockholm",
    lockerNumber: "C-22",
    pickupCode: "8821",
    eta: "tomorrow",
    distanceKm: 2.1,
  },
];
