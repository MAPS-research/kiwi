import 'dotenv/config';
import { createPrismaClient } from '../src/common/database/prisma-client.factory';

const prisma = createPrismaClient();

async function main() {
  const email = process.argv[2]; // Get the email from the command line arguments

  if (!email) {
    console.error('Please provide an email as an argument.');
    process.exit(1);
  }

  try {
    // Check if a pending admin already exists for this email
    const existingPendingAdmin = await prisma.pendingAdmin.findUnique({
      where: { email: email },
    });

    if (existingPendingAdmin) {
      console.log(`Pending admin record already exists for ${email} with status: ${existingPendingAdmin.status}`);
      
      // Update status to pending if it was activated
      if (existingPendingAdmin.status === 'activated') {
        await prisma.pendingAdmin.update({
          where: { email: email },
          data: { status: 'pending' },
        });
        console.log(`Updated status back to pending for ${email}`);
      }
    } else {
      // Create new pending admin
      await prisma.pendingAdmin.create({
        data: {
          email: email,
          status: 'pending',
        },
      });
      console.log(`Created pending admin record for ${email}`);
    }

    // Check if user is already whitelisted
    const existingWhitelist = await prisma.userWhitelist.findUnique({
      where: { email: email },
    });

    if (existingWhitelist) {
      // Update whitelist status to enabled
      if (existingWhitelist.status !== 'enabled') {
        await prisma.userWhitelist.update({
          where: { email: email },
          data: { status: 'enabled' },
        });
        console.log(`Updated whitelist status to enabled for ${email}`);
      } else {
        console.log(`${email} is already whitelisted and enabled`);
      }
    } else {
      // Create whitelist entry
      await prisma.userWhitelist.create({
        data: {
          email: email,
          status: 'enabled',
        },
      });
      console.log(`Added ${email} to whitelist with enabled status`);
    }

    console.log(`\n✅ Successfully set up pending admin for ${email}`);
    console.log(`The user will be granted admin privileges when they first log in.`);
    
  } catch (error) {
    console.error(`Error creating pending admin: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
