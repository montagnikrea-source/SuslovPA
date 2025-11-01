// SuslovPA Main Script
document.addEventListener('DOMContentLoaded', function() {
  console.log('SuslovPA application loaded');
  
  // Initialize any global features
  if (window.globalCounter) {
    console.log('Global counter initialized');
  }
  
  // Setup navigation
  const navLinks = document.querySelectorAll('a[href^="/"]');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // Handle navigation
      const href = this.getAttribute('href');
      if (href.startsWith('/')) {
        e.preventDefault();
        window.location.href = href;
      }
    });
  });
});

// Utility functions
function log(message, data = null) {
  if (data) {
    console.log(`[SuslovPA] ${message}`, data);
  } else {
    console.log(`[SuslovPA] ${message}`);
  }
}

// Initialize when page loads
window.addEventListener('load', function() {
  log('Page fully loaded');
});
