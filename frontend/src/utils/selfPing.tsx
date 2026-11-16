import { useEffect } from 'react';

/**
 * SelfPing keeps the Render free-tier backend instance awake.
 * Render spins down after 15 minutes of inactivity.
 * By pinging the live health endpoint every 9.5 minutes directly,
 * we keep the instance warm so users never face cold-start delays.
 */
const PING_INTERVAL = 9.5 * 60 * 1000; // 9.5 minutes

// In production, pings the live backend health endpoint directly to prevent cold starts
const HEALTH_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/health`
  : (import.meta.env.PROD ? 'https://api.chetanbrassindustries.com/api/health' : 'http://localhost:5000/api/health');

export default function SelfPing() {
  useEffect(() => {
    const ping = async () => {
      try {
        await fetch(HEALTH_URL, {
          method: 'GET',
          cache: 'no-store',
          mode: 'cors',
        });
        console.debug('[SelfPing] Backend keep-alive ping sent to:', HEALTH_URL);
      } catch (err) {
        // Silently ignore ping errors; this is just a background keep-alive
        console.debug('[SelfPing] Ping attempt finished:', err);
      }
    };

    // Immediate ping on mount to wake/warm up the server immediately
    ping();

    // Schedule regular keep-alive ping
    const intervalId = setInterval(ping, PING_INTERVAL);
    return () => clearInterval(intervalId);
  }, []);

  return null;
}

