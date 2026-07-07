import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    // Establish connection to backend server
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Clean up connection
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket && user) {
      if (user.role === 'agent') {
        // Register agent to get live socket communication
        socket.emit('register_agent', { id: user.id, name: user.name });
      }
    }
  }, [socket, user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
