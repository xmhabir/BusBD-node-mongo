import { create } from 'zustand';

const useBookingStore = create((set, get) => ({
    // Map of scheduleId -> array of selected seat numbers
    selections: {},

    // Timestamp of last user interaction with seats
    lastActivity: Date.now(),

    // Actions

    // Get selections for a specific schedule
    getScheduleSelection: (scheduleId) => {
        return get().selections[scheduleId] || [];
    },

    // Toggle a seat for a schedule
    toggleSeat: (scheduleId, seatNumber) => {
        set((state) => {
            const current = state.selections[scheduleId] || [];
            const exists = current.includes(seatNumber);

            let newSelection;
            if (exists) {
                newSelection = current.filter(s => s !== seatNumber);
            } else {
                newSelection = [...current, seatNumber];
            }

            // If new selection is empty, we might want to remove the key, but keeping empty array is fine too
            return {
                selections: {
                    ...state.selections,
                    [scheduleId]: newSelection
                },
                lastActivity: Date.now()
            };
        });
    },

    // Set absolute selection (e.g., for auto-selecting a group)
    setSelection: (scheduleId, seats) => {
        set((state) => ({
            selections: {
                ...state.selections,
                [scheduleId]: seats
            },
            lastActivity: Date.now()
        }));
    },

    // Clear selections for a specific schedule
    clearScheduleSelection: (scheduleId) => {
        set((state) => {
            const newSelections = { ...state.selections };
            delete newSelections[scheduleId];
            return {
                selections: newSelections,
                lastActivity: Date.now()
            };
        });
    },

    // Clear ALL selections (e.g. on timeout)
    clearAllSelections: () => {
        set({ selections: {}, lastActivity: Date.now() });
    },

    // Update activity timestamp (can be called by other interactions if needed)
    touchActivity: () => set({ lastActivity: Date.now() })
}));

export default useBookingStore;
