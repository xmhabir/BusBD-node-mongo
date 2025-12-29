import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Singleton socket instance
let socket;

const getSocket = (token, guestId) => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            auth: { token, guestId },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            autoConnect: false // We connect manually
        });
    } else {
        // Update auth if changed
        socket.auth = { token, guestId };
    }
    return socket;
};

export function useTripSocket(tripId) {
    const { user, token } = useAuth();
    const [connected, setConnected] = useState(false);
    const [seatUpdates, setSeatUpdates] = useState([]);
    const [lastGlobalUpdate, setLastGlobalUpdate] = useState(Date.now());

    // Manage Guest ID
    const [guestId] = useState(() => {
        let id = localStorage.getItem('guest_id');
        if (!id) {
            id = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('guest_id', id);
        }
        return id;
    });

    const socketUserId = user?.id || user?._id || guestId;

    useEffect(() => {
        const socketInstance = getSocket(token, guestId);

        if (!socketInstance.connected) {
            socketInstance.connect();
        }

        function onConnect() {
            console.log('Socket connected');
            setConnected(true);
            if (tripId) {
                socketInstance.emit('join_trip', tripId);
            }
        }

        function onDisconnect() {
            setConnected(false);
        }

        function onSeatLocked(data) {
            setSeatUpdates(prev => [...prev, { type: 'locked', ...data }]);
        }

        function onSeatUnlocked(data) {
            setSeatUpdates(prev => [...prev, { type: 'unlocked', ...data }]);
        }

        function onSeatsBooked(data) {
            setSeatUpdates(prev => [...prev, { type: 'booked', ...data }]);
        }

        function onLockSuccess(data) {
            setSeatUpdates(prev => [...prev, { type: 'lock_success', ...data }]);
        }

        function onLockFailed(data) {
            setSeatUpdates(prev => [...prev, { type: 'lock_failed', ...data }]);
        }

        function onReleaseSuccess(data) {
            setSeatUpdates(prev => [...prev, { type: 'release_success', ...data }]);
        }

        function onSeatsUpdated(data) {
            setLastGlobalUpdate(Date.now());
        }

        socketInstance.on('connect', onConnect);
        socketInstance.on('disconnect', onDisconnect);

        // If already connected, manual invoke
        if (socketInstance.connected) {
            onConnect();
        }

        // Listeners
        socketInstance.on('seat_locked', onSeatLocked);
        socketInstance.on('seat_unlocked', onSeatUnlocked);
        socketInstance.on('seats_booked', onSeatsBooked);
        socketInstance.on('seat_lock_success', onLockSuccess);
        socketInstance.on('seat_lock_failed', onLockFailed);
        socketInstance.on('seat_release_success', onReleaseSuccess);
        socketInstance.on('seats_updated', onSeatsUpdated);

        return () => {
            if (tripId) {
                socketInstance.emit('leave_trip', tripId);
            }

            socketInstance.off('connect', onConnect);
            socketInstance.off('disconnect', onDisconnect);
            socketInstance.off('seat_locked', onSeatLocked);
            socketInstance.off('seat_unlocked', onSeatUnlocked);
            socketInstance.off('seats_booked', onSeatsBooked);
            socketInstance.off('seat_lock_success', onLockSuccess);
            socketInstance.off('seat_lock_failed', onLockFailed);
            socketInstance.off('seat_release_success', onReleaseSuccess);
            socketInstance.off('seats_updated', onSeatsUpdated);

            // Do NOT disconnect the socket, just leave the room.
            // This prevents race conditions where emit is cancelled by disconnect.
        };
    }, [tripId, token, guestId]);

    const selectSeat = useCallback((seatNumber) => {
        const s = socket || getSocket(token, guestId);
        s.emit('client_select_seat', { tripId, seatNumber });
    }, [tripId, token, guestId]);

    const releaseSeat = useCallback((seatNumber) => {
        const s = socket || getSocket(token, guestId);
        s.emit('client_release_seat', { tripId, seatNumber });
    }, [tripId, token, guestId]);

    const extendLock = useCallback((seatNumber) => {
        const s = socket || getSocket(token, guestId);
        s.emit('extend_lock', { tripId, seatNumber });
    }, [tripId, token, guestId]);

    const clearUpdates = useCallback(() => {
        setSeatUpdates([]);
    }, []);

    return {
        connected: socket?.connected || false,
        seatUpdates,
        selectSeat,
        releaseSeat,
        extendLock,
        clearUpdates,
        userId: socketUserId,
        lastGlobalUpdate
    };
}
