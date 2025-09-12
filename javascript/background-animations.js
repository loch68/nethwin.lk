/**
 * Background Animation System
 * Creates animated background elements for modern UI
 */

class BackgroundAnimations {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      // Default configuration
      shapes: 20,
      rays: 12,
      orbs: 8,
      sparkles: 18,
      intensity: 'normal', // 'subtle', 'normal', 'intense'
      ...options
    };
    
    if (!this.container) {
      console.warn(`Background container with ID '${containerId}' not found`);
      return;
    }
    
    this.init();
  }
  
  init() {
    this.createGeometricShapes();
    this.createLightRays();
    this.createFloatingOrbs();
    this.createSparkles();
  }
  
  getIntensitySettings() {
    const settings = {
      subtle: {
        shapeOpacity: [0.03, 0.06],
        rayOpacity: [0.05, 0.15],
        orbOpacity: [0.02, 0.08],
        sparkleOpacity: [0.1, 0.3],
        blur: 0.5
      },
      normal: {
        shapeOpacity: [0.08, 0.12],
        rayOpacity: [0.1, 0.35],
        orbOpacity: [0.05, 0.2],
        sparkleOpacity: [0.2, 0.8],
        blur: 0.2
      },
      intense: {
        shapeOpacity: [0.15, 0.25],
        rayOpacity: [0.2, 0.5],
        orbOpacity: [0.1, 0.3],
        sparkleOpacity: [0.4, 1.0],
        blur: 0.1
      }
    };
    
    return settings[this.options.intensity] || settings.normal;
  }
  
  createGeometricShapes() {
    const intensity = this.getIntensitySettings();
    
    for (let i = 0; i < this.options.shapes; i++) {
      const shape = document.createElement('div');
      shape.className = 'geometric-shape';
      const shapeTypes = ['circle', 'square', 'triangle', 'hexagon'];
      const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
      const size = Math.random() * 50 + 25;
      
      let shapeCSS = '';
      switch(shapeType) {
        case 'circle':
          shapeCSS = 'border-radius: 50%;';
          break;
        case 'square':
          shapeCSS = 'border-radius: 10px; transform: rotate(45deg);';
          break;
        case 'triangle':
          shapeCSS = 'clip-path: polygon(50% 0%, 0% 100%, 100% 100%);';
          break;
        case 'hexagon':
          shapeCSS = 'clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);';
          break;
      }
      
      const opacity1 = Math.random() * (intensity.shapeOpacity[1] - intensity.shapeOpacity[0]) + intensity.shapeOpacity[0];
      const opacity2 = Math.random() * (intensity.shapeOpacity[1] - intensity.shapeOpacity[0]) + intensity.shapeOpacity[0];
      const opacity3 = Math.random() * (intensity.shapeOpacity[1] - intensity.shapeOpacity[0]) + intensity.shapeOpacity[0];
      
      shape.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(${Math.random() * 360}deg, rgba(10, 209, 103, ${opacity1}), rgba(25, 230, 25, ${opacity2}), rgba(76, 175, 80, ${opacity3}));
        ${shapeCSS}
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: geometricFloat ${Math.random() * 30 + 20}s infinite ease-in-out;
        animation-delay: ${Math.random() * 15}s;
        border: 1px solid rgba(255, 255, 255, 0.15);
        filter: blur(${intensity.blur}px);
        pointer-events: none;
      `;
      this.container.appendChild(shape);
    }
  }
  
  createLightRays() {
    const intensity = this.getIntensitySettings();
    
    for (let i = 0; i < this.options.rays; i++) {
      const ray = document.createElement('div');
      ray.className = 'light-ray';
      const rayWidth = Math.random() * 3 + 1;
      
      const opacity1 = Math.random() * (intensity.rayOpacity[1] - intensity.rayOpacity[0]) + intensity.rayOpacity[0];
      const opacity2 = Math.random() * (intensity.rayOpacity[1] - intensity.rayOpacity[0]) + intensity.rayOpacity[0];
      
      ray.style.cssText = `
        position: absolute;
        width: ${rayWidth}px;
        height: ${Math.random() * 250 + 120}px;
        background: linear-gradient(to bottom, 
          transparent, 
          rgba(10, 209, 103, ${opacity1}), 
          rgba(25, 230, 25, ${opacity2}), 
          transparent);
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        transform: rotate(${Math.random() * 360}deg);
        animation: rayPulse ${Math.random() * 12 + 8}s infinite ease-in-out;
        animation-delay: ${Math.random() * 8}s;
        border-radius: ${rayWidth}px;
        filter: blur(${intensity.blur}px);
        pointer-events: none;
      `;
      this.container.appendChild(ray);
    }
  }
  
  createFloatingOrbs() {
    const intensity = this.getIntensitySettings();
    
    for (let i = 0; i < this.options.orbs; i++) {
      const orb = document.createElement('div');
      orb.className = 'floating-orb';
      const orbSize = Math.random() * 70 + 35;
      
      const opacity1 = Math.random() * (intensity.orbOpacity[1] - intensity.orbOpacity[0]) + intensity.orbOpacity[0];
      const opacity2 = Math.random() * (intensity.orbOpacity[1] - intensity.orbOpacity[0]) + intensity.orbOpacity[0];
      const opacity3 = Math.random() * (intensity.orbOpacity[1] - intensity.orbOpacity[0]) + intensity.orbOpacity[0];
      
      orb.style.cssText = `
        position: absolute;
        width: ${orbSize}px;
        height: ${orbSize}px;
        background: radial-gradient(circle at 30% 30%, 
          rgba(255, 255, 255, ${opacity1}), 
          rgba(10, 209, 103, ${opacity2}), 
          rgba(25, 230, 25, ${opacity3}));
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: orbFloat ${Math.random() * 35 + 25}s infinite ease-in-out;
        animation-delay: ${Math.random() * 12}s;
        filter: blur(${intensity.blur * 3}px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        pointer-events: none;
      `;
      this.container.appendChild(orb);
    }
  }
  
  createSparkles() {
    const intensity = this.getIntensitySettings();
    
    for (let i = 0; i < this.options.sparkles; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'sparkle';
      
      const opacity = Math.random() * (intensity.sparkleOpacity[1] - intensity.sparkleOpacity[0]) + intensity.sparkleOpacity[0];
      
      sparkle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: rgba(255, 255, 255, ${opacity});
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: sparkleAnimation ${Math.random() * 3 + 2}s infinite ease-in-out;
        animation-delay: ${Math.random() * 3}s;
        clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
        pointer-events: none;
      `;
      this.container.appendChild(sparkle);
    }
  }
  
  // Method to destroy all animations (useful for cleanup)
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
  
  // Method to update intensity
  updateIntensity(newIntensity) {
    this.options.intensity = newIntensity;
    this.destroy();
    this.init();
  }
}

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
  // Check for default container
  if (document.getElementById('particlesContainer')) {
    window.backgroundAnimations = new BackgroundAnimations('particlesContainer');
  }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackgroundAnimations;
}
