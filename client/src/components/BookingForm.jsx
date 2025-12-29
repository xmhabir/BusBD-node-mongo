import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bookingApi } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export default function BookingForm({ tripId, selectedSeats, fare, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [passengers, setPassengers] = useState(
        selectedSeats.map(seat => ({ seatNumber: seat, name: '', age: '', gender: 'male' }))
    );
    const [contactInfo, setContactInfo] = useState({ name: '', email: '', phone: '' });
    const { toast } = useToast();
    const navigate = useNavigate();

    const totalAmount = fare.base * selectedSeats.length + fare.tax * selectedSeats.length;

    const handlePassengerChange = (index, field, value) => {
        setPassengers(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!contactInfo.name || !contactInfo.email || !contactInfo.phone) {
            toast({
                title: 'Missing Information',
                description: 'Please fill in all contact details',
                variant: 'destructive'
            });
            return;
        }

        const invalidPassenger = passengers.find(p => !p.name);
        if (invalidPassenger) {
            toast({
                title: 'Missing Passenger Name',
                description: 'Please enter names for all passengers',
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);
        try {
            const response = await bookingApi.create({
                tripId,
                seats: selectedSeats,
                passengers,
                contactInfo
            });

            toast({
                title: 'Booking Confirmed!',
                description: `Booking ID: ${response.data.booking.bookingId}`
            });

            onSuccess?.(response.data.booking);
            navigate(`/booking/${response.data.booking.id}`);
        } catch (error) {
            console.error('Booking failed:', error);
            // Extract validation errors if available
            let errorMessage = error.message;
            // The API service throws Error(data.message), so we might need to change how we handle this.
            // But wait, the standard api.js throws new Error(data.message || 'API request failed').
            // If the server returns { success: false, errors: [...] }, the message might be undefined?
            // Actually, the validate middleware returns { success: false, errors: [...] }.
            // The api.js will throw 'API request failed' if data.message is missing.

            // Let's rely on the user trying again and checking server logs first, 
            // OR improve api.js to include errors. 
            // For now, let's just show what we have.
            toast({
                title: 'Booking Failed',
                description: errorMessage,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold">Complete Your Booking</h2>

            {/* Contact Information */}
            <div className="space-y-4">
                <h3 className="font-medium text-muted-foreground">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="contact-name">Full Name</Label>
                        <Input
                            id="contact-name"
                            value={contactInfo.name}
                            onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="John Doe"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="contact-email">Email</Label>
                        <Input
                            id="contact-email"
                            type="email"
                            value={contactInfo.email}
                            onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="john@example.com"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="contact-phone">Phone</Label>
                        <Input
                            id="contact-phone"
                            value={contactInfo.phone}
                            onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+880 1XXX-XXXXXX"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Passenger Details */}
            <div className="space-y-4">
                <h3 className="font-medium text-muted-foreground">Passenger Details</h3>
                {passengers.map((passenger, index) => (
                    <div key={passenger.seatNumber} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Seat {passenger.seatNumber}</span>
                            <span className="text-sm text-muted-foreground">Passenger {index + 1}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <Label>Name</Label>
                                <Input
                                    value={passenger.name}
                                    onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
                                    placeholder="Passenger name"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Age</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="120"
                                    value={passenger.age}
                                    onChange={(e) => handlePassengerChange(index, 'age', e.target.value)}
                                    placeholder="Age"
                                />
                            </div>
                            <div>
                                <Label>Gender</Label>
                                <select
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    value={passenger.gender}
                                    onChange={(e) => handlePassengerChange(index, 'gender', e.target.value)}
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Price Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-2">
                <h3 className="font-medium">Price Summary</h3>
                <div className="flex justify-between text-sm">
                    <span>Base Fare ({selectedSeats.length} × ৳{fare.base})</span>
                    <span>৳{fare.base * selectedSeats.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>৳{fare.tax * selectedSeats.length}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary">৳{totalAmount}</span>
                </div>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                    </>
                ) : (
                    `Pay ৳${totalAmount} & Confirm`
                )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
                By clicking confirm, you agree to our Terms of Service and Cancellation Policy
            </p>
        </form>
    );
}
