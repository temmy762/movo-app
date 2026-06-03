import { createContext, useContext } from "react";

export interface FleetOnboardingData {
  // Company info
  companyName: string;
  legalForm: string;
  country: string;
  city: string;
  street: string;
  postalCode: string;
  taxId: string;
  vatId: string;
  registrationNumber: string;

  // Fleet info
  fleetSize: string;
  vehicleDescriptions: string;

  // First vehicle
  firstVehicleYear: string;
  firstVehicleBrand: string;
  firstVehicleModel: string;
  firstVehicleClass: string;
  firstVehicleColor: string;
  firstVehiclePlate: string;
  firstVehicleVin: string;

  // First chauffeur
  firstChauffeurFirstName: string;
  firstChauffeurLastName: string;
  firstChauffeurEmail: string;
  firstChauffeurPhone: string;
}

export interface FleetOnboardingContextType {
  data: FleetOnboardingData;
  updateData: (updates: Partial<FleetOnboardingData>) => void;
  resetData: () => void;
}

const defaultData: FleetOnboardingData = {
  companyName: "",
  legalForm: "",
  country: "",
  city: "",
  street: "",
  postalCode: "",
  taxId: "",
  vatId: "",
  registrationNumber: "",
  fleetSize: "",
  vehicleDescriptions: "",
  firstVehicleYear: "",
  firstVehicleBrand: "",
  firstVehicleModel: "",
  firstVehicleClass: "",
  firstVehicleColor: "",
  firstVehiclePlate: "",
  firstVehicleVin: "",
  firstChauffeurFirstName: "",
  firstChauffeurLastName: "",
  firstChauffeurEmail: "",
  firstChauffeurPhone: "",
};

export const FleetOnboardingContext = createContext<FleetOnboardingContextType | undefined>(undefined);

export function useFleetOnboarding() {
  const context = useContext(FleetOnboardingContext);
  if (!context) {
    throw new Error("useFleetOnboarding must be used within FleetOnboardingProvider");
  }
  return context;
}
