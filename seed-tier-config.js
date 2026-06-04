const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedTierConfig() {
  try {
    const configs = [
      {
        tier: "classic",
        name: "Movo Classic",
        image: "/images/movo classic.png",
        price: 50,
      },
      {
        tier: "premium",
        name: "Movo Premium",
        image: "/images/movo premium.png",
        price: 80,
      },
      {
        tier: "black",
        name: "Movo Privé Black",
        image: "/images/prive black.png",
        price: 130,
      },
    ];

    for (const config of configs) {
      const existing = await prisma.vehicleTierConfig.findUnique({
        where: { tier: config.tier },
      });

      if (existing) {
        console.log(`✓ Tier config already exists: ${config.tier}`);
        continue;
      }

      await prisma.vehicleTierConfig.create({
        data: config,
      });

      console.log(`✓ Created tier config: ${config.tier}`);
    }

    console.log("✓ Tier configuration seeded successfully");
  } catch (error) {
    console.error("Error seeding tier config:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTierConfig();
