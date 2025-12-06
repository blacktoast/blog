export function createPartyAnimation(event: MouseEvent): void {
  const clickX = event.clientX;
  const clickY = event.clientY;

  const particleCount = 15;
  const emojis = ['🎉', '🎊', '✨', '🌟', '⭐', '💫', '🎆'];
  const gravity = 800;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const spreadAngle = Math.PI * 0.7;
    const baseAngle = -Math.PI / 2;
    const angle = baseAngle + (Math.random() - 0.5) * spreadAngle;
    const speed = 300 + Math.random() * 200;

    let x = 0;
    let y = 0;
    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    let opacity = 1;
    let rotation = 0;
    const rotationSpeed = (Math.random() - 0.5) * 400;

    particle.style.cssText = `
      position: fixed;
      left: ${clickX}px;
      top: ${clickY}px;
      pointer-events: none;
      z-index: 9999;
      font-size: ${1.2 + Math.random() * 0.5}rem;
      transform: translate(-50%, -50%);
      will-change: transform, opacity;
    `;

    document.body.appendChild(particle);

    const startTime = performance.now();
    const duration = 1000;

    const updatePhysics = () => {
      const elapsed = performance.now() - startTime;
      const dt = 1 / 60;

      if (elapsed > duration) {
        particle.remove();
        return;
      }

      vy += gravity * dt;
      x += vx * dt;
      y += vy * dt;
      rotation += rotationSpeed * dt;

      const progress = elapsed / duration;
      if (progress > 0.7) {
        opacity = 1 - (progress - 0.7) / 0.3;
      }

      particle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rotation}deg)`;
      particle.style.opacity = opacity.toString();

      requestAnimationFrame(updatePhysics);
    };

    requestAnimationFrame(updatePhysics);
  }
}
