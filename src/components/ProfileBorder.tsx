import nickBorder from 'figma:asset/e530821da8a1eb636f54cc61be69d3821588e01c.png';
import judyBorder from 'figma:asset/61ae9b6237566f56e2192a2e864ba7036e9290b8.png';
import steampunkBorder from 'figma:asset/0fb0a9153307f4a65c9edf1f3e75a7f14da843de.png';

interface ProfileBorderProps {
  borderId: string;
  size?: number;
  children: React.ReactNode;
}

const borderImages: Record<string, string> = {
  zootopia_nick: nickBorder,
  zootopia_judy: judyBorder,
  zootopia_steampunk: steampunkBorder,
};

// Border configuration for each Zootopia border
interface BorderConfig {
  contentOffset: { top: number; left: number; right: number; bottom: number };
  frameScale?: number; // Scale the border frame image (1.0 = 100%)
  frameOffset?: { x: number; y: number }; // Offset as percentage (0.0 to 1.0)
}

const borderConfigs: Record<string, BorderConfig> = {
  zootopia_nick: { 
    contentOffset: { top: 0.18, left: 0.18, right: 0.18, bottom: 0.18 },
    frameScale: 1.0,
    frameOffset: { x: 0, y: 0 }
  },
  zootopia_judy: { 
    contentOffset: { top: 0.18, left: 0.18, right: 0.18, bottom: 0.18 },
    frameScale: 1.3,
    frameOffset: { x: 0, y: -0.14 } // 14% ke atas dari ukuran total
  },
  zootopia_steampunk: { 
    contentOffset: { top: 0.15, left: 0.15, right: 0.15, bottom: 0.15 },
    frameScale: 1.05,
    frameOffset: { x: 0, y: -0.04 } // Turun sedikit lagi dari -0.06 ke -0.04
  },
};

// Border styles for regular borders
const borderStyles: Record<string, string> = {
  default: 'border-4 border-gray-500',
  bronze: 'border-4 border-orange-700',
  silver: 'border-4 border-gray-300',
  gold: 'border-4 border-yellow-500',
  diamond: 'border-4 border-cyan-400',
  fire: 'border-4 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]',
  // DAILY BORDERS
  daily_champion: 'border-[6px] border-double border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.8)]',
  daily_master: 'border-[6px] border-double border-orange-400 shadow-[0_0_25px_rgba(251,146,60,0.7)]',
  daily_elite: 'border-[6px] border-double border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.6)]',
  // WEEKLY BORDERS
  weekly_champion: 'border-[6px] border-double border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.8)]',
  weekly_master: 'border-[6px] border-double border-blue-400 shadow-[0_0_25px_rgba(96,165,250,0.7)]',
  weekly_elite: 'border-[6px] border-double border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)]',
  // SEASON BORDERS
  season_champion: 'border-[8px] border-double border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.9)]',
  season_master: 'border-[8px] border-double border-cyan-500 shadow-[0_0_35px_rgba(34,211,238,0.8)]',
  season_elite: 'border-[8px] border-double border-pink-500 shadow-[0_0_30px_rgba(244,63,94,0.7)]',
};

export function ProfileBorder({ borderId, size = 128, children }: ProfileBorderProps) {
  const borderImage = borderImages[borderId];
  
  // Debug log
  console.log('ProfileBorder - borderId:', borderId, 'has image:', !!borderImage, 'image src:', borderImage);

  // If it's a Zootopia border with a frame image
  if (borderImage) {
    const config = borderConfigs[borderId] || { contentOffset: { top: 0.18, left: 0.18, right: 0.18, bottom: 0.18 } };
    return (
      <div 
        className="relative inline-block"
        style={{ 
          width: size,
          height: size,
        }}
      >
        {/* Profile Content - positioned in the center, below border */}
        <div 
          className="absolute flex items-center justify-center"
          style={{
            top: size * config.contentOffset.top,
            left: size * config.contentOffset.left,
            right: size * config.contentOffset.right,
            bottom: size * config.contentOffset.bottom,
          }}
        >
          {children}
        </div>
        
        {/* Border Image as Frame - on top with high z-index */}
        <img 
          src={borderImage}
          alt={`${borderId} border`}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(255,215,0,0.6))',
            zIndex: 20,
            transform: `scale(${config.frameScale || 1.0})`,
            transformOrigin: 'center',
            left: config.frameOffset?.x || 0,
            top: config.frameOffset?.y ? size * config.frameOffset.y : 0,
          }}
          onLoad={() => console.log(`✅ Border image loaded: ${borderId}`)}
          onError={(e) => {
            console.error(`❌ Border image failed to load: ${borderId}`, e);
            // Show red border as fallback
            (e.target as HTMLImageElement).style.border = '4px solid red';
          }}
        />
        
        {/* Debug indicator */}
        <div 
          className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-green-500 z-50"
          title={`Zootopia border: ${borderId}`}
        />
      </div>
    );
  }

  // For regular borders, apply border style to the children
  const borderStyle = borderStyles[borderId] || borderStyles.default;
  
  return (
    <div 
      className={`rounded-full ${borderStyle}`}
      style={{ 
        width: size,
        height: size,
      }}
    >
      {children}
    </div>
  );
}