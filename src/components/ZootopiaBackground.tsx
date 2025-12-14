import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface FloatingIcon {
  id: number;
  type: 'carrot' | 'fox' | 'rabbit';
  x: number;
  y: number;
  delay: number;
  duration: number;
  size: number;
}

export function ZootopiaBackground() {
  const [icons, setIcons] = useState<FloatingIcon[]>([]);

  useEffect(() => {
    // Generate random floating icons
    const newIcons: FloatingIcon[] = [];
    const types: Array<'carrot' | 'fox' | 'rabbit'> = ['carrot', 'fox', 'rabbit'];
    
    for (let i = 0; i < 15; i++) {
      newIcons.push({
        id: i,
        type: types[Math.floor(Math.random() * types.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 15 + Math.random() * 10,
        size: 20 + Math.random() * 30,
      });
    }
    
    setIcons(newIcons);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {icons.map((icon) => (
        <motion.div
          key={icon.id}
          className="absolute"
          initial={{ 
            x: `${icon.x}%`, 
            y: `${icon.y}%`,
            opacity: 0,
            rotate: 0,
          }}
          animate={{ 
            x: [`${icon.x}%`, `${(icon.x + 20) % 100}%`, `${icon.x}%`],
            y: [`${icon.y}%`, `${(icon.y - 30) % 100}%`, `${icon.y}%`],
            opacity: [0, 0.6, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: icon.duration,
            delay: icon.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            fontSize: icon.size,
          }}
        >
          {icon.type === 'carrot' && <span>🥕</span>}
          {icon.type === 'fox' && <span>🦊</span>}
          {icon.type === 'rabbit' && <span>🐰</span>}
        </motion.div>
      ))}
    </div>
  );
}
