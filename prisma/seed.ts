// Demo data. Runs as the owner role (DIRECT_DATABASE_URL), so RLS does not block it.
// Safe to run again: it upserts.
import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_DATABASE_URL } } });

const COMPANIES = [
  {
    name: 'Demo Garments Pvt. Ltd.',
    prefix: 'DGL',
    details: {
      address: '12, Avinashi Road, Peelamedu', city: 'Coimbatore', pincode: '641004', state: 'Tamil Nadu', country: 'India',
      gstNo: '33AABCD1234E1Z5', ieCode: '0412345678',
    },
    users: [
      { username: 'merchant1', fullName: 'Merchant One', userType: 3, code: 'MER-01', mobile: '+91 90000 00001', email: 'merchant1@demo.example' },
      { username: 'merchant2', fullName: 'Merchant Two', userType: 3, code: 'MER-02', mobile: '+91 90000 00002', email: 'merchant2@demo.example' },
      { username: 'mgmt1', fullName: 'Management Viewer', userType: 2 },
      { username: 'system.authorizer.dgl', fullName: 'Demo Authorizer (system)', userType: 2, canLogin: false },
    ],
    buyers: [
      { name: 'Nordic Retail AB', country: 'Sweden', brands: ['North Trail', 'Kids Fjord'] },
      { name: 'Urban Wear Ltd.', country: 'United Kingdom', brands: ['Urban Basics'] },
      { name: 'Sunset Apparel Inc.', country: 'United States', brands: ['Sunset Active', 'Sunset Lounge'] },
    ],
  },
  {
    name: 'Sunrise Knits Pvt. Ltd.',
    prefix: 'SKL',
    details: {
      address: '45, Kumaran Road', city: 'Tiruppur', pincode: '641601', state: 'Tamil Nadu', country: 'India',
      gstNo: '33AAECS5678F1Z2', ieCode: '0498765432',
    },
    users: [
      { username: 'sunrise.merchant', fullName: 'Sunrise Merchant', userType: 3, code: 'MER-01', mobile: '+91 90000 00011', email: 'merchant@sunrise.example' },
      { username: 'system.authorizer.skl', fullName: 'Demo Authorizer (system)', userType: 2, canLogin: false },
    ],
    buyers: [{ name: 'Alpine Sports GmbH', country: 'Germany', brands: ['Alpine Pro'] }],
  },
];

async function main() {
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error('Set DEMO_PASSWORD in .env');
  const passwordHash = await hash(password);
  // System users get a random, unknown password and cannot sign in anyway.
  const systemHash = await hash(crypto.randomUUID());

  for (const c of COMPANIES) {
    const existing = await prisma.company.findFirst({ where: { prefix: c.prefix } });
    const company = existing
      ? await prisma.company.update({ where: { id: existing.id }, data: c.details })
      : await prisma.company.create({ data: { name: c.name, prefix: c.prefix, ...c.details } });

    for (const u of c.users as { username: string; fullName: string; userType: number; canLogin?: boolean; code?: string; mobile?: string; email?: string }[]) {
      const canLogin = u.canLogin ?? true;
      const contact = { code: u.code ?? null, mobile: u.mobile ?? null, email: u.email ?? null };
      await prisma.user.upsert({
        where: { username: u.username },
        create: { ...u, ...contact, canLogin, companyId: company.id, passwordHash: canLogin ? passwordHash : systemHash },
        update: { fullName: u.fullName, userType: u.userType, ...contact, canLogin, companyId: company.id, passwordHash: canLogin ? passwordHash : systemHash },
      });
    }

    for (const b of c.buyers) {
      const buyer = await prisma.buyer.upsert({
        where: { companyId_name: { companyId: company.id, name: b.name } },
        create: { companyId: company.id, name: b.name, country: b.country },
        update: { country: b.country },
      });
      for (const brand of b.brands) {
        await prisma.brand.upsert({
          where: { companyId_name: { companyId: company.id, name: brand } },
          create: { companyId: company.id, buyerId: buyer.id, name: brand },
          update: { buyerId: buyer.id },
        });
      }
    }
    console.log(`Seeded ${c.name} (${c.prefix}): users ${c.users.filter((u) => u.canLogin !== false).map((u) => u.username).join(', ')}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
