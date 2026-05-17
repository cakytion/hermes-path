// GodModal.jsx — แสดงประวัติเทพ + D3 Family Tree
// ต้องติดตั้ง: npm install d3

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { supabase } from './supabaseClient';

export default function GodModal({ god, onClose }) {
  const [tab, setTab] = useState('history');       // 'history' | 'tree'
  const [relations, setRelations] = useState([]);
  const svgRef = useRef(null);

  // ดึงความสัมพันธ์ของเทพองค์นี้
  useEffect(() => {
    async function fetchRelations() {
      // ดึงทั้งสองทิศทาง (ทั้ง god_a และ god_b)
      const { data: asA } = await supabase
        .from('god_relations')
        .select(`
          relation_type,
          god_b:god_b_id ( id, name_th, name_en, domain )
        `)
        .eq('god_a_id', god.id);

      const { data: asB } = await supabase
        .from('god_relations')
        .select(`
          relation_type,
          god_a:god_a_id ( id, name_th, name_en, domain )
        `)
        .eq('god_b_id', god.id);

      // รวมและ normalize
      const combined = [];
      asA?.forEach((r) => combined.push({ ...r.god_b, relation_type: r.relation_type }));
      asB?.forEach((r) => {
        // กลับทิศ relation ถ้าเป็น parent/child
        const flipped =
          r.relation_type === 'parent' ? 'child' :
          r.relation_type === 'child' ? 'parent' :
          r.relation_type;
        combined.push({ ...r.god_a, relation_type: flipped });
      });

      setRelations(combined);
    }
    fetchRelations();
  }, [god.id]);

  // วาด D3 Force Graph เมื่อเปลี่ยน tab หรือ relations เปลี่ยน
  useEffect(() => {
    if (tab !== 'tree' || !svgRef.current || relations.length === 0) return;

    const width = svgRef.current.clientWidth || 500;
    const height = 400;

    // ล้าง SVG เก่า
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Nodes: เทพปัจจุบัน + เทพที่เกี่ยวข้อง
    const nodes = [
      { id: god.id, name: god.name_th, main: true },
      ...relations.map((r) => ({ id: r.id, name: r.name_th, main: false, relation: r.relation_type })),
    ];

    const links = relations.map((r) => ({
      source: god.id,
      target: r.id,
      type: r.relation_type,
    }));

    // Color map ตาม relation_type
    const relationColor = {
      spouse: '#E8A0BF',
      child: '#7EC8E3',
      parent: '#FFD700',
      sibling: '#90EE90',
      enemy: '#FF6B6B',
      ally: '#98FB98',
    };

    // Force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(50));

    // Legend
    const legendData = [...new Set(relations.map((r) => r.relation_type))];
    const legend = svg.append('g').attr('transform', 'translate(16, 16)');
    legendData.forEach((type, i) => {
      legend.append('circle').attr('cx', 7).attr('cy', i * 22 + 7).attr('r', 6)
        .attr('fill', relationColor[type] || '#aaa');
      legend.append('text').attr('x', 18).attr('y', i * 22 + 12)
        .text(type).attr('font-size', 11).attr('fill', '#555');
    });

    // Links (เส้น)
    const link = svg.append('g').selectAll('line')
      .data(links).join('line')
      .attr('stroke', (d) => relationColor[d.type] || '#ccc')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', (d) => d.type === 'enemy' ? '6 3' : null);

    // Link labels
    const linkLabel = svg.append('g').selectAll('text')
      .data(links).join('text')
      .text((d) => d.type)
      .attr('font-size', 10)
      .attr('fill', '#888')
      .attr('text-anchor', 'middle');

    // Nodes (วงกลม)
    const node = svg.append('g').selectAll('g')
      .data(nodes).join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    node.append('circle')
      .attr('r', (d) => d.main ? 36 : 28)
      .attr('fill', (d) => d.main ? '#D4AF37' : '#fff')
      .attr('stroke', (d) => d.main ? '#8B6914' : '#ccc')
      .attr('stroke-width', (d) => d.main ? 3 : 1.5);

    node.append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', (d) => d.main ? 13 : 11)
      .attr('font-weight', (d) => d.main ? 'bold' : 'normal')
      .attr('fill', (d) => d.main ? '#5a3e00' : '#333');

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
      linkLabel
        .attr('x', (d) => (d.source.x + d.target.x) / 2)
        .attr('y', (d) => (d.source.y + d.target.y) / 2 - 6);
      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [tab, relations, god]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {god.name_th}
              {god.roman_name && (
                <span className="modal-roman"> / {god.roman_name}</span>
              )}
            </h2>
            <p className="modal-name-en">{god.name_en}</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab-btn ${tab === 'history' ? 'active' : ''}`}
            onClick={() => setTab('history')}
          >
            📜 ประวัติ
          </button>
          <button
            className={`tab-btn ${tab === 'tree' ? 'active' : ''}`}
            onClick={() => setTab('tree')}
          >
            🕸️ แผนผังความสัมพันธ์
          </button>
        </div>

        {/* Tab Content */}
        <div className="modal-body">
          {tab === 'history' && (
            <div className="history-tab">
              {god.image_url && (
                <img src={god.image_url} alt={god.name_en} className="god-modal-image" />
              )}
              <p className="god-modal-desc">{god.description}</p>

              {god.domain && (
                <div className="modal-section">
                  <h4>⚡ ขอบเขตอำนาจ</h4>
                  <div className="domain-tags">
                    {god.domain.map((d) => (
                      <span key={d} className="domain-tag">{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {god.symbol && (
                <div className="modal-section">
                  <h4>🔱 สัญลักษณ์</h4>
                  <div className="domain-tags">
                    {god.symbol.map((s) => (
                      <span key={s} className="symbol-tag">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {relations.length > 0 && (
                <div className="modal-section">
                  <h4>👥 ความสัมพันธ์</h4>
                  <ul className="relations-list">
                    {relations.map((r, i) => (
                      <li key={i}>
                        <span className={`relation-badge relation-${r.relation_type}`}>
                          {r.relation_type}
                        </span>
                        {r.name_th} ({r.name_en})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === 'tree' && (
            <div className="tree-tab">
              {relations.length === 0 ? (
                <p className="empty-state">ยังไม่มีข้อมูลความสัมพันธ์</p>
              ) : (
                <svg ref={svgRef} style={{ width: '100%', minHeight: 400 }} />
              )}
              <p className="tree-hint">💡 ลาก node ได้ | สีแสดงประเภทความสัมพันธ์</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
