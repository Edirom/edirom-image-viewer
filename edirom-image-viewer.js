/**
 * EdiromOpenseadragon - Web component for displaying IIIF images using OpenSeadragon
 * @class
 * @extends HTMLElement
 */
class EdiromOpenseadragon extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    console.log("Constructor called");
    this.currentPage = 1;
    this.totalPages = 1;
    this.tileSources = [];
  }

  static get observedAttributes() {
    return [
      'tilesources', 'pagenumber', 'zoom', 'rotation', 'preserveviewport',
      'clicktozoom', 'visibilityratio', 'minzoomlevel', 'maxzoomlevel',
      'showcontrol', 'sequencemode', 'shownavigator',
      'showzoomcontrol', 'showhomecontrol', 'showfullpagecontrol',
      'showsequencecontrol', 'triggernextpage', 'triggerpreviouspage', 'triggerfullscreen'
    ];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    console.log('attributeChangedCallback:', property, 'oldValue:', oldValue, 'newValue:', newValue);
    
    // handle property change
    this.set(property, newValue);
  }

  set(property, newPropertyValue) {
    // set internal and html properties  
    this[property] = newPropertyValue;
    
    // Skip event dispatch for trigger attributes being reset to empty string
    const skipEvent = (property === 'triggernextpage' || property === 'triggerpreviouspage') && newPropertyValue === '';
    
    if (!skipEvent) {
      // custom event for property update
      const event = new CustomEvent('communicate-' + property + '-update', {
        detail: { [property]: newPropertyValue },
        bubbles: true
      });
      this.dispatchEvent(event);
    }

    // further handling of property change
    this.handlePropertyChange(property, newPropertyValue);
  }

  connectedCallback() {
    console.log("Connected to DOM");
    
    // Setup container
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        #viewer {
          width: 100%;
          height: 100%;
        }
        #custom-fullscreen-btn {
          position: absolute;
          top: 40px;
          right: 10px;
          z-index: 100;
          padding: 8px 12px;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          display: none;
        }
        #custom-fullscreen-btn:hover {
          background-color: rgba(0, 0, 0, 0.9);
        }
      </style>
      <div id="viewer"></div>
      <button id="custom-fullscreen-btn">Fullscreen</button>
    `;
    
    // Setup fullscreen button handler
    const fullscreenBtn = this.shadowRoot.getElementById('custom-fullscreen-btn');
    fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    
    // Listen for fullscreen changes with bound handler for cleanup
    this.fullscreenChangeHandler = () => this.handleFullscreenChange();
    document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
    
    // Load OpenSeadragon library
    const osdScript = document.createElement('script');
    osdScript.src = "https://cdn.jsdelivr.net/npm/openseadragon@4.1.1/build/openseadragon/openseadragon.min.js";
    osdScript.defer = true;
    this.shadowRoot.appendChild(osdScript);
    
    // Callback when the script is loaded
    osdScript.onload = () => {
      if (window.OpenSeadragon) {
        this.set('tilesources', this.getAttribute('tilesources'));
      }
    };
  }

  handlePropertyChange(property, newPropertyValue) {
    switch(property) {
      // handle tileSources property change
      case 'tilesources':
        this.displayOpenSeadragon();
        break;
      case 'pagenumber':
        this.handlePageNumberChange(newPropertyValue);
        break;
      case 'zoom':
        if (this.openSeaDragon) {
          this.openSeaDragon.viewport.zoomTo(parseFloat(newPropertyValue), null, true);
        }
        break;
      case 'rotation':
        if (this.openSeaDragon) {
          this.openSeaDragon.viewport.setRotation(parseFloat(newPropertyValue));
        }
        break;
      case 'clicktozoom':
        if (this.openSeaDragon) {
          this.openSeaDragon.gestureSettingsMouse.clickToZoom = newPropertyValue === 'true';
        }
        break;
      case 'showfullpagecontrol':
        // Rebuild viewer if fullpage control visibility changes
        this.displayOpenSeadragon();
        // Also manage custom fullscreen button
        if (newPropertyValue === 'true') {
          this.showFullscreenButton();
        } else {
          this.hideFullscreenButton();
        }
        break;
      case 'showcontrol':
        // Show/hide all controls
        const showAllControls = newPropertyValue === 'true';
        this.setAttribute('showzoomcontrol', showAllControls ? 'true' : 'false');
        this.setAttribute('showhomecontrol', showAllControls ? 'true' : 'false');
        this.setAttribute('showfullpagecontrol', showAllControls ? 'true' : 'false');
        this.setAttribute('showsequencecontrol', showAllControls ? 'true' : 'false');
        this.setAttribute('shownavigator', showAllControls ? 'true' : 'false');
        break;
      case 'shownavigationcontrol':
        // Rebuild viewer if navigation control visibility changes
        this.displayOpenSeadragon();
        break;
      case 'showhomecontrol':
        // Rebuild viewer if home control visibility changes
        this.displayOpenSeadragon();
        break;
      case 'shownavigator':
        // Rebuild viewer if navigator visibility changes
        this.displayOpenSeadragon();
        break;
      case 'showzoomcontrol':
        // Rebuild viewer if zoom control visibility changes
        this.displayOpenSeadragon();
        break;
      case 'showsequencecontrol':
        // Rebuild viewer if sequence control visibility changes
        this.displayOpenSeadragon();
        break;
      case 'sequencemode':
        // Rebuild viewer if sequence mode changes
        this.displayOpenSeadragon();
        break;
      case 'triggernextpage':
        console.log('triggernextpage handler called with value:', newPropertyValue);
        // Handle both string 'true' and boolean values
        if (newPropertyValue === 'true' || newPropertyValue === true) {
          console.log('Calling nextPage(), currentPage:', this.currentPage, 'totalPages:', this.totalPages);
          this.nextPage();
        }
        // Always reset trigger after processing so it can be used again
        if (newPropertyValue !== '') {
          setTimeout(() => this.setAttribute('triggernextpage', ''), 0);
        }
        break;
      case 'triggerpreviouspage':
        console.log('triggerpreviouspage handler called with value:', newPropertyValue);
        // Handle both string 'true' and boolean values
        if (newPropertyValue === 'true' || newPropertyValue === true) {
          console.log('Calling previousPage(), currentPage:', this.currentPage, 'totalPages:', this.totalPages);
          this.previousPage();
        }
        // Always reset trigger after processing so it can be used again
        if (newPropertyValue !== '') {
          setTimeout(() => this.setAttribute('triggerpreviouspage', ''), 0);
        }
        break;
      case 'triggerfullscreen':
        console.log('triggerfullscreen handler called with value:', newPropertyValue);
        // Handle both string 'true' and boolean values
        if (newPropertyValue === 'true' || newPropertyValue === true) {
          console.log('Toggling fullscreen');
          this.toggleFullscreen();
        }
        // Always reset trigger after processing so it can be used again
        if (newPropertyValue !== '') {
          setTimeout(() => this.setAttribute('triggerfullscreen', ''), 0);
        }
        break;
      default:
        console.log("Property: '" + property + "' = '" + newPropertyValue + "'");
    }
  }

  handlePageNumberChange(value) {
    const pageNum = parseInt(value) - 1;
    if (pageNum >= 0 && pageNum < this.tileSources.length) {
      this.currentPage = pageNum + 1;
      this.previousZoom = undefined; // Reset zoom tracking when changing pages
      if (this.openSeaDragon) {
        this.openSeaDragon.goToPage(pageNum);
      }
    }
  }

  displayOpenSeadragon() {
    if (window.OpenSeadragon) {
      if (this.tilesources) {
        try {
          this.tileSources = JSON.parse(this.tilesources);
          this.totalPages = this.tileSources.length;
        } catch (e) {
          console.error('Invalid tilesources JSON:', e);
          return;
        }
      }

      if (this.tileSources.length === 0) return;

      if (this.openSeaDragon) {
        this.openSeaDragon.destroy();
      }

      this.openSeaDragon = OpenSeadragon({
        element: this.shadowRoot.getElementById('viewer'),
        preserveViewport: this.preserveviewport === 'true',
        visibilityRatio: parseFloat(this.visibilityratio || '1'),
        minZoomLevel: parseFloat(this.minzoomlevel || '0.5'),
        maxZoomLevel: parseFloat(this.maxzoomlevel || '10'),
        prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4.1.1/build/openseadragon/images/',
        showNavigationControl: this.showcontrol === 'true',
        tileSources: this.tileSources,
        sequenceMode: this.sequencemode === 'true',
        initialPage: Math.max(0, this.currentPage - 1),
        showNavigator: this.shownavigator === 'true',
        showZoomControl: this.showzoomcontrol === 'true',
        showHomeControl: this.showhomecontrol === 'true',
        showFullPageControl: this.showfullpagecontrol === 'true',
        showSequenceControl: this.showsequencecontrol === 'true',
        gestureSettingsMouse: {
          clickToZoom: this.clicktozoom === 'true'
        }
      });

      // Override OpenSeadragon's setFullScreen to use custom fullscreen logic
      const originalSetFullScreen = this.openSeaDragon.setFullScreen.bind(this.openSeaDragon);
      this.openSeaDragon.setFullScreen = (fullScreen) => {
        // Use custom fullscreen logic instead of OSD's buggy implementation
        this.toggleFullscreen();
      };

      // Clear any existing zoom handlers before adding new one
      if (this.zoomHandlerRef) {
        this.openSeaDragon.removeHandler('zoom', this.zoomHandlerRef);
      }

      // Setup event handlers - only fire event once per significant zoom change
      this.zoomHandlerRef = () => {
        const currentZoom = this.openSeaDragon.viewport.getZoom();
        
        // Only dispatch zoom updates when zoom level has actually changed by threshold
        if (!this.lastDispatchedZoom || Math.abs(currentZoom - this.lastDispatchedZoom) > 0.01) {
          this.lastDispatchedZoom = currentZoom;
          
          this.dispatchEvent(new CustomEvent('communicate-zoom-update', {
            detail: { zoom: currentZoom },
            bubbles: true
          }, { once: true }));
        }
        
        this.previousZoom = currentZoom;
      };

      this.openSeaDragon.addHandler('zoom', this.zoomHandlerRef);
    } else {
      console.error('OpenSeadragon library is not loaded.');
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.setAttribute('pagenumber', (this.currentPage + 1).toString());
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.setAttribute('pagenumber', (this.currentPage - 1).toString());
    }
  }

  goToPage(pageNumber) {
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      this.setAttribute('pagenumber', pageNumber.toString());
    }
  }

  getCurrentPage() {
    return this.currentPage;
  }

  // Helper method to listen for events that fire once
  onceDataOut(eventType, callback) {
    this.addEventListener(`communicate-${eventType}-update`, callback, { once: true });
  }

  // Helper method to listen for events
  onDataOut(eventType, callback) {
    this.addEventListener(`communicate-${eventType}-update`, callback);
  }

  // Remove a data-out event listener
  offDataOut(eventType, callback) {
    this.removeEventListener(`communicate-${eventType}-update`, callback);
  }

  getTotalPages() {
    return this.totalPages;
  }

  zoomIn() {
    if (this.openSeaDragon) {
      const currentZoom = this.openSeaDragon.viewport.getZoom();
      this.openSeaDragon.viewport.zoomTo(currentZoom * 1.2, null, true);
    }
  }

  zoomOut() {
    if (this.openSeaDragon) {
      const currentZoom = this.openSeaDragon.viewport.getZoom();
      this.openSeaDragon.viewport.zoomTo(currentZoom / 1.2, null, true);
    }
  }

  setZoom(level) {
    if (this.openSeaDragon) {
      this.openSeaDragon.viewport.zoomTo(level, null, true);
    }
  }

  getZoom() {
    return this.openSeaDragon ? this.openSeaDragon.viewport.getZoom() : 1;
  }

  home() {
    if (this.openSeaDragon) {
      this.openSeaDragon.viewport.goHome(true);
    }
  }

  rotate(degrees) {
    if (this.openSeaDragon) {
      const currentRotation = this.openSeaDragon.viewport.getRotation();
      this.openSeaDragon.viewport.setRotation(currentRotation + degrees);
    }
  }

  setRotation(degrees) {
    if (this.openSeaDragon) {
      this.openSeaDragon.viewport.setRotation(degrees);
    }
  }

  getRotation() {
    return this.openSeaDragon ? this.openSeaDragon.viewport.getRotation() : 0;
  }

  toggleFullscreen() {
    const elem = this.shadowRoot.getElementById('viewer')?.parentElement || this;
    if (!document.fullscreenElement) {
      elem.requestFullscreen?.().catch(err => {
        console.error('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen?.().catch(err => {
        console.error('Exit fullscreen failed:', err);
      });
    }
  }

  handleFullscreenChange() {
    if (this.openSeaDragon) {
      // Give browser a moment to recalculate layout
      setTimeout(() => {
        this.openSeaDragon.forceResize();
        this.openSeaDragon.viewport.goHome(true);
      }, 100);
    }
  }

  showFullscreenButton() {
    const btn = this.shadowRoot?.getElementById('custom-fullscreen-btn');
    if (btn) btn.style.display = 'block';
  }

  hideFullscreenButton() {
    const btn = this.shadowRoot?.getElementById('custom-fullscreen-btn');
    if (btn) btn.style.display = 'none';
  }

  disconnectedCallback() {
    if (this.fullscreenChangeHandler) {
      document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
    }
    if (this.openSeaDragon) {
      if (this.zoomHandlerRef) {
        this.openSeaDragon.removeHandler('zoom', this.zoomHandlerRef);
      }
      this.openSeaDragon.destroy();
      this.openSeaDragon = null;
    }
  }
}

customElements.define('edirom-openseadragon', EdiromOpenseadragon);