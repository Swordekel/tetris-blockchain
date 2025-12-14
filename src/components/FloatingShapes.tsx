export function FloatingShapes() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Floating Gradient Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
      <div className="absolute top-40 right-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-20 left-40 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '4s' }} />
      <div className="absolute bottom-40 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '6s' }} />
      
      {/* Geometric Shapes */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-purple-500/20 rotate-45 animate-spin-slow" />
      <div className="absolute top-3/4 right-1/3 w-24 h-24 border-2 border-pink-500/20 rounded-full animate-pulse" />
      <div className="absolute top-1/2 right-1/4 w-40 h-40 border-2 border-cyan-500/20 rotate-12 animate-spin-slow" style={{ animationDirection: 'reverse' }} />
    </div>
  );
}
