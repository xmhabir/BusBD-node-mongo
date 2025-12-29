const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const TripSchedule = require('../src/models/TripSchedule');

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkDates = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected');

        const trips = await TripSchedule.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$departureTime" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('📅 Trips per date:');
        trips.forEach(t => console.log(`${t._id}: ${t.count} trips`));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkDates();
