import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]; // Get the email from the command line arguments

  if (!email) {
    console.error('Please provide an email as an argument.');
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email: email },
      data: { systemRole: 'admin' },
    });

    console.log(`User ${user.email} has been updated to admin.`);
  } catch (error) {
    console.error(`Error updating user: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
