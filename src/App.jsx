// App.jsx — Hermes's Path (Upgraded)
// ติดตั้งก่อน: npm install react-leaflet leaflet @supabase/supabase-js d3

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { supabase } from './supabaseClient';
import GodModal from './GodModal';
import 'leaflet/dist/leaflet.css';
import './App.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet default icon
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom gold icon สำหรับ selected marker
const selectedIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:32px;height:32px;border-radius:50%;
    background:linear-gradient(135deg,#D4AF37,#F5E27A);
    border:3px solid #fff;
    box-shadow:0 0 0 3px #D4AF37, 0 4px 12px rgba(0,0,0,0.4);
    display:flex;align-items:center;justify-content:center;
    font-size:14px;transform:translateY(-8px)
  ">⚡</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Component: เลื่อนแผนที่ไปยัง location ที่เลือก
function FlyToLocation({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 9, { duration: 1.5 });
  }, [coords, map]);
  return null;
}

export default function App() {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [relatedGods, setRelatedGods] = useState([]);
  const [selectedGod, setSelectedGod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterRegion, setFilterRegion] = useState('all');
  const [regions, setRegions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // โหลด locations ทั้งหมด
  useEffect(() => {
    async function fetchLocations() {
      const { data } = await supabase.from('locations').select('*');
      if (data) {
        setLocations(data);
        // สร้าง list ของ region ที่ไม่ซ้ำ
        const unique = [...new Set(data.map((l) => l.region).filter(Boolean))];
        setRegions(unique);
      }
    }
    fetchLocations();
  }, []);

  // คลิก marker → ดึงข้อมูลเทพที่เกี่ยวข้อง
  const handleLocationClick = useCallback(async (location) => {
    setSelectedLocation(location);
    setRelatedGods([]);
    setLoading(true);

    const { data } = await supabase
      .from('god_location_relations')
      .select(`
        event_description,
        gods ( id, name_th, name_en, description, domain, symbol, roman_name, image_url )
      `)
      .eq('location_id', location.id);

    if (data) setRelatedGods(data);
    setLoading(false);
  }, []);

  // filter locations ตาม region
  const filteredLocations = filterRegion === 'all'
    ? locations
    : locations.filter((l) => l.region === filterRegion);

  return (
    <div className="app-container">
      {/* ─── Header ─── */}
      <header className="app-header">
        <div className="header-brand">
          <span className="header-icon">⚡</span>
          <span className="header-title">Hermes's Path</span>
          <span className="header-sub">สำรวจตำนานกรีกผ่านแผนที่</span>
        </div>
        <div className="header-controls">
          <select
            className="region-filter"
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
          >
            <option value="all">ทุกภูมิภาค</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'ซ่อน Sidebar' : 'แสดง Sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* ─── Map ─── */}
        <div className="map-wrapper">
          <MapContainer
            key="main-map"
            center={[38.5, 24.0]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            preferCanvas={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Fly to selected */}
            {selectedLocation && (
              <FlyToLocation
                coords={[selectedLocation.latitude, selectedLocation.longitude]}
              />
            )}

            {useMemo(() => filteredLocations.map((loc) => (
              <Marker
                key={loc.id}
                position={[loc.latitude, loc.longitude]}
                icon={selectedLocation?.id === loc.id ? selectedIcon : DefaultIcon}
                eventHandlers={{ click: () => handleLocationClick(loc) }}
              >
                <Popup className="custom-popup">
                  <strong>{loc.name_th}</strong>
                  <br />
                  <small>{loc.name_en}</small>
                </Popup>
              </Marker>
            )), [filteredLocations, selectedLocation])}
          </MapContainer>
        </div>

        {/* ─── Sidebar ─── */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          {!selectedLocation ? (
            /* Welcome Screen */
            <div className="sidebar-welcome">
              <div className="welcome-icon">🗺️</div>
              <h2>เริ่มต้นการเดินทาง</h2>
              <p>คลิกเลือกสถานที่บนแผนที่เพื่อค้นพบเรื่องราวของเทพเจ้ากรีก</p>
              <div className="location-list">
                {filteredLocations.map((loc) => (
                  <button
                    key={loc.id}
                    className="location-chip"
                    onClick={() => handleLocationClick(loc)}
                  >
                    📍 {loc.name_th}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Location Detail */
            <div className="location-detail">
              {/* Back button */}
              <button className="back-btn" onClick={() => setSelectedLocation(null)}>
                ← กลับ
              </button>

              {/* Location Image */}
              {selectedLocation.image_url && (
                <div className="location-image-wrapper">
                  <img
                    src={selectedLocation.image_url}
                    alt={selectedLocation.name_en}
                    className="location-image"
                  />
                </div>
              )}

              {/* Location Header */}
              <div className="location-header">
                <h2>{selectedLocation.name_th}</h2>
                <span className="location-name-en">{selectedLocation.name_en}</span>
                {selectedLocation.region && (
                  <span className="region-badge">{selectedLocation.region}</span>
                )}
              </div>

              {/* Description */}
              <p className="location-description">{selectedLocation.description}</p>

              {/* Modern Connection */}
              {selectedLocation.modern_connection && (
                <div className="modern-connection">
                  <span className="modern-label">🏛️ ปัจจุบัน</span>
                  <p>{selectedLocation.modern_connection}</p>
                </div>
              )}

              <hr className="divider" />

              {/* Gods Section */}
              <h3 className="gods-heading">เทพเจ้าที่เกี่ยวข้อง</h3>

              {loading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <span>กำลังโหลด...</span>
                </div>
              ) : relatedGods.length === 0 ? (
                <p className="empty-state">ยังไม่มีข้อมูลเทพเจ้าในพื้นที่นี้</p>
              ) : (
                <div className="gods-list">
                  {relatedGods.map((item, i) => (
                    <div key={i} className="god-card">
                      {item.gods.image_url && (
                        <img
                          src={item.gods.image_url}
                          alt={item.gods.name_en}
                          className="god-card-image"
                        />
                      )}
                      <div className="god-card-body">
                        <div className="god-card-header">
                          <h4>{item.gods.name_th}</h4>
                          <span className="god-roman">{item.gods.roman_name}</span>
                        </div>
                        <p className="god-card-event">{item.event_description}</p>
                        {item.gods.domain && (
                          <div className="domain-tags">
                            {item.gods.domain.map((d) => (
                              <span key={d} className="domain-tag">{d}</span>
                            ))}
                          </div>
                        )}
                        <button
                          className="view-god-btn"
                          onClick={() => setSelectedGod(item.gods)}
                        >
                          ดูประวัติและแผนผังความสัมพันธ์ →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ─── God Modal ─── */}
      {selectedGod && (
        <GodModal god={selectedGod} onClose={() => setSelectedGod(null)} />
      )}
    </div>
  );
}