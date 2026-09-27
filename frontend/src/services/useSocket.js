import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const useSocket = (url, event, handler) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const newSocket = io(url, { reconnection: true });
        setSocket(newSocket);

        newSocket.on(event, handler);

        newSocket.on('connect_error', (error) => console.error('Connection Error:', error));

        return () => {
            newSocket.off(event, handler);
            newSocket.close();
        };
    }, [url, event, handler]);

    return socket;
};

export default useSocket;
