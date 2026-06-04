import { prisma } from "./lib/prisma";

async function createAdmin() {
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@movoprive.com" },
    });

    if (existingAdmin) {
      console.log("✓ Admin already exists");
      return;
    }

    const admin = await prisma.user.create({
      data: {
        id: "admin-001",
        email: "admin@movoprive.com",
        phone: "+1234567890",
        firstName: "Admin",
        lastName: "User",
        password: "$2b$10$RuE5ASOpFFW6I5CICrhLkOB9kosIJ2Ev2ZclgxHH16zPvQr6S/FYu", // admin123
        role: "ADMIN",
      },
    });

    console.log("✓ Admin created successfully");
    console.log("Email: admin@movoprive.com");
    console.log("Phone: +1234567890");
    console.log("Password: admin123");
  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
