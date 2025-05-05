// plugin-reorder.js
(() => {
  const STORAGE_KEY = "tm_plugin_order";

  const log = (...m) => console.log("%c[TM-ReOrder]", "color:#b48", ...m);

  // 1. Wait until the #plugins page & list exist
  function waitForList() {
    return new Promise((resolve) => {
      const look = () => {
        // Works on classic and new UI versions
        const list =
          document.querySelector('[data-list="plugins-installed"]') ||
          [...document.querySelectorAll("div")]
            .find((d) => d?.textContent?.trim() === "Installed")
            ?.nextElementSibling;

        if (location.hash.startsWith("#plugins") && list?.children?.length) {
          resolve(list);
          return true;
        }
        return false;
      };

      if (look()) return;
      new MutationObserver(() => look())
        .observe(document.body, { childList: true, subtree: true });
    });
  }

  // 2. Give every tile a unique id we can persist
  function addIds(list) {
    [...list.children].forEach((el) => {
      // Use inner text as a fallback; in TM every plugin tile is unique
      el.dataset.pluginId = el.dataset.pluginId || el.innerText.trim();
    });
  }

  // 3. Make tiles draggable
  function makeDraggable(item) {
    item.draggable = true;
    item.style.cursor = "grab";
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", item.dataset.pluginId);
      item.classList.add("tm-dragging");
    });
    item.addEventListener("dragend", () => item.classList.remove("tm-dragging"));
  }

  // 4. Helpers for container
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
      const after = getAfter(list, e.clientY);
      if (!after) list.appendChild(dragging);
      else list.insertBefore(dragging, after);
    });

    list.addEventListener("drop", () => saveOrder(list));
  }

  // 5. Persist / restore order
  const saveOrder = (list) => {
    const ids = [...list.children].map((el) => el.dataset.pluginId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    log("Order saved:", ids);
  };

  const applySavedOrder = (list) => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const ids = JSON.parse(raw);
    const byId = Object.fromEntries(
      [...list.children].map((el) => [el.dataset.pluginId, el])
    );
    ids.forEach((id) => byId[id] && list.appendChild(byId[id]));
    log("Order restored");
  };

  // 6. Inject minimal CSS
  const style = document.createElement("style");
  style.textContent = `
    .tm-dragging { opacity: .5; }
  `;
  document.head.appendChild(style);

  // 7. Main
  if (window.top === window) {
    waitForList().then((list) => {
      addIds(list);
      [...list.children].forEach(makeDraggable);
      enableDnD(list);
      applySavedOrder(list);
      
      // Add a visible reorder button to make mobile more usable
      const pluginTitle = document.querySelector('h1, h2, h3').textContent === 'Plugins' ? 
                         document.querySelector('h1, h2, h3') : null;
      
      if (pluginTitle) {
        const reorderBtn = document.createElement('button');
        reorderBtn.innerText = "Reorder";
        reorderBtn.style.cssText = "margin-left: 12px; padding: 5px 10px; border-radius: 4px; font-size: 14px;";
        pluginTitle.parentNode.insertBefore(reorderBtn, pluginTitle.nextSibling);
        
        // Toggle drag UI visibility for better mobile experience
        let dragEnabled = false;
        reorderBtn.addEventListener('click', () => {
          dragEnabled = !dragEnabled;
          reorderBtn.innerText = dragEnabled ? "Done" : "Reorder";
          list.classList.toggle('reorder-active', dragEnabled);
          
          [...list.children].forEach(el => {
            el.style.position = dragEnabled ? 'relative' : '';
            
            // Mobile-friendly drag handles
            if (dragEnabled && !el.querySelector('.drag-handle')) {
              const handle = document.createElement('div');
              handle.className = 'drag-handle';
              handle.innerHTML = '⋮⋮';
              handle.style.cssText = 'position:absolute; right:8px; top:50%; transform:translateY(-50%); font-size:20px; opacity:0.7;';
              el.appendChild(handle);
              
              // For mobile touch, add up/down buttons
              const upBtn = document.createElement('button');
              upBtn.innerHTML = '↑';
              upBtn.style.cssText = 'position:absolute; right:45px; top:50%; transform:translateY(-50%); width:30px; height:30px;';
              upBtn.onclick = (e) => {
                e.stopPropagation();
                const prev = el.previousElementSibling;
                if (prev) list.insertBefore(el, prev);
                saveOrder(list);
              };
              
              const downBtn = document.createElement('button');
              downBtn.innerHTML = '↓';
              downBtn.style.cssText = 'position:absolute; right:80px; top:50%; transform:translateY(-50%); width:30px; height:30px;';
              downBtn.onclick = (e) => {
                e.stopPropagation();
                const next = el.nextElementSibling;
                if (next) list.insertBefore(next, el);
                saveOrder(list);
              };
              
              el.appendChild(upBtn);
              el.appendChild(downBtn);
            } else if (!dragEnabled) {
              // Clean up when done
              el.querySelectorAll('.drag-handle, button').forEach(b => b.remove());
            }
          });
        });
      }
      
      log("Plugin reordering enabled ✓");
    });
  }
})();
