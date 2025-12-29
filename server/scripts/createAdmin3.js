const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../src/models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const createAdmin3 = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error('❌ MONGO_URI not found in environment');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected');

        const email = 'admin3@example.com';
        const password = 'password123';

        let user = await User.findOne({ email });
        if (user) {
            console.log(`User ${email} already exists, updating role...`);
            user.role = 'super-admin';
            user.password = password;
            await user.save();
            console.log('User updated to super-admin');
        } else {
            await User.create({
                name: 'Third Admin',
                email,
                password,
                phone: '01733333333',
                role: 'super-admin',
                isVerified: true,
                isActive: true
            });
            console.log(`Admin user ${email} created with password: ${password}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin3();
