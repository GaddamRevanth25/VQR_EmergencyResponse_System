import { useState, useRef, useEffect } from 'react';
import { SectionHeader } from '../ui/SectionHeader';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import pic1 from '../../assets/picture1.jpeg';
import pic2 from '../../assets/picture2.jpeg';
import pic3 from '../../assets/picture3.png';
import pic4 from '../../assets/picture4.jpeg';
import pic5 from '../../assets/picture5.jpeg';

export function Screenshots() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const screenshots = [
    { title: 'User Authentication', image: pic1 },
    { title: 'Emergency Directory', image: pic2 },
    { title: 'Profile & Contacts', image: pic3 },
    { title: 'Automated Crash Alert', image: pic4 },
    { title: 'Vehicle Safety Guide', image: pic5 },
  ];

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -310 : 310;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section id="screenshots" style={{ background: 'var(--bg-main)', overflow: 'hidden' }}>
      <div className="container" style={{ position: 'relative' }}>
        <SectionHeader 
          title="App Previews" 
          subtitle="A clean, intuitive interface designed for rapid interaction during high-stress emergency situations."
        />
        
        {/* Carousel Wrapper with Side-Mounted Controls */}
        <div style={{ position: 'relative', margin: '0 -0.5rem' }}>
          
          {/* Side-Mounted Previous Button */}
          <AnimatePresence>
            {canScrollLeft && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleScroll('left')}
                style={{
                  position: 'absolute',
                  left: '-12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--bg-glass)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-hover)',
                  zIndex: 20,
                  transition: 'background-color 0.2s ease, border-color 0.2s ease',
                }}
                aria-label="Previous Screenshot"
              >
                <ChevronLeft size={22} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Side-Mounted Next Button */}
          <AnimatePresence>
            {canScrollRight && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleScroll('right')}
                style={{
                  position: 'absolute',
                  right: '-12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--bg-glass)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-hover)',
                  zIndex: 20,
                  transition: 'background-color 0.2s ease, border-color 0.2s ease',
                }}
                aria-label="Next Screenshot"
              >
                <ChevronRight size={22} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Horizontal Carousel */}
          <motion.div 
            ref={scrollRef}
            onScroll={checkScroll}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ 
              display: 'flex', 
              gap: '2.5rem', 
              overflowX: 'auto', 
              padding: '1rem 0.5rem 3rem',
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
            }} 
            className="no-scrollbar"
          >
            {screenshots.map((screen, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                viewport={{ once: true, margin: "0px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                style={{
                  minWidth: '270px',
                  width: '270px',
                  height: '550px',
                  background: 'var(--bg-card)',
                  borderRadius: '32px',
                  border: '6px solid var(--border-light)',
                  boxShadow: 'var(--shadow-card)',
                  position: 'relative',
                  flexShrink: 0,
                  scrollSnapAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {/* Camera Speaker Cutout */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '90px',
                  height: '18px',
                  background: 'var(--border-light)',
                  borderBottomLeftRadius: '10px',
                  borderBottomRightRadius: '10px',
                  zIndex: 10,
                }} />
                
                {/* Screen Screenshot Asset */}
                <img 
                  src={screen.image} 
                  alt={screen.title} 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    objectPosition: 'top',
                    borderRadius: '26px',
                  }} 
                />
                
                {/* Theme-Aware Label Badge */}
                <div style={{
                  position: 'absolute',
                  bottom: '14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--bg-glass)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: 'var(--text-main)',
                  padding: '0.45rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  letterSpacing: '0.3px',
                  whiteSpace: 'nowrap',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-card)',
                  zIndex: 10,
                  transition: 'all 0.3s ease',
                }}>
                  {screen.title}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
