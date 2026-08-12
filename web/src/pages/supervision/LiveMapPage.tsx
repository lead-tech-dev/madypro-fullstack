import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuthContext } from '../../context/AuthContext';
import { getLiveMap } from '../../services/api/attendance.api';
import { LiveMapEntry } from '../../types/attendance';
import { env } from '../../config/env';

export const LiveMapPage: React.FC = () => {
  const { token, notify } = useAuthContext();
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [entries, setEntries] = useState<LiveMapEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    mapboxgl.accessToken = env.mapboxToken;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [2.3522, 48.8566],
      zoom: 10,
    });
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const fetchLiveMap = () => {
    if (!token) return;
    setLoading(true);
    getLiveMap(token)
      .then(setEntries)
      .catch((err) => notify(err instanceof Error ? err.message : 'Impossible de charger la carte', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLiveMap();
    const id = setInterval(fetchLiveMap, 30000);
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    const withCoords = entries.filter((e) => e.latitude != null && e.longitude != null);
    withCoords.forEach((entry) => {
      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.background = '#2764ff';
      el.style.border = '2px solid #fff';
      el.style.boxShadow = '0 0 0 2px rgba(39,100,255,0.35)';
      const popup = new mapboxgl.Popup({ offset: 16 }).setHTML(
        `<strong>${entry.agentName}</strong><br/>${entry.siteName}<br/><small>${new Date(entry.lastSeenAt).toLocaleTimeString('fr-FR')}</small>`,
      );
      const marker = new mapboxgl.Marker(el)
        .setLngLat([entry.longitude as number, entry.latitude as number])
        .setPopup(popup)
        .addTo(map.current as mapboxgl.Map);
      markers.current.push(marker);
    });
    if (withCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      withCoords.forEach((entry) => bounds.extend([entry.longitude as number, entry.latitude as number]));
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 500 });
    }
  }, [entries]);

  return (
    <div className="page">
      <div className="page-header">
        <span className="pill">Supervision</span>
        <h2>Carte temps réel</h2>
        <p>Position des agents actuellement en mission (rafraîchi toutes les 30 secondes).</p>
      </div>
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div ref={mapContainer} style={{ width: '100%', height: '520px' }} />
      </div>
      <div className="panel" style={{ marginTop: '1rem' }}>
        <h3>Agents en mission {loading ? '…' : `(${entries.length})`}</h3>
        <ul className="list-line">
          {entries.map((entry) => (
            <li key={entry.userId}>
              <span>{entry.agentName}</span>
              <span>{entry.siteName}</span>
              <span className="card__meta">{new Date(entry.lastSeenAt).toLocaleTimeString('fr-FR')}</span>
            </li>
          ))}
          {entries.length === 0 && !loading && (
            <li>
              <span>Aucun agent en mission actuellement.</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};
