const { sequelize, LeaveRequest, User } = require('./models');
const seedDatabase = require('./config/seed');

async function runTest() {
  try {
    console.log('Testing DB connection...');
    await sequelize.authenticate();
    console.log('DB Connection successful. Syncing models...');
    
    // Sync models to make sure SQLite database is synchronized
    await sequelize.sync({ alter: true });
    console.log('Sync complete. Seeding database...');

    // Run database seeder
    await seedDatabase();
    console.log('Seeding complete.');

    // Find first agent or admin user
    const user = await User.findOne();
    if (!user) {
      console.log('No user found to associate leave request with.');
      return;
    }
    
    console.log(`Testing LeaveRequest creation for User: ${user.name} (${user.id})...`);
    const request = await LeaveRequest.create({
      userId: user.id,
      leaveType: 'sick',
      startDate: '2026-07-10',
      endDate: '2026-07-12',
      reason: 'Fever',
      status: 'pending'
    });
    
    console.log('SUCCESS! Leave request created successfully:', request.toJSON());
  } catch (error) {
    console.error('ERROR ENCOUNTERED:', error);
  } finally {
    await sequelize.close();
  }
}

runTest();
