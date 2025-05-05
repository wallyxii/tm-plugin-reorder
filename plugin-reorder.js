// TypingMind Plugin Reorder Extension
// Adds reordering capability to the Plugins page

(function() {
  // Configuration
  const config = {
    debug: false,
    pollInterval: 1000, // Check for plugins list every second
  };
  
  // Logging helper
  const log = (...args) => {
    if (config.debug) console.log('[Plugin Reorder]', ...args);
  };

  // Main functionality
  function initPluginReorder() {
    log('Initializing Plugin Reorder extension');
    
    // Check if we're on the plugins page
    const isPluginsPage = () => {
      return window.location.hash === '#plugins' || 
             document.querySelector('h1')?.textContent === 'Plugins';
    };
    
    // Create reorder button
    function createReorderButton() {
      // Check if button already exists
      if (document.querySelector('#plugin-reorder-btn')) return;
      
      log('Creating reorder button');
      
      // Find the plugins header area (similar to models page)
      const pluginsHeader = document.querySelector('.plugins-header') || 
                           document.querySelector('h1')?.parentElement;
      
      if (!pluginsHeader) {
        log('Could not find plugins header');
        return;
      }
      
      // Create button similar to the models page reorder button
      const reorderBtn = document.createElement('button');
      reorderBtn.id = 'plugin-reorder-btn';
      reorderBtn.className = 'btn btn-sm btn-outline-secondary ms-2';
      reorderBtn.innerHTML = '<i class="bi bi-arrow-down-up me-1"></i> Reorder';
      reorderBtn.onclick = startReorderMode;
      
      // Add button to header
      pluginsHeader.appendChild(reorderBtn);
      log('Reorder button added');
    }
    
    // Start reorder mode
    function startReorderMode() {
      log('Starting reorder mode');
      
      // Find the plugins container
      const pluginsContainer = document.querySelector('.installed-plugins-container') || 
                              document.querySelector('.plugins-list');
      
      if (!pluginsContainer) {
        log('Could not find plugins container');
        return;
      }
      
      // Get all plugin items
      const pluginItems = Array.from(pluginsContainer.children);
      if (pluginItems.length <= 1) {
        alert('You need at least two plugins to reorder them.');
        return;
      }
      
      // Add drag handles and make plugins draggable
      pluginItems.forEach((item, index) => {
        // Add drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'plugin-drag-handle';
        dragHandle.innerHTML = '<i class="bi bi-grip-vertical"></i>';
        dragHandle.style.cursor = 'grab';
        dragHandle.style.marginRight = '8px';
        dragHandle.style.color = '#888';
        
        // Add index for original order
        item.dataset.originalIndex = index;
        
        // Make entire item draggable
        item.draggable = true;
        item.style.cursor = 'move';
        
        // Add visual indicator that we're in reorder mode
        item.classList.add('reorder-mode');
        
        // Prepend drag handle
        item.prepend(dragHandle);
      });
      
      // Add drag event listeners
      pluginsContainer.addEventListener('dragstart', handleDragStart);
      pluginsContainer.addEventListener('dragover', handleDragOver);
      pluginsContainer.addEventListener('drop', handleDrop);
      
      // Replace reorder button with done button
      const reorderBtn = document.querySelector('#plugin-reorder-btn');
      reorderBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Done';
      reorderBtn.onclick = endReorderMode;
      
      // Add styles for drag and drop
      addReorderStyles();
    }
    
    // Handle drag start
    function handleDragStart(e) {
      // Set the dragged item data
      e.dataTransfer.setData('text/plain', e.target.dataset.originalIndex);
      // Add dragging class
      e.target.classList.add('dragging');
    }
    
    // Handle drag over
    function handleDragOver(e) {
      e.preventDefault();
      const draggingItem = document.querySelector('.dragging');
      if (!draggingItem) return;
      
      const container = e.currentTarget;
      const items = Array.from(container.children);
      
      // Find the item we're dragging over
      const afterElement = getDragAfterElement(container, e.clientY);
      
      if (afterElement) {
        container.insertBefore(draggingItem, afterElement);
      } else {
        container.appendChild(draggingItem);
      }
    }
    
    // Helper to find the element to insert after
    function getDragAfterElement(container, y) {
      const draggableElements = Array.from(
        container.querySelectorAll('.reorder-mode:not(.dragging)')
      );
      
      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    // Handle drop
    function handleDrop(e) {
      e.preventDefault();
      const draggedItemIndex = e.dataTransfer.getData('text/plain');
      const items = Array.from(e.currentTarget.children);
      
      // Remove dragging class
      items.forEach(item => item.classList.remove('dragging'));
      
      // Save the new order (to local storage or API)
      savePluginOrder(items);
    }
    
    // Save the new plugin order
    function savePluginOrder(items) {
      log('Saving new plugin order');
      
      // Get plugin IDs in the new order
      const pluginOrder = items.map(item => {
        // Extract plugin ID from the item
        // You might need to adjust this based on the actual DOM structure
        const pluginId = item.dataset.pluginId || 
                        item.querySelector('.plugin-title')?.textContent || 
                        item.textContent.trim();
        return pluginId;
      });
      
      // Save to localStorage
      localStorage.setItem('tm-plugin-order', JSON.stringify(pluginOrder));
      log('New order saved:', pluginOrder);
      
      // If TypingMind has an API for this, you would call it here
      // For example: window.typingMind.setPluginOrder(pluginOrder);
    }
    
    // End reorder mode
    function endReorderMode() {
      log('Ending reorder mode');
      
      // Find the plugins container
      const pluginsContainer = document.querySelector('.installed-plugins-container') || 
                              document.querySelector('.plugins-list');
      
      if (!pluginsContainer) return;
      
      // Get all plugin items
      const pluginItems = Array.from(pluginsContainer.children);
      
      // Remove drag handles and restore original state
      pluginItems.forEach(item => {
        // Remove drag handle
        const dragHandle = item.querySelector('.plugin-drag-handle');
        if (dragHandle) dragHandle.remove();
        
        // Remove draggable attribute
        item.draggable = false;
        item.style.cursor = '';
        
        // Remove reorder mode class
        item.classList.remove('reorder-mode');
      });
      
      // Remove event listeners
      pluginsContainer.removeEventListener('dragstart', handleDragStart);
      pluginsContainer.removeEventListener('dragover', handleDragOver);
      pluginsContainer.removeEventListener('drop', handleDrop);
      
      // Restore reorder button
      const doneBtn = document.querySelector('#plugin-reorder-btn');
      doneBtn.innerHTML = '<i class="bi bi-arrow-down-up me-1"></i> Reorder';
      doneBtn.onclick = startReorderMode;
      
      // Remove styles
      removeReorderStyles();
    }
    
    // Add styles for reorder mode
    function addReorderStyles() {
      if (document.querySelector('#plugin-reorder-styles')) return;
      
      const styleEl = document.createElement('style');
      styleEl.id = 'plugin-reorder-styles';
      styleEl.textContent = `
        .reorder-mode {
          transition: transform 0.2s ease;
          border: 1px dashed #ccc !important;
          margin: 4px 0 !important;
        }
        .reorder-mode:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        .reorder-mode.dragging {
          opacity: 0.5;
          background-color: rgba(0, 0, 0, 0.05);
        }
      `;
      
      document.head.appendChild(styleEl);
    }
    
    // Remove styles for reorder mode
    function removeReorderStyles() {
      const styleEl = document.querySelector('#plugin-reorder-styles');
      if (styleEl) styleEl.remove();
    }
    
    // Periodically check if we're on the plugins page and add button if needed
    function checkAndAddButton() {
      if (isPluginsPage()) {
        createReorderButton();
      }
    }
    
    // Apply the saved order when the plugins list is loaded
    function applySavedOrder() {
      if (!isPluginsPage()) return;
      
      const savedOrder = localStorage.getItem('tm-plugin-order');
      if (!savedOrder) return;
      
      try {
        const pluginOrder = JSON.parse(savedOrder);
        const pluginsContainer = document.querySelector('.installed-plugins-container') || 
                                document.querySelector('.plugins-list');
        
        if (!pluginsContainer) return;
        
        // Get current plugin items
        const pluginItems = Array.from(pluginsContainer.children);
        
        // Sort according to saved order
        pluginItems.sort((a, b) => {
          const aName = a.querySelector('.plugin-title')?.textContent || a.textContent.trim();
          const bName = b.querySelector('.plugin-title')?.textContent || b.textContent.trim();
          
          const aIndex = pluginOrder.indexOf(aName);
          const bIndex = pluginOrder.indexOf(bName);
          
          // If not found in saved order, put at the end
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          
          return aIndex - bIndex;
        });
        
        // Reapply sorted items
        pluginItems.forEach(item => pluginsContainer.appendChild(item));
        
        log('Applied saved plugin order');
      } catch (err) {
        log('Error applying saved order:', err);
      }
    }
    
    // Start polling for plugins page
    setInterval(checkAndAddButton, config.pollInterval);
    
    // Also check for changes in URL hash
    window.addEventListener('hashchange', () => {
      checkAndAddButton();
      applySavedOrder();
    });
    
    // Initial check
    checkAndAddButton();
    setTimeout(applySavedOrder, 1500); // Apply saved order after a delay to ensure plugins are loaded
  }
  
  // Initialize when DOM is fully loaded
  if (document.readyState === 'complete') {
    initPluginReorder();
  } else {
    window.addEventListener('load', initPluginReorder);
  }
})();
