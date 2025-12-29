const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../src/models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected');

        const email = 'admin@example.com';
        const password = 'password123';

        let user = await User.findOne({ email });
        if (user) {
            console.log('User already exists, updating role...');
            user.role = 'super-admin';
            user.password = password; // Will be hashed by pre-save
            await user.save();
            console.log('User updated to super-admin');
        } else {
            await User.create({
                name: 'Super Admin',
                email,
                password,
                phone: '01700000000',
                role: 'super-admin',
                isVerified: true
            });
            console.log('Admin user created');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

createAdmin();
