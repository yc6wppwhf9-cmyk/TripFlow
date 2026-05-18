require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing existing database records...');
  try {
    await prisma.notification.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.vendor.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.policy.deleteMany({});
    console.log('Database tables cleared successfully.');
  } catch (error) {
    console.warn('Error during table clearance, continuing:', error);
  }

  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('Welcome@123', 12);

  // 1. HR Admin
  const admin = await prisma.user.upsert({
    where: { email: 'hr@tripflow.com' },
    update: {},
    create: {
      email: 'hr@tripflow.com',
      password: hashedPassword,
      name: 'Sarah Admin',
      role: 'ADMIN',
    },
  });

  // 2. Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@tripflow.com' },
    update: {},
    create: {
      email: 'manager@tripflow.com',
      password: hashedPassword,
      name: 'James Manager',
      role: 'MANAGER',
    },
  });

  // 3. Employees
  const emp1 = await prisma.user.upsert({
    where: { email: 'alice@tripflow.com' },
    update: {},
    create: {
      email: 'alice@tripflow.com',
      password: hashedPassword,
      name: 'Alice Employee',
      role: 'EMPLOYEE',
      phone: '+1234567890',
      employee: {
        create: {
          department: 'Engineering',
          managerId: manager.id,
        },
      },
    },
    include: { employee: true }
  });

  const emp2 = await prisma.user.upsert({
    where: { email: 'bob@tripflow.com' },
    update: {},
    create: {
      email: 'bob@tripflow.com',
      password: hashedPassword,
      name: 'Bob Employee',
      role: 'EMPLOYEE',
      phone: '+0987654321',
      employee: {
        create: {
          department: 'Sales',
          managerId: manager.id,
        },
      },
    },
    include: { employee: true }
  });

  // 4. Vendor
  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@travel.com' },
    update: {},
    create: {
      email: 'vendor@travel.com',
      password: hashedPassword,
      name: 'Global Travel Rep',
      role: 'VENDOR',
      vendor: {
        create: {
          companyName: 'Global Travel Services',
          serviceType: 'FULL_SERVICE',
        },
      },
    },
    include: { vendor: true }
  });

  // 5. Sample Policy
  const policy = await prisma.policy.create({
    data: {
      name: 'Standard Policy 2026',
      rules: {
        flightLimit: 1000,
        hotelLimit: 200,
        cabLimit: 50,
        trainLimit: 100,
        globalMonthlyBudget: 5000,
      },
    },
  });

  // Update employees with policy
  await prisma.employee.updateMany({
    data: { policyId: policy.id }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
