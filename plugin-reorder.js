/* Typingmind Plugin Re-Order  •  v1.1.0 */
(() => {
  const STORAGE_KEY = "tm_plugin_order";
  const log = (...m) => console.log("%c[TM-ReOrder]", "color:#b48", ...m);
  const error = (...m) => console.error("%c[TM-ReOrder ERROR]", "color:red", ...m);

  try {
    // 1. Wait until the #plugins page & list exist
    function waitForList() {
      return new Promise((resolve) => {
        const checkForList = () => {
          try {
            // First, check if we're on the plugins page
            if (!location.hash.startsWith("#plugins")) return false;
            
            // Try different ways to find the installed plugins list
            const list =
              document.querySelector('[data-list="plugins-installed"]') ||
              [...document.querySelectorAll("div")]
                .find((d) => d?.textContent?.trim() === "Installed")
                ?.nextElementSibling;
              
            if (list?.children?.length) {
              log("Plugin list found:", list);
              resolve(list);
              return true;
            }
          } catch (e) {
            error("Error finding list:", e);
          }
          return false;
        };

        if (checkForList()) return;
        
        // Keep checking as the page changes
        const observer = new MutationObserver(() => {
          if (checkForList()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Fallback timeout
        setTimeout(() => {
          if (location.hash.startsWith("#plugins")) {
            error("Plugins list not found after 5s. Please refresh and try again.");
          }
          observer.disconnect();
        }, 5000);
      });
    }

    // 2. Add Reorder button (like on Models page)
    function addReorderButton(list) {
      // Find a good place to add the button (near search if exists, or as sibling to list)
      const container = list.parentElement;
      
      // Create a button similar to the Models page button
      const button = document.createElement("button");
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="10" x2="14" y2="10"></line>
          <line x1="4" y1="14" x2="10" y2="14"></line>
          <line x1="4" y1="18" x2="8" y2="18"></line>
          <line x1="4" y1="6" x2="18" y2="6"></line>
        </svg>
        Reorder
      `;
      
      button.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        font-size: 14px;
        color: #555;
        background: transparent;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
        margin: 10px 0;
      `;
      
      // Create container for button
      const buttonContainer = document.createElement("div");
      buttonContainer.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-bottom: 10px;
      `;
      
      const heading = document.createElement("div");
      heading.textContent = "Installed Plugins";
      heading.style.fontWeight = "500";
      
      buttonContainer.appendChild(heading);
      buttonContainer.appendChild(button);
      
      // Insert before the list
      container.insertBefore(buttonContainer, list);
      
      return button;
    }

    // 3. Give every tile a unique id we can persist
    function addIds(list) {
      [...list.children].forEach((el, index) => {
        // Get the plugin name from the tile
        const pluginName = el.querySelector("div")?.innerText?.trim() || 
                         el.innerText?.trim() || 
                         `plugin-${index}`;
        el.dataset.pluginId = pluginName;
      });
    }

    // 4. Make tiles visibly draggable
    function makeDraggable(item) {
      item.draggable = true;
      
      // Add a visual drag handle
      const handle = document.createElement("div");
      handle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="16" y2="6"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
          <line x1="8" y1="18" x2="16" y2="18"></line>
        </svg>
      `;
      handle.className = "tm-drag-handle";
      handle.style.cssText = `
        cursor: grab;
        margin-right: 5px;
        display: none;
        align-items: center;
        color: #aaa;
      `;
      
      // Add the handle to the start of the item
      if (item.firstChild) {
        item.insertBefore(handle, item.firstChild);
      } else {
        item.appendChild(handle);
      }
      
      // Setup drag events
      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", item.dataset.pluginId);
        item.classList.add("tm-dragging");
      });
      
      item.addEventListener("dragend", () => {
        item.classList.remove("tm-dragging");
      });
    }

    // 5. Enable reordering when button is clicked
    function enableReordering(list, button) {
      let isReorderMode = false;
      
      button.addEventListener("click", () => {
        isReorderMode = !isReorderMode;
        
        // Toggle state
        if (isReorderMode) {
          button.style.background = "#f0f0f0";
          button.style.borderColor = "#999";
          list.classList.add("tm-reorder-mode");
          log("Reorder mode activated");
        } else {
          button.style.background = "transparent";
          button.style.borderColor = "#ddd";
          list.classList.remove("tm-reorder-mode");
          saveOrder(list);
          log("Reorder mode deactivated, order saved");
        }
      });
    }

    // 6. Helpers for container
    const getAfter = (container, y) =>
      [...container.querySelectorAll("[draggable]:not(.tm-dragging)")].reduce(
        (closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = y - box.top - box.height / 2;
          return offset < 0 && offset > closest.offset
            ? { offset, element: child }
            : closest;
        },
        { offset: Number.NEGATIVE_INFINITY }
      ).element;

    function enableDnD(list) {
      list.addEventListener("dragover", (e) => {
        e.preventDefault();
        const dragging = list.querySelector(".tm-dragging");
        if (!dragging) return;
        
        const after = getAfter(list, e.clientY);
        if (!after) list.appendChild(dragging);
        else list.insertBefore(dragging, after);
      });

      list.addEventListener("drop", (e) => {
        e.preventDefault();
      });
    }

    // 7. Persist / restore order
    const saveOrder = (list) => {
      try {
        const ids = [...list.children].map((el) => el.dataset.pluginId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        log("Order saved:", ids);
      } catch (e) {
        error("Failed to save order:", e);
      }
    };

    const applySavedOrder = (list) => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        
        const ids = JSON.parse(raw);
        if (!Array.isArray(ids) || ids.length === 0) return false;
        
        const byId = Object.fromEntries(
          [...list.children].map((el) => [el.dataset.pluginId, el])
        );
        
        ids.forEach((id) => byId[id] && list.appendChild(byId[id]));
        log("Order restored from storage");
        return true;
      } catch (e) {
        error("Failed to restore order:", e);
        return false;
      }
    };

    // 8. Inject minimal CSS
    const injectStyles = () => {
      const style = document.createElement("style");
      style.textContent = `
        .tm-dragging { opacity: .5; }
        .tm-reorder-mode .tm-drag-handle { display: flex !important; }
        .tm-reorder-mode [draggable] { cursor: grab; }
        .tm-reorder-mode [draggable]:hover { background-color: #f8f8f8; }
      `;
      document.head.appendChild(style);
    };

    // 9. Main
    if (window.top === window) {
      injectStyles();
      
      waitForList().then((list) => {
        try {
          log("Setting up plugin reordering...");
          
          addIds(list);
          const reorderButton = addReorderButton(list);
          
          [...list.children].forEach(makeDraggable);
          enableReordering(list, reorderButton);
          enableDnD(list);
          
          if (applySavedOrder(list)) {
            log("Previous plugin order restored ✓");
          }
          
          log("Plugin reordering enabled ✓");
        } catch (e) {
          error("Setup failed:", e);
        }
      });
    }
  } catch (e) {
    error("Critical error:", e);
  }
})();
