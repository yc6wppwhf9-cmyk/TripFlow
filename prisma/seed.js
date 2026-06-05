require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    throw new Error('Refusing to run destructive seed in production. Set ALLOW_PROD_SEED=true only if you intend to reset production data.');
  }

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

  // 1. System Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tripflow.com' },
    update: {},
    create: {
      email: 'admin@tripflow.com',
      password: hashedPassword,
      name: 'System Admin',
      role: 'ADMIN',
    },
  });

  // 2. HR Officer
  const hr = await prisma.user.upsert({
    where: { email: 'hr@tripflow.com' },
    update: {},
    create: {
      email: 'hr@tripflow.com',
      password: hashedPassword,
      name: 'HR Officer',
      role: 'HR',
    },
  });

  // 3. Manager
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

  // 4. Employees
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

  // 5. Vendor
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

  // 6. Sample Policy
  const policy = await prisma.policy.create({
    data: {
      name: 'Standard Policy 2026',
      rules: {
        flightLimit: 15000,
        hotelLimit: 5000,
        cabLimit: 1500,
        trainLimit: 3000,
        advanceBookingDays: 30,
        foreignTravelAdvanceDays: 45,
        trainClassEntitlement: '3A',
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
