// MongoDB initialization script
// This runs when the container is first created

db = db.getSiblingDB('busbd');

// Create collections with validation
db.createCollection('users', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['email', 'password', 'name', 'phone'],
            properties: {
                email: { bsonType: 'string' },
                password: { bsonType: 'string' },
                name: { bsonType: 'string' },
                role: { enum: ['user', 'operator-admin', 'super-admin'] }
            }
        }
    }
});

db.createCollection('operators');
db.createCollection('buses');
db.createCollection('tripschedules');
db.createCollection('bookings');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

db.operators.createIndex({ code: 1 }, { unique: true });
db.operators.createIndex({ isActive: 1 });

db.buses.createIndex({ registrationNumber: 1 }, { unique: true });
db.buses.createIndex({ operator: 1 });

db.tripschedules.createIndex({ 'route.origin': 1, 'route.destination': 1, departureTime: 1 });
db.tripschedules.createIndex({ operator: 1, departureTime: 1 });
db.tripschedules.createIndex({ status: 1, departureTime: 1 });

db.bookings.createIndex({ bookingId: 1 }, { unique: true });
db.bookings.createIndex({ user: 1 });
db.bookings.createIndex({ tripSchedule: 1 });
db.bookings.createIndex({ createdAt: -1 });

// Insert default super admin
db.users.insertOne({
    email: 'admin@busbd-clone.com',
    // Password: Admin@123 (bcrypt hash)
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4FqJxKBOAKZNK.ni',
    name: 'Super Admin',
    phone: '+8801700000000',
    role: 'super-admin',
    isActive: true,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
});

// Insert sample operator
db.operators.insertOne({
    name: 'Green Line Paribahan',
    code: 'GLP',
    contact: {
        email: 'info@greenline.com',
        phone: '+8801711111111',
        address: 'Dhaka, Bangladesh'
    },
    rating: { average: 4.5, count: 1250 },
    isActive: true,
    isVerified: true,
    commissionRate: 10,
    createdAt: new Date(),
    updatedAt: new Date()
});

print('✅ MongoDB initialized with default data');
