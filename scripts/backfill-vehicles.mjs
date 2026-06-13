import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Finding ACTIVE drivers with no vehicle...\n");

  const drivers = await prisma.driver.findMany({
    where: {
      status: "ACTIVE",
      vehicle: null,
    },
    include: { onboarding: true },
  });

  console.log(`Found ${drivers.length} driver(s) without a vehicle.\n`);

  const created = [];
  const skipped = [];

  for (const driver of drivers) {
    const ob = driver.onboarding;
    const name = `${driver.firstName} ${driver.lastName} (${driver.email})`;

    if (!ob) {
      console.log(`SKIP  ${name} — no onboarding record`);
      skipped.push(driver.id);
      continue;
    }

    let make, model, plate;
    let year = new Date().getFullYear();
    let tier = "classic";

    if (ob.type === "INDIVIDUAL") {
      make  = ob.vehicleMake;
      model = ob.vehicleModel;
      plate = ob.vehiclePlate;
      year  = parseInt(ob.vehicleYear  || String(year));
      tier  = ob.vehicleTier || "classic";
    } else if (ob.type === "FLEET") {
      make  = ob.firstVehicleBrand;
      model = ob.firstVehicleModel;
      plate = ob.firstVehiclePlate;
      year  = parseInt(ob.firstVehicleYear || String(year));
      tier  = ob.firstVehicleClass || "classic";
    }

    if (!make || !model || !plate) {
      console.log(`SKIP  ${name} — missing vehicle info (make=${make}, model=${model}, plate=${plate})`);
      skipped.push(driver.id);
      continue;
    }

    await prisma.vehicle.create({
      data: { driverId: driver.id, make, model, year, plate, tier },
    });

    console.log(`OK    ${name} — created Vehicle: ${make} ${model} ${year} [${tier}] plate=${plate}`);
    created.push(driver.id);
  }

  console.log(`\n✓ Done. Created ${created.length} vehicle(s), skipped ${skipped.length}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
