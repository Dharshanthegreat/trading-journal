import { useEffect } from 'react';
import gsap from 'gsap';

export default function useMagneticButtons() {
  useEffect(() => {
    // Event delegation on mouseover to capture any hovered button dynamically
    const handleMouseOver = (e) => {
      const button = e.target.closest('.btn, .hero-btn');
      if (!button) return;

      // Skip buttons that we already initialized
      if (button.dataset.magneticInit === 'true') return;
      button.dataset.magneticInit = 'true';

      // Store initial custom styles to restore cleanly
      const originalTransition = button.style.transition;
      const originalTransform = button.style.transform;

      const handleMouseMove = (event) => {
        const rect = button.getBoundingClientRect();
        
        // Calculate coordinate delta relative to the center of the button
        const x = event.clientX - (rect.left + rect.width / 2);
        const y = event.clientY - (rect.top + rect.height / 2);

        // Turn off normal CSS transition styles so GSAP runs smoothly without lag or jitter
        button.style.transition = 'none';

        gsap.to(button, {
          x: x * 0.35, // magnetic pull strength factor
          y: y * 0.35,
          duration: 0.3,
          ease: 'power2.out',
        });
      };

      const handleMouseLeave = () => {
        // Restore CSS rules
        button.style.transition = originalTransition;

        gsap.to(button, {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: 'elastic.out(1.1, 0.4)', // satisfying snap back spring effect
          onComplete: () => {
            // Once returned to original position, restore original inline transform styles
            button.style.transform = originalTransform;
          }
        });
      };

      // Attach interaction listeners to the targeted button
      button.addEventListener('mousemove', handleMouseMove);
      button.addEventListener('mouseleave', handleMouseLeave);

      // Keep references on the DOM node to clean them up later
      button._magneticMove = handleMouseMove;
      button._magneticLeave = handleMouseLeave;
    };

    document.addEventListener('mouseover', handleMouseOver);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      
      // Clean up event listeners for all initialized elements
      const buttons = document.querySelectorAll('.btn, .hero-btn');
      buttons.forEach((button) => {
        if (button.dataset.magneticInit === 'true') {
          button.removeEventListener('mousemove', button._magneticMove);
          button.removeEventListener('mouseleave', button._magneticLeave);
          delete button.dataset.magneticInit;
          delete button._magneticMove;
          delete button._magneticLeave;
          gsap.killTweensOf(button);
        }
      });
    };
  }, []);
}
