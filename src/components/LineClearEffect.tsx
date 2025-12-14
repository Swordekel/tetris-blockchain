import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  shape: 'circle' | 'square' | 'diamond' | 'star' | 'snowflake' | 'flame';
}

interface LineClearEffectProps {
  skin: string;
  lineY: number; // Y position of the cleared line (0-19)
  canvasWidth: number;
  canvasHeight: number;
  blockSize?: number;
  onComplete: () => void;
}

// Skin-specific effect configurations
const effectConfigs: Record<string, {
  colors: string[];
  particleCount: number;
  shape: Particle['shape'][];
  glowColor?: string;
  specialEffect?: string;
}> = {
  default: {
    colors: ['#00F0F0', '#F0F000', '#A000F0', '#F0A000'],
    particleCount: 40,
    shape: ['square'],
  },
  neon: {
    colors: ['#00FFFF', '#FFFF00', '#FF00FF', '#FF8800'],
    particleCount: 60,
    shape: ['circle', 'square'],
    glowColor: '#00FFFF',
    specialEffect: 'neon-glow',
  },
  candy: {
    colors: ['#FFB6C1', '#FFE4B5', '#E0BBE4', '#FFA07A'],
    particleCount: 50,
    shape: ['circle'],
    glowColor: '#FFB6C1',
  },
  galaxy: {
    colors: ['#4B0082', '#8A2BE2', '#9370DB', '#BA55D3', '#FFF'],
    particleCount: 70,
    shape: ['star', 'circle'],
    glowColor: '#8A2BE2',
    specialEffect: 'galaxy',
  },
  rainbow: {
    colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'],
    particleCount: 65,
    shape: ['circle', 'square', 'diamond'],
    glowColor: '#FF00FF',
    specialEffect: 'rainbow',
  },
  gold: {
    colors: ['#FFD700', '#FFA500', '#FF8C00', '#DAA520', '#FFFF00'],
    particleCount: 60,
    shape: ['diamond', 'star'],
    glowColor: '#FFD700',
    specialEffect: 'sparkle',
  },
  zootopia: {
    colors: ['#E76F51', '#F4A261', '#E9C46A', '#2A9D8F', '#8D5B4C', '#D4A373'],
    particleCount: 50,
    shape: ['circle', 'square'],
    glowColor: '#F4A261',
    specialEffect: 'zootopia',
  },
  crystal: {
    colors: ['#E0F7FA', '#80DEEA', '#4DD0E1', '#00BCD4', '#FFFFFF'],
    particleCount: 65,
    shape: ['diamond', 'star'],
    glowColor: '#80DEEA',
    specialEffect: 'crystal',
  },
  fire: {
    colors: ['#FF5722', '#FF7043', '#FF8A65', '#FFAB91', '#FFD54F', '#FFF'],
    particleCount: 80,
    shape: ['flame', 'circle'],
    glowColor: '#FF5722',
    specialEffect: 'fire',
  },
  ocean: {
    colors: ['#006064', '#00838F', '#0097A7', '#00ACC1', '#4DD0E1'],
    particleCount: 60,
    shape: ['circle', 'diamond'],
    glowColor: '#00BCD4',
    specialEffect: 'water',
  },
  sunset: {
    colors: ['#FF6F00', '#FF8F00', '#FFA000', '#FFB300', '#FFC107'],
    particleCount: 65,
    shape: ['circle', 'flame'],
    glowColor: '#FF8F00',
  },
  aurora: {
    colors: ['#1A237E', '#4A148C', '#6A1B9A', '#9C27B0', '#00BCD4', '#4DD0E1'],
    particleCount: 70,
    shape: ['circle', 'star'],
    glowColor: '#9C27B0',
    specialEffect: 'aurora',
  },
  cosmic: {
    colors: ['#000000', '#1E3A8A', '#4338CA', '#7C3AED', '#FFF'],
    particleCount: 75,
    shape: ['star', 'circle'],
    glowColor: '#7C3AED',
    specialEffect: 'cosmic',
  },
};

export function LineClearEffect({ skin, lineY, canvasWidth, canvasHeight, blockSize, onComplete }: LineClearEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const config = effectConfigs[skin] || effectConfigs.default;

  useEffect(() => {
    console.log('🎨 LineClearEffect mounted - Skin:', skin, 'LineY:', lineY, 'BlockSize:', blockSize);
    
    // Calculate the actual Y position on canvas
    const actualY = lineY * (blockSize || 20) + (blockSize || 20) / 2;

    // Generate particles along the cleared line
    const newParticles: Particle[] = [];
    for (let i = 0; i < config.particleCount; i++) {
      const x = (i / config.particleCount) * canvasWidth;
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6; // Increased speed
      
      newParticles.push({
        id: i,
        x,
        y: actualY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3, // More upward bias
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        size: 8 + Math.random() * 16, // Much larger particles (was 4-12, now 8-24)
        rotation: Math.random() * 360,
        shape: config.shape[Math.floor(Math.random() * config.shape.length)],
      });
    }

    console.log('💥 Generated', newParticles.length, 'particles for', skin, 'skin');
    
    setParticles(newParticles);

    // Complete after animation (longer duration)
    const timeout = setTimeout(() => {
      console.log('✅ LineClearEffect complete for lineY:', lineY);
      onComplete();
    }, 1500);
    
    return () => clearTimeout(timeout);
  }, [lineY, canvasWidth, config, onComplete, blockSize, skin]);

  return (
    <div 
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      {/* Horizontal flash line */}
      <motion.div
        initial={{ opacity: 1, scaleX: 0 }}
        animate={{ opacity: 0, scaleX: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute left-0 right-0"
        style={{
          top: lineY * (blockSize || 20) - 5,
          height: (blockSize || 20) + 10,
          background: `linear-gradient(90deg, transparent, ${config.glowColor || '#FFF'}, transparent)`,
          boxShadow: config.glowColor ? `0 0 40px 10px ${config.glowColor}, 0 0 80px 20px ${config.glowColor}` : 'none',
        }}
      />

      {/* Full screen flash */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${config.glowColor || '#FFF'}30 0%, transparent 60%)`,
        }}
      />

      {/* Particles */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              x: particle.x,
              y: particle.y,
              opacity: 1,
              scale: 1,
              rotate: particle.rotation,
            }}
            animate={{
              x: particle.x + particle.vx * 100,
              y: particle.y + particle.vy * 100,
              opacity: 0,
              scale: 0,
              rotate: particle.rotation + 360,
            }}
            transition={{
              duration: 0.8,
              ease: 'easeOut',
            }}
            className="absolute"
            style={{
              width: particle.size,
              height: particle.size,
            }}
          >
            <ParticleShape 
              shape={particle.shape} 
              color={particle.color}
              glowColor={config.glowColor}
              specialEffect={config.specialEffect}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Special effects overlay */}
      {config.specialEffect === 'fire' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.5 }}
          className="absolute left-0 right-0"
          style={{
            top: lineY * (blockSize || 20) - 20,
            height: 40,
            background: 'linear-gradient(180deg, rgba(255,87,34,0) 0%, rgba(255,87,34,0.6) 50%, rgba(255,87,34,0) 100%)',
            filter: 'blur(10px)',
          }}
        />
      )}

      {config.specialEffect === 'water' && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ 
            opacity: [0, 0.5, 0],
            scaleY: [0, 1, 0],
          }}
          transition={{ duration: 0.6 }}
          className="absolute left-0 right-0"
          style={{
            top: lineY * (blockSize || 20),
            height: blockSize || 20,
            background: 'linear-gradient(90deg, transparent, rgba(0,188,212,0.5), transparent)',
            filter: 'blur(8px)',
          }}
        />
      )}

      {config.specialEffect === 'neon-glow' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.4 }}
          className="absolute left-0 right-0"
          style={{
            top: lineY * (blockSize || 20) - 10,
            height: (blockSize || 20) + 20,
            background: `radial-gradient(ellipse at center, ${config.glowColor}40 0%, transparent 70%)`,
            filter: 'blur(15px)',
          }}
        />
      )}

      {config.specialEffect === 'sparkle' && (
        <>
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                rotate: [0, 180, 360],
              }}
              transition={{ 
                duration: 0.6,
                delay: i * 0.05,
              }}
              className="absolute"
              style={{
                left: (i / 10) * canvasWidth,
                top: lineY * (blockSize || 20),
                width: 8,
                height: 8,
              }}
            >
              <div 
                className="w-full h-full"
                style={{
                  background: '#FFD700',
                  clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                  filter: 'drop-shadow(0 0 4px #FFD700)',
                }}
              />
            </motion.div>
          ))}
        </>
      )}

      {config.specialEffect === 'crystal' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: [0, 0.8, 0],
            scale: [0.5, 1.5, 0.5],
          }}
          transition={{ duration: 0.5 }}
          className="absolute left-0 right-0"
          style={{
            top: lineY * (blockSize || 20) - 15,
            height: (blockSize || 20) + 30,
            background: `linear-gradient(90deg, transparent, ${config.glowColor}60, transparent)`,
            filter: 'blur(5px)',
            boxShadow: `0 0 30px ${config.glowColor}`,
          }}
        />
      )}

      {config.specialEffect === 'zootopia' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.5 }}
          className="absolute left-0 right-0"
          style={{
            top: lineY * (blockSize || 20) - 15,
            height: (blockSize || 20) + 30,
            background: `linear-gradient(90deg, transparent, ${config.glowColor}60, transparent)`,
            filter: 'blur(5px)',
            boxShadow: `0 0 30px ${config.glowColor}`,
          }}
        />
      )}
    </div>
  );
}

function ParticleShape({ 
  shape, 
  color, 
  glowColor,
  specialEffect,
}: { 
  shape: Particle['shape']; 
  color: string;
  glowColor?: string;
  specialEffect?: string;
}) {
  const baseStyle = {
    width: '100%',
    height: '100%',
    backgroundColor: color,
    boxShadow: glowColor ? `0 0 8px ${glowColor}` : 'none',
  };

  switch (shape) {
    case 'circle':
      return (
        <div
          style={{
            ...baseStyle,
            borderRadius: '50%',
          }}
        />
      );
    
    case 'square':
      return (
        <div
          style={{
            ...baseStyle,
            borderRadius: '2px',
          }}
        />
      );
    
    case 'diamond':
      return (
        <div
          style={{
            ...baseStyle,
            transform: 'rotate(45deg)',
            borderRadius: '2px',
          }}
        />
      );
    
    case 'star':
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: 'transparent',
            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            filter: glowColor ? `drop-shadow(0 0 4px ${glowColor})` : 'none',
          }}
        >
          <div style={{ width: '100%', height: '100%', backgroundColor: color }} />
        </div>
      );
    
    case 'snowflake':
      return (
        <div className="relative w-full h-full">
          <div 
            style={{ 
              position: 'absolute',
              width: '100%',
              height: '2px',
              backgroundColor: color,
              top: '50%',
              left: 0,
              transform: 'translateY(-50%)',
              boxShadow: glowColor ? `0 0 4px ${glowColor}` : 'none',
            }} 
          />
          <div 
            style={{ 
              position: 'absolute',
              width: '2px',
              height: '100%',
              backgroundColor: color,
              left: '50%',
              top: 0,
              transform: 'translateX(-50%)',
              boxShadow: glowColor ? `0 0 4px ${glowColor}` : 'none',
            }} 
          />
          <div 
            style={{ 
              position: 'absolute',
              width: '100%',
              height: '2px',
              backgroundColor: color,
              top: '50%',
              left: 0,
              transform: 'translateY(-50%) rotate(45deg)',
              boxShadow: glowColor ? `0 0 4px ${glowColor}` : 'none',
            }} 
          />
          <div 
            style={{ 
              position: 'absolute',
              width: '100%',
              height: '2px',
              backgroundColor: color,
              top: '50%',
              left: 0,
              transform: 'translateY(-50%) rotate(-45deg)',
              boxShadow: glowColor ? `0 0 4px ${glowColor}` : 'none',
            }} 
          />
        </div>
      );
    
    case 'flame':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: `radial-gradient(ellipse at bottom, ${color} 0%, transparent 70%)`,
            filter: `blur(2px) ${glowColor ? `drop-shadow(0 0 6px ${glowColor})` : ''}`,
            borderRadius: '50% 50% 50% 50% / 30% 30% 70% 70%',
          }}
        />
      );
    
    default:
      return <div style={baseStyle} />;
  }
}