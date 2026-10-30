'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [selectedContact, setSelectedContact] = useState('2348030635560');
  const [topic, setTopic] = useState('General Tailoring Inquiry');
  const [message, setMessage] = useState('');

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedMsg = [
      `*MKTF TAILORING INQUIRY & FEEDBACK*`,
      `--------------------------------`,
      senderName.trim() ? `*Name:* ${senderName.trim()}` : null,
      senderPhone.trim() ? `*Phone:* ${senderPhone.trim()}` : null,
      `*Topic:* ${topic}`,
      ``,
      `*Message:*`,
      message.trim() || 'Hello MKTF Tailoring! I have an inquiry about an outfit.',
      `--------------------------------`,
      `Sent from MKTF Web Portal`,
    ].filter(Boolean).join('\n');

    window.open(`https://wa.me/${selectedContact}?text=${encodeURIComponent(formattedMsg)}`, '_blank');
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 65px)', backgroundColor: '#f8fafc', padding: '40px 20px 80px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            GET IN TOUCH WITH MKTF
          </span>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 10px' }}>
            Contact Us & Customer Support
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Reach out directly to any of our dedicated workshop and customer care phone numbers.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          
          {/* Contact Details & All 3 Phone Lines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ background: '#0b1120', color: '#ffffff', borderRadius: '18px', padding: '28px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                OFFICIAL WORKSHOP CHANNELS
              </span>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: '8px 0 18px' }}>
                Dedicated Contact Lines
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
                
                {/* Line 1 */}
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.74rem', fontWeight: 700 }}>PRIMARY LINE / MASTER ATELIER</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <strong style={{ fontSize: '1.05rem', color: '#fbbf24' }}>0803 063 5560</strong>
                    <a
                      href="https://wa.me/2348030635560"
                      target="_blank"
                      rel="noreferrer"
                      style={{ background: '#16a34a', color: '#ffffff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none' }}
                    >
                      WhatsApp →
                    </a>
                  </div>
                </div>

                {/* Line 2 */}
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.74rem', fontWeight: 700 }}>SUPPORT LINE 2</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <strong style={{ fontSize: '1.05rem', color: '#38bdf8' }}>0911 640 5923</strong>
                    <a
                      href="https://wa.me/2349116405923"
                      target="_blank"
                      rel="noreferrer"
                      style={{ background: '#16a34a', color: '#ffffff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none' }}
                    >
                      WhatsApp →
                    </a>
                  </div>
                </div>

                {/* Line 3 */}
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.74rem', fontWeight: 700 }}>WORKSHOP INQUIRIES LINE 3</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <strong style={{ fontSize: '1.05rem', color: '#a78bfa' }}>0907 096 4922</strong>
                    <a
                      href="https://wa.me/2349070964922"
                      target="_blank"
                      rel="noreferrer"
                      style={{ background: '#16a34a', color: '#ffffff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none' }}
                    >
                      WhatsApp →
                    </a>
                  </div>
                </div>

                <div style={{ marginTop: '6px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.74rem', fontWeight: 700 }}>SETTLEMENT DETAILS</div>
                  <span style={{ color: '#ffffff', fontSize: '0.85rem' }}>OPay • 8030635560 • Abdulrahman Aliyu</span>
                </div>
              </div>
            </div>

            {/* Standard Workshop Policies */}
            <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>
                Workshop Standard Terms
              </h3>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                <li><strong>Turnaround:</strong> Standard crafting takes 3–5 working days from fabric intake.</li>
                <li><strong>Payment:</strong> 50% commitment deposit to start cutting; balance settled at pickup.</li>
                <li><strong>Fitting Guarantee:</strong> Adjustments requested within 48h are done promptly.</li>
              </ul>
            </div>
          </div>

          {/* Interactive Routing Message Form */}
          <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '30px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
              DIRECT MESSAGE DISPATCH
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 8px' }}>
              Send Direct Message
            </h2>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.85rem' }}>
              Select which line you wish to contact and dispatch your message directly to WhatsApp.
            </p>

            <form onSubmit={handleSendFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  SEND TO CONTACT NUMBER *
                </label>
                <select
                  value={selectedContact}
                  onChange={(e) => setSelectedContact(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', background: '#ffffff' }}
                >
                  <option value="2348030635560">Primary Master Line (0803 063 5560)</option>
                  <option value="2349116405923">Support Desk 2 (0911 640 5923)</option>
                  <option value="2349070964922">Workshop Inquiries 3 (0907 096 4922)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  YOUR NAME (Optional)
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Ibrahim Lawal"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  PHONE NUMBER (Optional)
                </label>
                <input
                  type="tel"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="e.g. 0803 123 4567"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  TOPIC / INQUIRY TYPE
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', background: '#ffffff' }}
                >
                  <option value="General Tailoring Inquiry">General Tailoring Inquiry</option>
                  <option value="Custom Fabric Sourcing">Custom Fabric Sourcing</option>
                  <option value="Order Tracking & Completion Question">Order Tracking & Completion Question</option>
                  <option value="Bulk / Wedding Ceremonial Order">Bulk / Wedding Ceremonial Order</option>
                  <option value="Customer Feedback & Review">Customer Feedback & Review</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  MESSAGE OR FEEDBACK *
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what outfit you need or share your feedback on our work..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: '#b45309',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  marginTop: '6px',
                  boxShadow: '0 2px 10px rgba(180, 83, 9, 0.3)',
                }}
              >
                Send via WhatsApp →
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}