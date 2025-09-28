/**
 * Universal Button Refresh System
 * Ensures all generating buttons work properly with refresh functionality
 */

class ButtonRefreshSystem {
    constructor() {
        this.refreshButtons = new Map();
        this.originalHandlers = new Map();
        this.init();
    }

    init() {
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupRefreshSystem());
        } else {
            this.setupRefreshSystem();
        }
    }

    setupRefreshSystem() {
        console.log('Setting up button refresh system...');
        
        // Find all buttons that might need refresh functionality
        const buttonSelectors = [
            'button[onclick]',
            'button[id*="generate"]',
            'button[id*="create"]',
            'button[id*="submit"]',
            'button[id*="process"]',
            'button[id*="refresh"]',
            'button[id*="update"]',
            'button[id*="load"]',
            'button[id*="fetch"]',
            'button[class*="btn"]',
            'input[type="submit"]',
            'input[type="button"]'
        ];

        buttonSelectors.forEach(selector => {
            const buttons = document.querySelectorAll(selector);
            buttons.forEach(button => this.enhanceButton(button));
        });

        // Also watch for dynamically added buttons
        this.observeDynamicButtons();
    }

    enhanceButton(button) {
        if (!button || button.dataset.refreshEnhanced) return;

        // Mark as enhanced
        button.dataset.refreshEnhanced = 'true';

        // Store original onclick handler
        if (button.onclick) {
            this.originalHandlers.set(button, button.onclick);
        }

        // Add refresh functionality
        this.addRefreshFunctionality(button);

        // Add visual feedback
        this.addVisualFeedback(button);
    }

    addRefreshFunctionality(button) {
        const originalOnclick = button.onclick;
        
        button.onclick = (event) => {
            // Prevent double-clicks
            if (button.disabled) {
                event.preventDefault();
                return false;
            }

            // Add loading state
            this.setLoadingState(button, true);

            // Execute original handler
            let result;
            try {
                if (originalOnclick) {
                    result = originalOnclick.call(button, event);
                }
            } catch (error) {
                console.error('Button click error:', error);
                this.showError(button, 'Action failed. Please try again.');
            } finally {
                // Reset loading state after a delay
                setTimeout(() => {
                    this.setLoadingState(button, false);
                }, 1000);
            }

            return result;
        };

        // Add refresh method to button
        button.refresh = () => {
            this.refreshButton(button);
        };
    }

    addVisualFeedback(button) {
        // Add hover effects
        button.addEventListener('mouseenter', () => {
            if (!button.disabled) {
                button.style.transform = 'translateY(-1px)';
                button.style.transition = 'all 0.2s ease';
            }
        });

        button.addEventListener('mouseleave', () => {
            if (!button.disabled) {
                button.style.transform = 'translateY(0)';
            }
        });
    }

    setLoadingState(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent || button.value;
            
            // Add loading spinner
            const spinner = document.createElement('span');
            spinner.className = 'loading-spinner';
            spinner.innerHTML = '⟳';
            spinner.style.marginRight = '8px';
            spinner.style.animation = 'spin 1s linear infinite';
            
            button.insertBefore(spinner, button.firstChild);
            button.textContent = 'Processing...';
            
            // Add CSS for spinner animation
            if (!document.getElementById('button-refresh-styles')) {
                const style = document.createElement('style');
                style.id = 'button-refresh-styles';
                style.textContent = `
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    .loading-spinner {
                        display: inline-block;
                    }
                    button:disabled {
                        opacity: 0.7;
                        cursor: not-allowed;
                    }
                `;
                document.head.appendChild(style);
            }
        } else {
            button.disabled = false;
            const originalText = button.dataset.originalText;
            if (originalText) {
                button.textContent = originalText;
                button.removeAttribute('data-original-text');
            }
            
            // Remove spinner
            const spinner = button.querySelector('.loading-spinner');
            if (spinner) {
                spinner.remove();
            }
        }
    }

    refreshButton(button) {
        console.log('Refreshing button:', button.id || button.className);
        
        // Reset button state
        this.setLoadingState(button, false);
        
        // Re-execute the original handler
        if (button.onclick) {
            try {
                button.onclick();
            } catch (error) {
                console.error('Button refresh error:', error);
            }
        }
    }

    showError(button, message) {
        // Create error tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'button-error-tooltip';
        tooltip.textContent = message;
        tooltip.style.cssText = `
            position: absolute;
            background: #ff4444;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            white-space: nowrap;
        `;

        document.body.appendChild(tooltip);

        // Position tooltip
        const rect = button.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - 40) + 'px';

        // Remove after 3 seconds
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 3000);
    }

    observeDynamicButtons() {
        // Watch for dynamically added buttons
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.tagName === 'BUTTON' || node.tagName === 'INPUT') {
                            this.enhanceButton(node);
                        }
                        
                        // Check for buttons within added nodes
                        const buttons = node.querySelectorAll ? node.querySelectorAll('button, input[type="button"], input[type="submit"]') : [];
                        buttons.forEach(button => this.enhanceButton(button));
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Public methods for manual control
    refreshAllButtons() {
        const buttons = document.querySelectorAll('button[data-refresh-enhanced="true"]');
        buttons.forEach(button => this.refreshButton(button));
    }

    enableButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            this.setLoadingState(button, false);
        }
    }

    disableButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            this.setLoadingState(button, true);
        }
    }
}

// Initialize the system
window.buttonRefreshSystem = new ButtonRefreshSystem();

// Global refresh function
window.refreshAllButtons = () => {
    window.buttonRefreshSystem.refreshAllButtons();
};

// Auto-refresh every 30 seconds for critical buttons
setInterval(() => {
    const criticalButtons = document.querySelectorAll('button[id*="generate"], button[id*="create"], button[id*="submit"]');
    criticalButtons.forEach(button => {
        if (button.disabled && button.dataset.originalText) {
            // Reset stuck buttons
            window.buttonRefreshSystem.setLoadingState(button, false);
        }
    });
}, 30000);

console.log('Button Refresh System initialized');
