
console.log("Image Viewer loaded!");


/**
 * Custom Web Component for viewing IIIF images using the OpenSeadragon viewer.
 * 
 * <edirom-openseadragon> provides an interface to load, view, and interact with IIIF images
 * using the OpenSeadragon JavaScript library. It supports dynamic attribute changes, zooming,
 * page navigation, rotation, and various viewer controls.
 * 
 * @class
 * @extends HTMLElement
 * 
 * @example
 * <edirom-openseadragon tilesources='["manifest.json"]'></edirom-openseadragon>
 * 
 * @attribute {string} tilesources - JSON string array of IIIF manifest URLs or tile source objects.
 * @attribute {number} pagenumber - The current page/image number to display (for multi-image sequences).
 * @attribute {number} zoom - The zoom level for the viewer.
 * @attribute {number} rotation - The rotation angle in degrees (0-360).
 * @attribute {boolean} clicktozoom - Enable/disable click-to-zoom functionality.
 * @attribute {boolean} shownavigationcontrol - Show/hide all navigation controls.
 * @attribute {boolean} sequencemode - Enable sequence mode for multiple images.
 * @attribute {boolean} shownavigator - Show/hide the navigator mini-map.
 * @attribute {boolean} showzoomcontrol - Show/hide zoom in/out buttons.
 * @attribute {boolean} showhomecontrol - Show/hide the home/reset button.
 * @attribute {boolean} showfullpagecontrol - Show/hide the fullscreen toggle button.
 * @attribute {boolean} showsequencecontrol - Show/hide previous/next page buttons.
 * @attribute {string} triggerhome - Trigger attribute to reset view to home position.
 * @attribute {string} triggerfullscreen - Trigger attribute to toggle fullscreen mode.
 * @attribute {object|string} openseadragon-options - Additional OpenSeadragon configuration options as JSON object.
 * 
 * @attribute {string} zones-data - JSON object mapping zone keys to zone objects.
 *   Each zone: { name: string, page: number, ulx: number, uly: number, lrx: number, lry: number }
 * @attribute {string} zone - Key of the zone to navigate to (must exist in zones-data).
 * 
 * @fires communicate-[property]-update - Fired when a property is updated via attribute change.
 * @fires page-changed - Fired when the viewer navigates to a new page. detail: { pageNumber } (1-based).
 * @fires zone-changed - Fired when the viewer navigates to a zone. detail: { zoneKey, zone }.
 * 
 * @method nextPage - Navigate to the next page in a sequence.
 * @method previousPage - Navigate to the previous page in a sequence.
 * @method goToPage - Navigate to a specific page number.
 * @method getCurrentPage - Get the current page number.
 * @method getTotalPages - Get the total number of pages.
 * @method zoomIn - Zoom in by 20%.
 * @method zoomOut - Zoom out by 20%.
 * @method setZoom - Set zoom to a specific level.
 * @method getZoom - Get the current zoom level.
 * @method home - Reset view to initial state.
 * @method setFullScreen - Set fullscreen mode on/off.
 * @method toggleFullScreen - Toggle fullscreen mode.
 * @method isFullScreen - Check if in fullscreen mode.
 * @method rotate - Rotate by specified degrees.
 * @method setRotation - Set rotation to specific angle.
 * @method getRotation - Get current rotation angle.
 */
class EdiromOpenseadragon extends HTMLElement {
    /**
     * Creates an instance of EdiromOpenseadragon.
     * @constructor
     */
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        /** @type {OpenSeadragon.Viewer} OpenSeadragon viewer instance */
        this.openSeaDragon = null;
        
        /** @type {number} Total number of tile sources (images/pages) */
        this.totalTileSources = 0;
        
        /** @type {Object} Zone lookup map parsed from the zones-data attribute */
        this._zonesData = {};

        /** @type {string|null} Key of the currently active zone, or null */
        this._currentZoneKey = null;

        /** @type {Object|null} Zone waiting to be applied after an OSD page change completes */
        this._pendingZoneAfterPageChange = null;

        /** @type {object} Additional OpenSeadragon options */
        try {
            this.options = this.getAttribute('openseadragon-options') ? 
                JSON.parse(this.getAttribute('openseadragon-options')) : {};
        } catch (e) {
            console.error('Invalid openseadragon-options JSON:', e);
            this.options = {};
        }
    }

    /**
     * Returns the list of observed attributes for the EdiromOpenseadragon custom element.
     * @static
     * @returns {Array<string>} The list of observed attributes.
     */
    static get observedAttributes() {
        return ['preserveviewport', 'clicktozoom', 'visibilityratio', 'minzoomlevel', 'maxzoomlevel', 'shownavigationcontrol', 'sequencemode', 'shownavigator', 'showzoomcontrol', 'showhomecontrol', 'showfullpagecontrol', 'showsequencecontrol', 'tilesources', 'pagenumber', 'zoom', 'rotation', 'triggerhome', 'triggerfullscreen', 'openseadragon-options', 'zones-data', 'zone'];
    }

    /**
     * Invoked when one of the custom element's attributes is added, removed, or changed.
     * @param {string} property - The name of the attribute that was changed.
     * @param {*} oldValue - The previous value of the attribute.
     * @param {*} newValue - The new value of the attribute.
     */
    attributeChangedCallback(property, oldValue, newValue) {

        // handle property change
        this.set(property, newValue);

    }

    /**
     * Sets the value of a global property and triggers property update events.
     * @param {string} property - The name of the property to set.
     * @param {*} newPropertyValue - The new value to set for the property.
     */
    set(property, newPropertyValue) {
        
        // set internal and html properties  
        this[property] = newPropertyValue;
        
        // custom event for property update
        const event = new CustomEvent('communicate-' + property + '-update', {
            detail: {
                element: this.tagName.toLowerCase(),
                property: property,
                value: newPropertyValue
            },
            bubbles: true
        });
        this.dispatchEvent(event);

        // further handling of property change
        this.handlePropertyChange(property, newPropertyValue);
    }

    /**
     * Lifecycle callback invoked when the custom element is added to the DOM.
     * Loads the OpenSeadragon library and initializes the viewer container.
     */
    connectedCallback() {
        console.log("Image Viewer connected to DOM!");
        
        // Add host styles
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                width: 100%;
                height: 100%;
            }
        `;
        this.shadowRoot.appendChild(style);
        
        // Load OpenSeadragon CSS into shadow DOM
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/openseadragon@6.0.2/build/openseadragon/openseadragon.min.css';
        this.shadowRoot.appendChild(cssLink);
        
        // Create a div for the OpenSeadragon viewer
        this.viewerDiv = document.createElement('div');
        this.viewerDiv.id = 'viewer';
        this.viewerDiv.style.width = '100%';
        this.viewerDiv.style.height = '100%';
        this.viewerDiv.style.position = 'relative';
        this.shadowRoot.appendChild(this.viewerDiv);
        
        // Load OpenSeadragon script to main document if not already loaded
        if (!window.OpenSeadragon) {
            const osdScript = document.createElement('script');
            osdScript.src = "https://unpkg.com/openseadragon@6.0.2/build/openseadragon/openseadragon.min.js";
            osdScript.defer = true;
            document.head.appendChild(osdScript);
            
            osdScript.onload = () => {
                if (window.OpenSeadragon) {
                    this.set('tilesources', this.getAttribute('tilesources'));
                }
            };
            
            osdScript.onerror = () => {
                console.error("Failed to load OpenSeadragon script");
            };
        } else {
            // OpenSeadragon already loaded
            this.set('tilesources', this.getAttribute('tilesources'));
        }
    }

    /**
     * Handles property changes for the OpenSeadragon viewer component.
     * Routes property changes to appropriate handler methods or triggers viewer recreation.
     * @param {string} property - The name of the property being changed.
     * @param {any} newPropertyValue - The new value of the property.
     */
    handlePropertyChange(property, newPropertyValue) {
        switch(property) {
      
            // handle tileSources property change
            case 'tilesources':
                // Clear tileSources from options when tilesources attribute is explicitly set
                if (this.options.tileSources) {
                    delete this.options.tileSources;
                }
                // Destroy existing viewer to ensure complete replacement
                if(this.openSeaDragon) {
                    this.openSeaDragon.destroy();
                    this.openSeaDragon = null;
                }
                this.displayOpenSeadragon();
                break;
            
            case 'pagenumber':
                this.goToPage(parseInt(newPropertyValue));
                break;
            
            case 'zoom':
                this.setZoom(parseFloat(newPropertyValue));
                break;
            
            case 'rotation':
                this.setRotation(parseFloat(newPropertyValue));
                break;
            
            case 'triggerhome':
                if(newPropertyValue === 'true') {
                    this.home();
                }
                break;
            
            case 'triggerfullscreen':
                if(newPropertyValue === 'true') {
                    this.toggleFullScreen();
                }
                break;
            
            case 'openseadragon-options':
                try {
                    this.options = JSON.parse(newPropertyValue);
                    // If tileSources is in options, clear the tilesources attribute
                    // so that options take priority
                    if (this.options.tileSources) {
                        this.tilesources = '';
                    }
                    // Destroy existing viewer to ensure complete replacement
                    if(this.openSeaDragon) {
                        this.openSeaDragon.destroy();
                        this.openSeaDragon = null;
                    }
                    // If tileSources is in options, rebuild the viewer even if it doesn't exist yet
                    if (this.options.tileSources || this.tilesources) {
                        this.displayOpenSeadragon();
                    }
                } catch (e) {
                    console.error('Invalid openseadragon-options JSON:', e);
                }
                break;

            case 'preserveviewport':
            case 'visibilityratio':
            case 'minzoomlevel':
            case 'maxzoomlevel':
            case 'shownavigationcontrol':
            case 'sequencemode':
            case 'showfullpagecontrol':
            case 'shownavigator':
            case 'showzoomcontrol':
            case 'showhomecontrol':
            case 'showsequencecontrol':
                // These control visibility properties require recreating the viewer
                if(this.openSeaDragon) {
                    this.displayOpenSeadragon();
                }
                break;
            
            case 'clicktozoom':
                if(this.openSeaDragon) {
                    this.openSeaDragon.gestureSettingsMouse.clickToZoom = newPropertyValue === 'true';
                }
                break;

            case 'zones-data':
                try {
                    this._zonesData = JSON.parse(newPropertyValue) || {};
                } catch (e) {
                    console.error('Invalid zones-data JSON:', e);
                    this._zonesData = {};
                }
                // If a zone key is already active, re-apply it against the new data.
                if (this._currentZoneKey) {
                    this._applyZoneByKey(this._currentZoneKey);
                }
                break;

            case 'zone':
                this._applyZoneByKey(newPropertyValue);
                break;

            // handle default
            default:  
              console.log("Invalid property: '"+property+"'");
      
        }
    
    }

    /**
     * Initializes or reinitializes the OpenSeadragon viewer with current settings.
     * Handles both IIIF manifest URLs and direct tile sources.
     * For IIIF manifests, fetches and parses the manifest to extract image URLs.
     */
    displayOpenSeadragon() {
        console.log('=== displayOpenSeadragon called ===');
        console.log('tilesources:', this.tilesources);
        console.log('OpenSeadragon available:', !!window.OpenSeadragon);
        
        if (window.OpenSeadragon) {

            if(this.openSeaDragon) {
                console.log('Destroying existing viewer');
                this.openSeaDragon.destroy();
            }

            try {
                // Determine which tile sources to use
                // Priority: openseadragon-options.tileSources > tilesources attribute
                let tileSources = null;
                
                if (this.options.tileSources) {
                    console.log('Using tileSources from openseadragon-options');
                    tileSources = Array.isArray(this.options.tileSources) 
                        ? this.options.tileSources 
                        : [this.options.tileSources];
                } else if (this.tilesources && this.tilesources.trim()) {
                    console.log('Using tilesources attribute');
                    tileSources = JSON.parse(this.tilesources);
                } else {
                    tileSources = [];
                }
                
                console.log('Parsed tile sources:', tileSources);
                
                // Check if it's a IIIF manifest URL (string ending with .json)
                if (Array.isArray(tileSources) && tileSources.length === 1 && 
                    typeof tileSources[0] === 'string' && tileSources[0].includes('manifest')) {
                    
                    console.log('Loading IIIF manifest...');
                    // Fetch and parse the IIIF manifest
                    fetch(tileSources[0])
                        .then(response => response.json())
                        .then(manifest => {
                            const imageUrls = [];
                            
                            // Extract image info.json URLs from IIIF Presentation API manifest
                            if (manifest.sequences && manifest.sequences[0] && manifest.sequences[0].canvases) {
                                manifest.sequences[0].canvases.forEach(canvas => {
                                    if (canvas.images && canvas.images[0] && canvas.images[0].resource) {
                                        const service = canvas.images[0].resource.service;
                                        if (service) {
                                            const serviceId = service['@id'] || service.id;
                                            imageUrls.push(serviceId + '/info.json');
                                        }
                                    }
                                });
                            }
                            
                            console.log('Extracted image URLs:', imageUrls);
                            // Initialize OpenSeadragon with extracted image URLs
                            this.initializeViewer(imageUrls);
                        })
                        .catch(error => {
                            console.error('Error loading IIIF manifest:', error);
                            // Try to load as regular tile sources
                            this.initializeViewer(tileSources);
                        });
                } else {
                    // Direct tile sources (not a manifest URL)
                    console.log('Loading direct tile sources');
                    this.initializeViewer(tileSources);
                }
            } catch (error) {
                console.error('Error parsing tile sources:', error);
            }
        } else {
            console.error('OpenSeadragon library is not loaded.');
        }
    }
    
    /**
     * Initializes the OpenSeadragon viewer with the provided tile sources.
     * Creates a new viewer instance with all configured options.
     * @param {Array} tileSources - Array of tile source URLs or objects.
     */
    initializeViewer(tileSources) {
        console.log('initializeViewer called with:', tileSources);
        console.log('Viewer div:', this.viewerDiv);
        console.log('OpenSeadragon available:', !!window.OpenSeadragon);
        
        if (!window.OpenSeadragon) {
            console.error('OpenSeadragon library not available');
            return;
        }
        
        try {
            // Store the tile sources count
            this.totalTileSources = Array.isArray(tileSources) ? tileSources.length : 1;
            
            this.openSeaDragon = OpenSeadragon({
                element: this.viewerDiv,
                prefixUrl: 'https://unpkg.com/openseadragon@6.0.2/build/openseadragon/images/',
                preserveViewport: this.preserveviewport === 'true',
                visibilityRatio: parseFloat(this.visibilityratio) || 1.0,
                minZoomLevel: parseFloat(this.minzoomlevel) || 0.5,
                defaultZoomLevel: parseFloat(this.defaultzoomlevel) || 1,
                maxZoomLevel: parseFloat(this.maxzoomlevel) || 10,
                showNavigationControl: this.shownavigationcontrol === 'true',
                tileSources: tileSources,
                showNavigator:  this.shownavigator === 'true',
                showZoomControl:  this.showzoomcontrol === 'true',
                showHomeControl:  this.showhomecontrol === 'true',
                showFullPageControl:  this.showfullpagecontrol === 'true',
                showSequenceControl:  this.showsequencecontrol === 'true',
                sequenceMode: this.sequencemode === 'true',
                gestureSettingsMouse: {
                  clickToZoom: this.clicktozoom === 'true',
                },
                // Merge additional options from openseadragon-options attribute
                ...this.options
            });
            console.log('OpenSeadragon viewer initialized successfully:', this.openSeaDragon);

            // --- Page change and zone handlers ---
            // Fire page-changed on every OSD page navigation.
            // If a zone was requested for this page, apply it once tiles are loaded.
            this.openSeaDragon.addHandler('page', (event) => {
                this._firePageChanged(event.page + 1);
                if (!this._pendingZoneAfterPageChange) return;
                const pending = this._pendingZoneAfterPageChange;
                this._pendingZoneAfterPageChange = null;
                // Wait for the tiled image on the new page to be fully ready
                this.openSeaDragon.addOnceHandler('tile-loaded', () => {
                    this._applyZone(pending.zone);
                    this._fireZoneChanged(pending.zoneKey, pending.zone);
                });
            });

            // If a zone was requested before the viewer was ready, apply it now.
            // Wait for 'tile-loaded' so coordinate conversion is safe.
            if (this._currentZoneKey && this._zonesData[this._currentZoneKey]) {
                const zone = this._zonesData[this._currentZoneKey];
                const zoneKey = this._currentZoneKey;
                this.openSeaDragon.addOnceHandler('tile-loaded', () => {
                    this._applyZone(zone);
                    this._fireZoneChanged(zoneKey, zone);
                });
            }
        } catch (error) {
            console.error('Error initializing OpenSeadragon:', error);
        }
    }
    
    /**
     * Public API Methods
     */
    
    /**
     * Zooms in by increasing the current zoom level by 20%.
     */
    zoomIn() {
        if(this.openSeaDragon) {
            const currentZoom = this.openSeaDragon.viewport.getZoom();
            this.openSeaDragon.viewport.zoomTo(currentZoom * 1.2);
        }
    }
    
    /**
     * Zooms out by decreasing the current zoom level by 20%.
     */
    zoomOut() {
        if(this.openSeaDragon) {
            const currentZoom = this.openSeaDragon.viewport.getZoom();
            this.openSeaDragon.viewport.zoomTo(currentZoom / 1.2);
        }
    }
    
    /**
     * Sets the zoom level to a specific value.
     * @param {number} zoomLevel - The desired zoom level.
     */
    setZoom(zoomLevel) {
        if(this.openSeaDragon && !isNaN(zoomLevel)) {
            this.openSeaDragon.viewport.zoomTo(zoomLevel);
        }
    }
    
    getZoom() {
        return this.openSeaDragon ? this.openSeaDragon.viewport.getZoom() : 0;
    }
    
    // Page navigation methods
    nextPage() {
        if(this.openSeaDragon) {
            this.openSeaDragon.goToNextPage();
        }
    }
    
    previousPage() {
        if(this.openSeaDragon) {
            this.openSeaDragon.goToPreviousPage();
        }
    }
    
    goToPage(pageNumber) {
        if(this.openSeaDragon && !isNaN(pageNumber)) {
            // Convert from 1-based (user) to 0-based (internal) indexing
            const zeroBasedPage = parseInt(pageNumber) - 1;
            this.openSeaDragon.goToPage(zeroBasedPage);
        }
    }
    
    getCurrentPage() {
        // Return 1-based page number for user display
        return this.openSeaDragon ? this.openSeaDragon.currentPage() + 1 : 1;
    }
    
    getTotalPages() {
        // In sequence mode, multiple images are pages of a single item
        // Return the total number of tile sources (pages) that were loaded
        // Based on: https://github.com/openseadragon/openseadragon/issues/1448
        return this.totalTileSources > 0 ? this.totalTileSources : 1;
    }
    
    // Home/reset view
    home() {
        if(this.openSeaDragon) {
            console.log('Calling home()');
            this.openSeaDragon.viewport.goHome();
        } else {
            console.error('OpenSeadragon viewer not initialized');
        }
    }
    
    // Full screen methods
    setFullScreen(fullScreen) {
        if(this.openSeaDragon) {
            this.openSeaDragon.setFullScreen(fullScreen);
        }
    }
    
    toggleFullScreen() {
        if(this.openSeaDragon) {
            this.openSeaDragon.setFullScreen(!this.openSeaDragon.isFullPage());
        }
    }
    
    isFullScreen() {
        return this.openSeaDragon ? this.openSeaDragon.isFullPage() : false;
    }
    
    // Rotation methods
    rotate(degrees) {
        if(this.openSeaDragon && !isNaN(degrees)) {
            this.openSeaDragon.viewport.setRotation(
                this.openSeaDragon.viewport.getRotation() + degrees
            );
        }
    }
    
    setRotation(degrees) {
        if(this.openSeaDragon && !isNaN(degrees)) {
            this.openSeaDragon.viewport.setRotation(degrees);
        }
    }
    
    getRotation() {
        return this.openSeaDragon ? this.openSeaDragon.viewport.getRotation() : 0;
    }

    // ---------------------------------------------------------------
    //  Zone navigation
    // ---------------------------------------------------------------

    /**
     * Navigates the viewer to the zone identified by `zoneKey` in `_zonesData`.
     * Handles same-page transitions (smooth) and cross-page transitions
     * (page change + deferred zone application).
     * @param {string} zoneKey - Key of the zone in the zones-data map.
     */
    _applyZoneByKey(zoneKey) {
        const zone = this._zonesData[zoneKey];
        if (!zone) {
            console.warn(`edirom-openseadragon: zone "${zoneKey}" not found in zones-data.`);
            return;
        }
        this._currentZoneKey = zoneKey;

        if (!this.openSeaDragon) {
            // Viewer not ready yet — initializeViewer will pick it up via _currentZoneKey.
            return;
        }

        const targetPage = parseInt(zone.page) - 1; // 1-based → 0-based
        const currentPage = this.openSeaDragon.currentPage();

        if (targetPage === currentPage) {
            // Same page: apply zone directly (smooth viewport animation)
            this._applyZone(zone);
            this._fireZoneChanged(zoneKey, zone);
        } else {
            // Different page: defer zone until the new page's tiles are loaded
            this._pendingZoneAfterPageChange = { zoneKey, zone };
            this.openSeaDragon.goToPage(targetPage);
        }
    }

    /**
     * Zooms/pans the viewport to the zone coordinates, or resets to home if
     * no coordinates are present. Uses OSD's spring animation for smooth transitions.
     * @param {Object} zone - The zone object with optional ulx, uly, lrx, lry.
     */
    _applyZone(zone) {
        if (!this.openSeaDragon) return;

        const hasZone = zone.ulx != null && zone.uly != null &&
            zone.lrx != null && zone.lry != null;

        if (!hasZone) {
            this.openSeaDragon.viewport.goHome();
            return;
        }

        // Convert pixel coordinates to viewport coordinates via the current TiledImage
        const tiledImage = this.openSeaDragon.world.getItemAt(0);
        if (!tiledImage) {
            console.warn('edirom-openseadragon: no TiledImage available for zone conversion.');
            this.openSeaDragon.viewport.goHome();
            return;
        }

        const rect = tiledImage.imageToViewportRectangle(
            Number(zone.ulx),
            Number(zone.uly),
            Number(zone.lrx) - Number(zone.ulx),
            Number(zone.lry) - Number(zone.uly)
        );
        // fitBounds without immediately=true uses OSD's spring animation
        this.openSeaDragon.viewport.fitBounds(rect);
    }

    /**
     * Dispatches the `zone-changed` custom event.
     * @param {string} zoneKey - The key of the zone that was navigated to.
     * @param {Object} zone - The zone object that was navigated to.
     */
    _fireZoneChanged(zoneKey, zone) {
        this.dispatchEvent(new CustomEvent('zone-changed', {
            detail: { zoneKey, zone },
            bubbles: true
        }));
    }

    /**
     * Dispatches the `page-changed` custom event.
     * @param {number} pageNumber - The 1-based page number that was navigated to.
     */
    _firePageChanged(pageNumber) {
        this.dispatchEvent(new CustomEvent('page-changed', {
            detail: { pageNumber },
            bubbles: true
        }));
    }
}

customElements.define('edirom-openseadragon', EdiromOpenseadragon);