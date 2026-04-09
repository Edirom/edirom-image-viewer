
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
 * @attribute {string} sequence-data - JSON string array of step objects for custom step-based navigation.
 *   Each step: { name: string, page: number, ulx?: number, uly?: number, lrx?: number, lry?: number }
 * @attribute {string} current-step - The name of the currently active step in the sequence.
 * 
 * @fires communicate-[property]-update - Fired when a property is updated via attribute change.
 * @fires step-changed - Fired when the viewer navigates to a new step in the custom sequence.
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
 * @method goToStep - Navigate to a specific step by name.
 * @method nextStepInSequence - Navigate to the next step in the custom sequence.
 * @method previousStepInSequence - Navigate to the previous step in the custom sequence.
 * @method getCurrentStepName - Get the name of the current step.
 * @method getTotalSteps - Get the total number of steps.
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
        
        /** @type {Array<Object>} Parsed step objects from the sequence-data attribute */
        this._sequenceSteps = [];

        /** @type {number} Index of the currently active step in _sequenceSteps (-1 = none) */
        this._currentStepIndex = -1;

        /** @type {Object|null} Step waiting to be applied after an OSD page change completes */
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
        return ['preserveviewport', 'clicktozoom', 'visibilityratio', 'minzoomlevel', 'maxzoomlevel', 'shownavigationcontrol', 'sequencemode', 'shownavigator', 'showzoomcontrol', 'showhomecontrol', 'showfullpagecontrol', 'showsequencecontrol', 'tilesources', 'pagenumber', 'zoom', 'rotation', 'triggerhome', 'triggerfullscreen', 'openseadragon-options', 'sequence-data', 'current-step'];
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

            case 'sequence-data':
                try {
                    this._sequenceSteps = JSON.parse(newPropertyValue) || [];
                } catch (e) {
                    console.error('Invalid sequence-data JSON:', e);
                    this._sequenceSteps = [];
                }
                // If current-step is already set, re-apply it against the new steps;
                // otherwise navigate to the first step.
                if (this['current-step']) {
                    this._goToStepByName(this['current-step']);
                } else if (this._sequenceSteps.length > 0) {
                    this._applyStep(this._sequenceSteps[0], 0);
                }
                break;

            case 'current-step':
                this._goToStepByName(newPropertyValue);
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

            // --- Custom sequence step handlers ---
            // After a page change, apply the pending zone (if any) once the
            // new TiledImage has loaded so coordinate conversion is safe.
            this.openSeaDragon.addHandler('page', (event) => {
                if (!this._pendingZoneAfterPageChange) return;
                const pending = this._pendingZoneAfterPageChange;
                // Wait for the tiled image on the new page to be fully ready
                this.openSeaDragon.addOnceHandler('tile-loaded', () => {
                    this._applyZone(pending.step);
                    this._currentStepIndex = pending.index;
                    this._pendingZoneAfterPageChange = null;
                    this._fireStepChanged(pending.step);
                });
            });

            // If a step was requested before the viewer was ready, apply it now.
            // The first page's TiledImage is not yet loaded at this point, so
            // we must wait for 'tile-loaded' before applying the zone — same as
            // we do for cross-page transitions.
            if (this._sequenceSteps.length > 0) {
                const index = this['current-step']
                    ? this._sequenceSteps.findIndex(s => String(s.name) === String(this['current-step']))
                    : (this._currentStepIndex >= 0 ? this._currentStepIndex : 0);
                if (index >= 0) {
                    const step = this._sequenceSteps[index];
                    this.openSeaDragon.addOnceHandler('tile-loaded', () => {
                        this._applyZone(step);
                        this._currentStepIndex = index;
                        this._fireStepChanged(step);
                    });
                }
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
    //  Custom sequence step navigation
    //  (independent of OpenSeadragon's built-in sequence controls)
    // ---------------------------------------------------------------

    /**
     * Resolves a step by its name and applies it.
     * @param {string} stepName - The name of the target step.
     */
    _goToStepByName(stepName) {
        if (!this._sequenceSteps.length) return;
        const index = this._sequenceSteps.findIndex(s => String(s.name) === String(stepName));
        if (index === -1) {
            console.warn(`edirom-openseadragon: step "${stepName}" not found in sequence-data.`);
            return;
        }
        this._applyStep(this._sequenceSteps[index], index);
    }

    /**
     * Core method: navigates the viewer to the given step.
     * Handles same-page zone transitions (smooth) and cross-page transitions
     * (page change + deferred zone application).
     * @param {Object} step  - The step object { name, page, ulx?, uly?, lrx?, lry? }.
     * @param {number} index - Index of the step in _sequenceSteps.
     */
    _applyStep(step, index) {
        if (!this.openSeaDragon) {
            // Viewer not ready yet — store for later (initializeViewer will pick it up)
            this._currentStepIndex = index;
            return;
        }

        const targetPage = parseInt(step.page) - 1; // 1-based → 0-based
        const currentPage = this.openSeaDragon.currentPage();

        if (targetPage === currentPage) {
            // Same page: apply zone directly (smooth viewport animation)
            this._applyZone(step);
            this._currentStepIndex = index;
            this._fireStepChanged(step);
        } else {
            // Different page: defer zone until the new page's tiles are loaded
            this._pendingZoneAfterPageChange = { step, index };
            this.openSeaDragon.goToPage(targetPage);
        }
    }

    /**
     * Zooms/pans the viewport to the zone defined in `step`, or resets to
     * home if no zone coordinates are present.  Uses OSD's spring animation
     * (immediately=false) for smooth transitions.
     * @param {Object} step - The step object with optional ulx, uly, lrx, lry.
     */
    _applyZone(step) {
        if (!this.openSeaDragon) return;

        const hasZone = step.ulx != null && step.uly != null &&
            step.lrx != null && step.lry != null;

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
            Number(step.ulx),
            Number(step.uly),
            Number(step.lrx) - Number(step.ulx),
            Number(step.lry) - Number(step.uly)
        );
        // fitBounds without immediately=true uses OSD's spring animation
        this.openSeaDragon.viewport.fitBounds(rect);
    }

    /**
     * Dispatches the `step-changed` custom event.
     * @param {Object} step - The step that was navigated to.
     */
    _fireStepChanged(step) {
        this.dispatchEvent(new CustomEvent('step-changed', {
            detail: { step },
            bubbles: true
        }));
    }

    /**
     * Navigate to a specific step by its name.
     * @param {string} stepName - The name of the target step.
     */
    goToStep(stepName) {
        this._goToStepByName(stepName);
    }

    /**
     * Navigate to the next step in the custom sequence.
     */
    nextStepInSequence() {
        if (this._currentStepIndex < this._sequenceSteps.length - 1) {
            const nextIndex = this._currentStepIndex + 1;
            this._applyStep(this._sequenceSteps[nextIndex], nextIndex);
        }
    }

    /**
     * Navigate to the previous step in the custom sequence.
     */
    previousStepInSequence() {
        if (this._currentStepIndex > 0) {
            const prevIndex = this._currentStepIndex - 1;
            this._applyStep(this._sequenceSteps[prevIndex], prevIndex);
        }
    }

    /**
     * Returns the name of the currently active step, or null if none.
     * @returns {string|null}
     */
    getCurrentStepName() {
        if (this._currentStepIndex >= 0 && this._currentStepIndex < this._sequenceSteps.length) {
            return this._sequenceSteps[this._currentStepIndex].name;
        }
        return null;
    }

    /**
     * Returns the total number of steps in the custom sequence.
     * @returns {number}
     */
    getTotalSteps() {
        return this._sequenceSteps.length;
    }
}

customElements.define('edirom-openseadragon', EdiromOpenseadragon);