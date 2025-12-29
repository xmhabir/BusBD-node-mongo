import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useTripSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

export default function SeatMap({ tripId, seats, seatLayout, onSeatsChange, maxSeats = 4, selectedSeats: propSelectedSeats }) {
    const [realtimeOverrides, setRealtimeOverrides] = useState({});
    const [internalSelectedSeats, setInternalSelectedSeats] = useState([]);

    // Derived state: Use prop if available (Controlled), otherwise internal state (Uncontrolled)
    const selectedSeats = propSelectedSeats !== undefined ? propSelectedSeats : internalSelectedSeats;

    // Helper to update selection logic which works for both modes
    const updateSelectedSeats = useCallback((newSelectionOrFn) => {
        // Get the current selection fresh each time
        const currentSelection = propSelectedSeats !== undefined ? propSelectedSeats : internalSelectedSeats;

        let newSelection;
        if (typeof newSelectionOrFn === 'function') {
            newSelection = newSelectionOrFn(currentSelection);
        } else {
            newSelection = newSelectionOrFn;
        }

        // Uncontrolled mode: update internal state
        if (propSelectedSeats === undefined) {
            setInternalSelectedSeats(newSelection);
        }

        // Always notify parent (for both Controlled and Uncontrolled)
        onSeatsChange?.(newSelection);
    }, [propSelectedSeats, internalSelectedSeats, onSeatsChange]);

    // Destructure userId from the socket hook
    const { connected, seatUpdates, selectSeat, releaseSeat, clearUpdates, userId } = useTripSocket(tripId);
    const { user } = useAuth();
    const { toast } = useToast();

    // Compute merged seat states using useMemo to avoid effect loops
    const seatStates = useMemo(() => {
        const states = {};
        seats.forEach(seat => {
            states[seat.seatNumber] = {
                status: seat.status,
                lockedBy: seat.lockedBy,
                isLockedInRealtime: seat.isLockedInRealtime,
                soldBy: seat.soldBy
            };
        });

        // Apply realtime overrides
        // We use spread to override base state with socket updates
        return { ...states, ...realtimeOverrides };
    }, [seats, realtimeOverrides]);

    // Clear realtime overrides when seats prop changes (schedule refresh)
    // This ensures database state takes precedence over stale socket updates
    useEffect(() => {
        setRealtimeOverrides({});
    }, [seats]);

    // Initial Uncontrolled Sync (Only run if tripId changes or first load)
    // Uncontrolled Sync Removed to prevent loops. 
    // Admin mode always provides selectedSeats.

    // Handle real-time updates
    // Handle real-time updates (update overrides)
    useEffect(() => {
        if (seatUpdates.length === 0) return;

        const latestUpdate = seatUpdates[seatUpdates.length - 1];

        switch (latestUpdate.type) {
            case 'locked':
                setRealtimeOverrides(prev => ({
                    ...prev,
                    [latestUpdate.seatNumber]: {
                        status: 'locked',
                        lockedBy: latestUpdate.lockedBy
                    }
                }));
                // Remove from selected if locked by another user
                // Only update if the seat is actually in the current selection
                if (latestUpdate.lockedBy !== userId && selectedSeats.includes(latestUpdate.seatNumber)) {
                    updateSelectedSeats(prev => prev.filter(s => s !== latestUpdate.seatNumber));
                }
                break;

            case 'unlocked':
                setRealtimeOverrides(prev => ({
                    ...prev,
                    [latestUpdate.seatNumber]: { status: 'available', lockedBy: null }
                }));
                break;

            case 'booked':
                {
                    // Batch update for booked seats
                    const newBooked = {};
                    latestUpdate.seatNumbers?.forEach(seatNum => {
                        newBooked[seatNum] = {
                            status: latestUpdate.status || 'booked',
                            lockedBy: null
                        };
                    });
                    setRealtimeOverrides(prev => ({ ...prev, ...newBooked }));
                }
                break;

            case 'lock_success':
                // Only add if not already in selection
                if (!selectedSeats.includes(latestUpdate.seatNumber)) {
                    updateSelectedSeats(prev => [...prev, latestUpdate.seatNumber]);
                }
                toast({
                    title: 'Seat Selected',
                    description: `Seat ${latestUpdate.seatNumber} reserved for 30 seconds`
                });
                break;

            case 'lock_failed':
                toast({
                    title: 'Selection Failed',
                    description: latestUpdate.reason,
                    variant: 'destructive'
                });
                break;
        }

        clearUpdates();
    }, [seatUpdates, userId, clearUpdates, toast, updateSelectedSeats, selectedSeats]);

    // Handle real-time success confirm separately to have correct text
    useEffect(() => {
        if (seatUpdates.length === 0) return;
        const last = seatUpdates[seatUpdates.length - 1];
        if (last.type === 'lock_success') {
            // Updated toast
        }
    }, [seatUpdates]);

    // Track previous propSelectedSeats to detect removals from parent
    const prevPropSelectedSeats = useRef(propSelectedSeats);
    useEffect(() => {
        if (propSelectedSeats !== undefined && prevPropSelectedSeats.current !== undefined) {
            const removed = prevPropSelectedSeats.current.filter(s => !propSelectedSeats.includes(s));
            removed.forEach(seatNumber => {
                const state = seatStates[seatNumber];
                // If it was locked by us, release it explicitly
                const lockedById = state?.lockedBy && typeof state.lockedBy === 'object' ? state.lockedBy._id : state.lockedBy;
                if (state?.status === 'locked' && lockedById === userId) {
                    releaseSeat(seatNumber);
                }
            });
        }
        prevPropSelectedSeats.current = propSelectedSeats;
    }, [propSelectedSeats, seatStates, userId, releaseSeat]);

    // Removed the Effect that called `onSeatsChange` on `selectedSeats` change, 
    // because `updateSelectedSeats` now calls it explicitly.

    const handleSeatClick = useCallback((seatNumber) => {
        const state = seatStates[seatNumber];
        const seatData = seats.find(s => s.seatNumber === seatNumber);

        // Can't select locked by others
        if (state?.status === 'locked' && state?.lockedBy !== userId) return;

        // MODE 1: Managing Occupied Seats (Booked/Sold)
        if (state?.status === 'booked' || state?.status === 'sold') {
            const bookingId = seatData?.bookingId;

            // Check if already selected - allow deselection
            const isAlreadySelected = selectedSeats.includes(seatNumber);
            if (isAlreadySelected) {
                updateSelectedSeats(prev => prev.filter(s => s !== seatNumber));
                return;
            }

            if (!bookingId) return; // Should not happen if data integrity is good

            // Check if we are starting a new selection or modifying existing
            const isGroupSelection = selectedSeats.length > 0 && selectedSeats.some(s => {
                const other = seats.find(os => os.seatNumber === s);
                return (other?.status === 'booked' || other?.status === 'sold');
            });

            if (!isGroupSelection) {
                // New Group Selection: Auto-select ALL seats in this booking
                const groupSeats = seats
                    .filter(s => s.bookingId === bookingId)
                    .map(s => s.seatNumber);
                updateSelectedSeats(groupSeats);
            } else {
                // Existing Group Selection: Toggle this specific seat (Granular Control)
                const currentGroupBookingId = seats.find(s => s.seatNumber === selectedSeats[0])?.bookingId;

                if (currentGroupBookingId !== bookingId) {
                    // Switch to new group
                    const groupSeats = seats
                        .filter(s => s.bookingId === bookingId)
                        .map(s => s.seatNumber);
                    updateSelectedSeats(groupSeats);
                } else {
                    // Add to current group
                    updateSelectedSeats(prev => [...prev, seatNumber]);
                }
            }
            return;
        }

        // MODE 2: Booking Available Seats
        // If we were previously selecting occupied seats, clear them first
        const isOccupiedSelection = selectedSeats.length > 0 && selectedSeats.some(s => {
            const other = seats.find(os => os.seatNumber === s);
            return (other?.status === 'booked' || other?.status === 'sold');
        });

        if (isOccupiedSelection) {
            // Reset to just this new available seat
            selectSeat(seatNumber); // Select via socket
            updateSelectedSeats([seatNumber]); // Optimistic
            return;
        }

        // Standard toggle for available seats
        // If already selected by us, release it
        if (selectedSeats.includes(seatNumber)) {
            // Only release via socket if it's actually locked
            if (state?.status === 'locked' && state?.lockedBy === userId) {
                releaseSeat(seatNumber);
            }
            // Always update selection state
            updateSelectedSeats(prev => prev.filter(s => s !== seatNumber));
            return;
        }

        // Check max seats limit
        if (selectedSeats.length >= maxSeats) {
            toast({
                title: 'Maximum seats reached',
                description: `You can only select up to ${maxSeats} seats`,
                variant: 'destructive'
            });
            return;
        }

        // Check if already locked by us (stale lock from previous schedule visit)
        const lockedById = state?.lockedBy && typeof state.lockedBy === 'object' ? state.lockedBy._id : state.lockedBy;
        if (state?.status === 'locked' && lockedById === userId) {
            updateSelectedSeats(prev => [...prev, seatNumber]);
        }

        // Try to lock the seat (or refresh existing lock)
        selectSeat(seatNumber);
    }, [seatStates, selectedSeats, maxSeats, userId, selectSeat, releaseSeat, toast, seats, updateSelectedSeats]);

    const getSeatClass = useCallback((seatNumber) => {
        const state = seatStates[seatNumber];

        // Priority 1: Check if in selectedSeats array (controlled state)
        if (selectedSeats.includes(seatNumber)) {
            return 'seat seat-selected';
        }

        const currentUserId = userId; // from hook

        switch (state?.status) {
            case 'sold': {
                const soldById = state.soldBy && typeof state.soldBy === 'object' ? state.soldBy._id : state.soldBy;
                return soldById === currentUserId
                    ? 'seat seat-sold-mine'
                    : 'seat seat-sold-other';
            }
            case 'booked': {
                // Just booked (temporary hold) - always yellow
                return 'seat seat-booked';
            }
            case 'locked': {
                const lockedById = state.lockedBy && typeof state.lockedBy === 'object' ? state.lockedBy._id : state.lockedBy;
                // If locked by current user but not in selectedSeats, show as available (stale lock)
                if (lockedById === currentUserId) {
                    return 'seat seat-available';
                }
                // Locked by others - show as locked (gray)
                return 'seat seat-locked';
            }
            default:
                return 'seat seat-available';
        }
    }, [seatStates, selectedSeats, userId]);

    // Render seat layout grid
    const renderLayout = () => {
        if (!seatLayout?.layout) {
            // Default simple layout
            return (
                <div className="grid grid-cols-4 gap-2">
                    {seats.map(seat => (
                        <button
                            key={seat.seatNumber}
                            className={getSeatClass(seat.seatNumber)}
                            onClick={() => handleSeatClick(seat.seatNumber)}
                        // disabled={seatStates[seat.seatNumber]?.status === 'booked'} // Allow clicking booked seats for admin
                        >
                            {seat.seatNumber}
                        </button>
                    ))}
                </div>
            );
        }

        // Custom layout from bus configuration
        return (
            <div className="flex flex-col gap-2">
                {seatLayout.layout.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-2 justify-center">
                        {row.map((cell, colIndex) => {
                            if (cell === 'aisle') {
                                return <div key={colIndex} className="seat-aisle" />;
                            }
                            if (cell === 'empty') {
                                return <div key={colIndex} className="w-16 h-16" />;
                            }
                            const seatLabel = seatLayout.seatLabels?.[`${rowIndex}-${colIndex}`] || `${rowIndex + 1}${String.fromCharCode(65 + colIndex)}`;
                            return (
                                <button
                                    key={colIndex}
                                    className={getSeatClass(seatLabel)}
                                    onClick={() => handleSeatClick(seatLabel)}
                                // disabled={seatStates[seatLabel]?.status === 'booked'}
                                >
                                    {seatLabel}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="w-full">
            {renderLayout()}
        </div>
    );
}
