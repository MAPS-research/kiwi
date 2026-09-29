import 'dotenv/config';
import { createPrismaClient } from '../src/common/database/prisma-client.factory';

const prisma = createPrismaClient();

async function main() {
  const email = process.argv[2]; // Get the email from the command line arguments
  const status = process.argv[3] || 'enabled'; // Default to enabled

  if (!email) {
    console.error('Please provide an email as an argument.');
    console.error('Usage: npx tsx prisma/addWhitelist.ts <email> [status]');
    console.error('Example: npx tsx prisma/addWhitelist.ts user@example.edu enabled');
    process.exit(1);
  }

  try {
    // Check if user is already whitelisted
    const existingWhitelist = await prisma.userWhitelist.findUnique({
      where: { email: email },
    });

    if (existingWhitelist) {
      // Update existing whitelist entry
      const updated = await prisma.userWhitelist.update({
        where: { email: email },
        data: { status: status },
      });
      console.log(`Updated whitelist for ${email} to status: ${updated.status}`);
    } else {
      // Create new whitelist entry
      const created = await prisma.userWhitelist.create({
        data: {
          email: email,
          status: status,
        },
      });
      console.log(`Added ${email} to whitelist with status: ${created.status}`);
    }

    console.log(`\n✅ Successfully whitelisted ${email}`);
    
  } catch (error) {
    console.error(`Error managing whitelist: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
