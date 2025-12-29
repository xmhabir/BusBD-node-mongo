const mongoose = require('mongoose');
const TripSchedule = require('./server/src/models/TripSchedule');
require('dotenv').config({ path: './server/.env' });

async function checkSeat() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const tripId = '693f33d73197cf6fb3ce1a5d'; // Derived from log
        const seatNum = 'B4';

        const trip = await TripSchedule.findById(tripId);
        if (!trip) {
            console.log('Trip not found');
            return;
        }

        const seat = trip.seats.find(s => s.seatNumber === seatNum);
        console.log('Seat B4 State:', JSON.stringify(seat, null, 2));

        const seatC4 = trip.seats.find(s => s.seatNumber === 'C4');
        console.log('Seat C4 State:', JSON.stringify(seatC4, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkSeat();
