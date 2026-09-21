
import { SectionHeader } from '../ui/SectionHeader';
import { Shield, Zap, Heart } from 'lucide-react';
import { motion } from 'motion/react';

export function About() {

  const cards = [
    {
      icon: Shield,
      title: 'The Problem',
      desc: 'In critical emergencies, seconds matter. Traditional reporting relies on phone calls, often leading to delayed response times and inaccurate location data.',
    },
    {
      icon: Zap,
      title: 'Our Solution',
      desc: 'VQR bridges the gap by providing automatic crash detection and one-tap SOS features, instantly transmitting exact coordinates to authorities.',
    },
    {
      icon: Heart,
      title: 'Who It Is For',
      desc: 'Designed for everyday drivers prioritizing safety, and emergency responders needing rapid access to vital incident information.',
    },
  ];

  return (
    <section id="about" style={{ background: 'var(--bg-main)' }}>
      <div className="container">
        <SectionHeader 
          title="What is VQR?" 
          subtitle="Vehicle Quick Response (VQR) is a comprehensive safety ecosystem built to reduce emergency response times and save lives."
        />
        
        <div className="grid grid-cols-3">
          {cards.map((card, i) => (
            <motion.div 
              key={i} 
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
              style={{
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: 'rgba(220, 38, 38, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--color-primary-light)'
              }}>
                <card.icon size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{card.title}</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
