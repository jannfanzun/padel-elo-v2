/**
 * Main JavaScript file for Padel Ranking Website
 */

document.addEventListener('DOMContentLoaded', function() {
    // Auto-close alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    
    alerts.forEach(function(alert) {
      setTimeout(function() {
        const bsAlert = new bootstrap.Alert(alert);
        bsAlert.close();
      }, 5000);
    });
    
    // Add animation to cards
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(function(card, index) {
      card.style.animationDelay = (index * 0.1) + 's';
      card.classList.add('fadeIn');
    });
    
    // Form submission - Disable submit buttons to prevent double submission
    const forms = document.querySelectorAll('form');
    
    forms.forEach(function(form) {
      form.addEventListener('submit', function() {
        const submitButtons = form.querySelectorAll('button[type="submit"]');
        
        submitButtons.forEach(function(button) {
          // Skip buttons with data-no-disable attribute
          if (button.dataset.noDisable) return;
          
          // Store original text
          if (!button.dataset.originalText) {
            button.dataset.originalText = button.innerHTML;
          }
          
          // Disable and show loading state
          button.disabled = true;
          button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Lädt...';
        });
      });
    });
    
    // Tooltips initialization
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  });