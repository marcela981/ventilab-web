/**
 * =============================================================================
 * VentyLab Database Seed Script - Root Level
 * =============================================================================
 * Populates the database with initial data for development and testing
 *
 * This script creates:
 * - Admin user and test student users
 * - Educational modules
 * - Sample lessons
 * - Initial progress records
 *
 * Run with: npm run db:seed
 * =============================================================================
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (optional - comment out if you want to preserve data)
  // await prisma.progress.deleteMany({});
  // await prisma.lesson.deleteMany({});
  // await prisma.module.deleteMany({});
  // await prisma.user.deleteMany({});

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ventilab.com' },
    update: {},
    create: {
      email: 'admin@ventilab.com',
      name: 'Admin User',
      role: 'ADMIN',
      userLevel: 'ADVANCED',
      password: 'hashed_password_here', // Replace with actual hashed password
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create test student
  const student = await prisma.user.upsert({
    where: { email: 'student@ventilab.com' },
    update: {},
    create: {
      email: 'student@ventilab.com',
      name: 'Test Student',
      role: 'STUDENT',
      userLevel: 'BEGINNER',
      password: 'hashed_password_here', // Replace with actual hashed password
      isActive: true,
    },
  });

  console.log('✅ Created student user:', student.email);

  // Create a sample module
  const module = await prisma.module.upsert({
    where: { id: 'sample-module-1' },
    update: {},
    create: {
      id: 'sample-module-1',
      title: 'Introduction to Mechanical Ventilation',
      description: 'Fundamental concepts of mechanical ventilation',
      order: 1,
      category: 'FUNDAMENTALS',
      difficulty: 'BEGINNER',
      estimatedTime: 60,
      isActive: true,
      status: 'available',
    },
  });

  console.log('✅ Created module:', module.title);

  // Create a sample lesson
  const lesson = await prisma.lesson.upsert({
    where: { id: 'sample-lesson-1' },
    update: {},
    create: {
      id: 'sample-lesson-1',
      moduleId: module.id,
      title: 'Basic Ventilation Principles',
      content: {
        sections: [
          {
            type: 'text',
            content: 'This is a sample lesson about basic ventilation principles.',
          },
        ],
      },
      order: 1,
      difficulty: 'BEGINNER',
      estimatedTime: 15,
      aiGenerated: false,
    },
  });

  console.log('✅ Created lesson:', lesson.title);

  // Create sample progress record
  const progress = await prisma.progress.create({
    data: {
      userId: student.id,
      moduleId: module.id,
      completed: false,
      timeSpent: 0,
      score: null,
    },
  });

  console.log('✅ Created progress record for student');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

