import { useState, useEffect } from 'react';
import { socketService } from '@/lib/socket';
import { Wifi, WifiOff } from 'lucide-react';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(socketService.isConnected());

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);

    // Check initial state
    setIsConnected(socketService.isConnected());

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
    };
  }, []);

  if (!isConnected) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-green-500">
      <Wifi className="w-3 h-3" />
      <span className="hidden sm:inline">Live</span>
    </div>
  );
}

