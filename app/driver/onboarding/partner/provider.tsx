"use client";

import { useState } from "react";
import { FleetOnboardingContext, FleetOnboardingData } from "./context";

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

export function FleetOnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<FleetOnboardingData>(defaultData);

  const updateData = (updates: Partial<FleetOnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const resetData = () => {
    setData(defaultData);
  };

  return (
    <FleetOnboardingContext.Provider value={{ data, updateData, resetData }}>
      {children}
    </FleetOnboardingContext.Provider>
  );
}
