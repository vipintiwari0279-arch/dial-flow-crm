const { User, Lead, Call, Target } = require('../models');

const seedDatabase = async () => {
  try {
    // 1. Create Default Users
    const adminCount = await User.count({ where: { role: 'admin' } });
    let adminUser;
    if (adminCount === 0) {
      adminUser = await User.create({
        name: 'Admin',
        email: 'admin@dialflow.com',
        password: 'adminpassword',
        role: 'admin',
        status: 'online'
      });
      console.log('Seed: Admin user created (admin@dialflow.com / adminpassword)');
    } else {
      adminUser = await User.findOne({ where: { role: 'admin' } });
    }

    const agentsData = [
      { name: 'Vipin Kumar', email: 'vipin@dialflow.com', password: 'password123', status: 'online' },
      { name: 'Amit Sharma', email: 'amit@dialflow.com', password: 'password123', status: 'online' },
      { name: 'Pooja Singh', email: 'pooja@dialflow.com', password: 'password123', status: 'online' },
      { name: 'Rohit Verma', email: 'rohit@dialflow.com', password: 'password123', status: 'offline' },
      { name: 'Neha Patel', email: 'neha@dialflow.com', password: 'password123', status: 'online' }
    ];

    const agents = [];
    for (const agent of agentsData) {
      let user = await User.findOne({ where: { email: agent.email } });
      if (!user) {
        user = await User.create({
          name: agent.name,
          email: agent.email,
          password: agent.password,
          role: 'agent',
          status: agent.status
        });
        console.log(`Seed: Agent created (${agent.email} / password123)`);
      }
      agents.push(user);
    }

    // 2. Set targets for today
    const today = new Date().toISOString().split('T')[0];
    for (const agent of agents) {
      const targetExists = await Target.findOne({ where: { agentId: agent.id, targetDate: today } });
      if (!targetExists) {
        await Target.create({
          agentId: agent.id,
          targetCalls: agent.name === 'Vipin Kumar' ? 150 : 120,
          targetDate: today
        });
      }
    }

    // 3. Create Sample Leads
    const leadCount = await Lead.count();
    if (leadCount === 0) {
      const sampleLeads = [
        { name: 'Rajesh Kumar', phone: '9876543210', city: 'Lucknow', state: 'Uttar Pradesh', status: 'allocated', allocatedTo: agents[0].id },
        { name: 'Sanjay Dutt', phone: '9123456780', city: 'Mumbai', state: 'Maharashtra', status: 'allocated', allocatedTo: agents[0].id },
        { name: 'Aarav Mehta', phone: '9876123450', city: 'Ahmedabad', state: 'Gujarat', status: 'allocated', allocatedTo: agents[1].id },
        { name: 'Karan Johar', phone: '9988776655', city: 'Delhi', state: 'Delhi', status: 'allocated', allocatedTo: agents[1].id },
        { name: 'Vikram Seth', phone: '9898989898', city: 'Kolkata', state: 'West Bengal', status: 'allocated', allocatedTo: agents[2].id },
        { name: 'Sneha Rao', phone: '9765432109', city: 'Bengaluru', state: 'Karnataka', status: 'allocated', allocatedTo: agents[2].id },
        { name: 'Priya Sharma', phone: '9543210987', city: 'Pune', state: 'Maharashtra', status: 'pending' },
        { name: 'Rahul Verma', phone: '9432109876', city: 'Jaipur', state: 'Rajasthan', status: 'pending' },
        { name: 'Ananya Goel', phone: '9321098765', city: 'Gurugram', state: 'Haryana', status: 'pending' },
        { name: 'Deepak Patel', phone: '9210987654', city: 'Surat', state: 'Gujarat', status: 'pending' }
      ];

      for (const lead of sampleLeads) {
        await Lead.create(lead);
      }
      console.log('Seed: Sample leads created');

      // Create some call logs for agent statistics
      // Let's log some completed calls to reflect dashboard data
      // For Vipin (agents[0])
      const lead1 = await Lead.findOne({ where: { name: 'Rajesh Kumar' } });
      if (lead1) {
        await Call.create({
          leadId: lead1.id,
          agentId: agents[0].id,
          duration: 45,
          disposition: 'interested',
          notes: 'Customer was very interested, requested callback tomorrow.'
        });
        lead1.status = 'called';
        lead1.disposition = 'interested';
        lead1.notes = 'Customer was very interested, requested callback tomorrow.';
        await lead1.save();
      }

      const lead2 = await Lead.findOne({ where: { name: 'Sanjay Dutt' } });
      if (lead2) {
        await Call.create({
          leadId: lead2.id,
          agentId: agents[0].id,
          duration: 12,
          disposition: 'not_interested',
          notes: 'Not interested. Wrong target group.'
        });
        lead2.status = 'called';
        lead2.disposition = 'not_interested';
        lead2.notes = 'Not interested. Wrong target group.';
        await lead2.save();
      }

      console.log('Seed: Initial Call Logs seeded.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

module.exports = seedDatabase;
