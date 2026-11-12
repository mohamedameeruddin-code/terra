import { useState, useEffect } from 'react';

export const useLiveStream = () => {
  const [liveData, setLiveData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState(null);

  useEffect(() => {
    let eventSource = null;
    let retryTimeout = null;

    const connect = () => {
      eventSource = new EventSource('/api/stream');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.addEventListener('update', (e) => {
        try {
          const payload = JSON.parse(e.data);
          setLiveData(payload);
          setLastHeartbeat(new Date());
          setIsConnected(true);
        } catch (err) {
          console.error('SSE JSON parse error:', err);
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        // Exponential/staggered reconnect attempt in 4 seconds
        retryTimeout = setTimeout(connect, 4000);
      };
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  return { liveData, isConnected, lastHeartbeat };
};

