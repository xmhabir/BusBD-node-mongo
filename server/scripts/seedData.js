const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Operator = require('../src/models/Operator');
const Bus = require('../src/models/Bus');
const TripSchedule = require('../src/models/TripSchedule');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const sampleLayout = {
    rows: 10,
    columns: 4,
    layout: Array(10).fill(['seat', 'seat', 'aisle', 'seat', 'seat']),
    seatLabels: {
        '0-0': 'A1', '0-1': 'A2', '0-3': 'A3', '0-4': 'A4',
        '1-0': 'B1', '1-1': 'B2', '1-3': 'B3', '1-4': 'B4',
        '2-0': 'C1', '2-1': 'C2', '2-3': 'C3', '2-4': 'C4',
        '3-0': 'D1', '3-1': 'D2', '3-3': 'D3', '3-4': 'D4',
        '4-0': 'E1', '4-1': 'E2', '4-3': 'E3', '4-4': 'E4',
        '5-0': 'F1', '5-1': 'F2', '5-3': 'F3', '5-4': 'F4',
        '6-0': 'G1', '6-1': 'G2', '6-3': 'G3', '6-4': 'G4',
        '7-0': 'H1', '7-1': 'H2', '7-3': 'H3', '7-4': 'H4',
        '8-0': 'I1', '8-1': 'I2', '8-3': 'I3', '8-4': 'I4',
        '9-0': 'J1', '9-1': 'J2', '9-3': 'J3', '9-4': 'J4',
    }
};

const operators = [
    {
        name: 'Hanif Enterprise',
        code: 'HNF',
        contact: { email: 'info@hanif.com', phone: '01711000000', address: 'Panthapath, Dhaka' },
        rating: { average: 4.8, count: 5000 }
    },
    {
        name: 'Ena Transport',
        code: 'ENA',
        contact: { email: 'info@ena.com', phone: '01712000000', address: 'Mohakhali, Dhaka' },
        rating: { average: 4.6, count: 3500 }
    }
];

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

const seed = async () => {
    await connectDB();

    try {
        console.log('🌱 Starting seed...');

        // Create Operators
        const createdOperators = [];
        for (const op of operators) {
            let operator = await Operator.findOne({ code: op.code });
            if (!operator) {
                operator = await Operator.create(op);
                console.log(`Created Operator: ${op.name}`);
            }
            createdOperators.push(operator);
        }

        // Create Buses
        const buses = [];
        const busTypes = ['AC', 'Non-AC'];

        for (let i = 0; i < 4; i++) {
            const operator = createdOperators[i % 2];
            const type = busTypes[i % 2];
            const busData = {
                registrationNumber: `${operator.code}-${1000 + i}`,
                operator: operator._id,
                busType: type,
                model: type === 'AC' ? 'Scania K410' : 'Hino 1J',
                totalSeats: 40,
                seatLayout: sampleLayout,
                amenities: type === 'AC' ? ['wifi', 'charging', 'tv', 'water', 'blanket'] : ['charging', 'tv'],
                images: [],
                isActive: true
            };

            // Check if bus exists
            let bus = await Bus.findOne({ registrationNumber: busData.registrationNumber });
            if (!bus) {
                bus = await Bus.create(busData);
                console.log(`Created Bus: ${busData.registrationNumber}`);
            }
            buses.push(bus);
        }

        // Create Trips (for tomorrow and day after)
        const routes = [
            { origin: 'Dhaka', destination: 'Chittagong', distance: 265, price: { ac: 1200, nonAc: 680 } },
            { origin: 'Dhaka', destination: 'Sylhet', distance: 240, price: { ac: 900, nonAc: 550 } },
            { origin: 'Dhaka', destination: "Cox's Bazar", distance: 395, price: { ac: 1600, nonAc: 900 } }
        ];

        // Generate for next 30 days
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let d = 0; d < 30; d++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() + d);

            for (const route of routes) {
                for (const bus of buses) {
                    const isAc = bus.busType === 'AC';
                    const baseFare = isAc ? route.price.ac : route.price.nonAc;

                    // Morning trip
                    const departureTime1 = new Date(currentDate);
                    departureTime1.setHours(8, 0, 0, 0); // 8:00 AM

                    // Night trip
                    const departureTime2 = new Date(currentDate);
                    departureTime2.setHours(22, 30, 0, 0); // 10:30 PM

                    const tripDataRaw = {
                        bus: bus._id,
                        operator: bus.operator,
                        route: {
                            origin: route.origin,
                            destination: route.destination,
                            distance: route.distance,
                            stops: [{ name: route.origin, order: 1 }, { name: route.destination, order: 2 }]
                        },
                        fare: { base: baseFare, tax: 50, discount: 0 },
                        totalSeats: bus.totalSeats,
                        availableSeats: bus.totalSeats,
                        seats: [], // Will generate seats
                        status: 'scheduled'
                    };

                    // Re-use seat generation
                    const seatList = [];
                    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
                    for (const row of rows) {
                        for (let n = 1; n <= 4; n++) {
                            seatList.push({
                                seatNumber: `${row}${n}`,
                                status: 'available',
                                price: baseFare
                            });
                        }
                    }

                    // Create Morning Trip
                    const trip1 = { ...tripDataRaw };
                    trip1.seats = [...seatList]; // Copy
                    trip1.departureTime = departureTime1;
                    trip1.arrivalTime = new Date(departureTime1.getTime() + 6 * 60 * 60 * 1000);

                    // Check duplicate before creating (idempotency-ish)
                    const exists1 = await TripSchedule.findOne({
                        'bus': bus._id,
                        departureTime: departureTime1
                    });

                    if (!exists1) {
                        await TripSchedule.create(trip1);
                        process.stdout.write('.'); // Progress dot
                    }

                    // Create Night Trip
                    const trip2 = { ...tripDataRaw };
                    trip2.seats = [...seatList]; // Copy
                    trip2.departureTime = departureTime2;
                    trip2.arrivalTime = new Date(departureTime2.getTime() + 8 * 60 * 60 * 1000);

                    const exists2 = await TripSchedule.findOne({
                        'bus': bus._id,
                        departureTime: departureTime2
                    });

                    if (!exists2) {
                        await TripSchedule.create(trip2);
                        process.stdout.write('.');
                    }
                }
            }
        }
        console.log('\n');

        console.log('✅ Seeding complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seed();
