/**
 * Custom Web Component for viewing IIIF images using the OpenSeadragon viewer.
 * 
 * <edirom-image-viewer> provides an interface to load, view, and interact with IIIF images
 * using the OpenSeadragon JavaScript library. It supports dynamic attribute changes, zooming,
 * page navigation, rotation, and various viewer controls.
 * 
 * @class
 * @extends HTMLElement
 * 
 * @example
 * <edirom-image-viewer tilesources='["manifest.json"]'></edirom-image-viewer>
 * 
 * @attribute {string} tilesources - JSON string array of IIIF manifest URLs or tile source objects.
 * @attribute {number} pagenumber - The current page/image number to display (for multi-image sequences).
 * @attribute {number} zoom - The zoom level for the viewer.
 * @attribute {number} rotation - The rotation angle in degrees (0-360).
 * @attribute {boolean} preserveviewport - Whether to preserve viewport when changing pages.
 * @attribute {boolean} clicktozoom - Enable/disable click-to-zoom functionality.
 * @attribute {number} visibilityratio - Ratio of image that must be visible (0.0-1.0).
 * @attribute {number} minzoomlevel - Minimum allowed zoom level.
 * @attribute {number} maxzoomlevel - Maximum allowed zoom level.
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
 * @attribute {number} ulx - Upper-left x coordinate (pixels) of a rectangle to zoom to; defaults to image width if unset.
 * @attribute {number} uly - Upper-left y coordinate (pixels) of a rectangle to zoom to; defaults to image height if unset.
 * @attribute {number} lrx - Lower-right x coordinate (pixels) of a rectangle to zoom to; defaults to image width if unset.
 * @attribute {number} lry - Lower-right y coordinate (pixels) of a rectangle to zoom to; defaults to image height if unset.
 * 
 * @fires communicate-[property]-update - Fired when a property is updated via attribute change.
 * 
 * @method nextPage - Navigate to the next page in a sequence.
 * @method previousPage - Navigate to the previous page in a sequence.
 * @method goToPage - Navigate to a specific page number.
 * @method jumpToZone - Navigate to a specific page and zoom to a defined zone.
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
class EdiromImageViewer extends HTMLElement {
    /**
     * Creates an instance of EdiromImageViewer.
     * @constructor
     */
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        console.log("Constructor called");

        /** @type {OpenSeadragon.Viewer} OpenSeadragon viewer instance */
        this.openSeaDragon = null;
        
        /** @type {object} Additional OpenSeadragon options */
        this.options = this.getAttribute('openseadragon-options') ? 
            JSON.parse(this.getAttribute('openseadragon-options')) : {};
    }

    /**
     * Returns the list of observed attributes for the EdiromOpenseadragon custom element.
     * @static
     * @returns {Array<string>} The list of observed attributes.
     */
    static get observedAttributes() {
        return ['preserveviewport', 'clicktozoom', 'visibilityratio', 'minzoomlevel', 'maxzoomlevel', 'shownavigationcontrol',  'sequencemode', 'shownavigator', 'showzoomcontrol', 'showhomecontrol', 'showfullpagecontrol', 'showsequencecontrol', 'tilesources', 'pagenumber', 'zoom', 'rotation', 'triggerhome', 'triggerfullscreen', 'openseadragon-options', 'ulx', 'uly', 'lrx', 'lry'];
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
            detail: { [property]: newPropertyValue },
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
        console.log("Connected to DOM");

        // Scoped styles
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            #toolbar {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                background: #f5f5f5;
                border-bottom: 1px solid #ddd;
                flex-shrink: 0;
            }
            #toolbar button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border: 1px solid #ccc;
                border-radius: 4px;
                background: #fff;
                cursor: pointer;
                color: #333;
                padding: 0;
            }
            #toolbar button:hover {
                background: #e8e8e8;
            }
            #toolbar button:active {
                background: #ddd;
            }
            #viewer {
                flex: 1;
                min-height: 0;
                width: 100%;
            }
        `;
        this.shadowRoot.appendChild(style);

        // Load OpenSeadragon
        const osdScript = document.createElement('script');
        osdScript.src = "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.1/openseadragon.min.js";
        osdScript.defer = true;
        this.shadowRoot.appendChild(osdScript);

        // Create toolbar
        this.createToolbar();

        // Create a div for the OpenSeadragon viewer
        this.viewerDiv = document.createElement('div');
        this.viewerDiv.id = 'viewer';
        this.shadowRoot.appendChild(this.viewerDiv);

        // Callback when the script is loaded
        osdScript.onload = () => {
            if (window.OpenSeadragon) {
                this.set('tilesources', this.getAttribute('tilesources'));
            }
        };
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
                this.home();
                break;
            
            case 'triggerfullscreen':
                this.toggleFullScreen();
                break;
            
            case 'openseadragon-options':
                this.options = JSON.parse(newPropertyValue);
                if(this.openSeaDragon) {
                    this.displayOpenSeadragon();
                }
                break;

            case 'ulx':
            case 'uly':
            case 'lrx':
            case 'lry':
                if(this.openSeaDragon) {
                    this.applyRegionZoom();
                }
                break;

            case 'preserveviewport':
            case 'visibilityratio':
            case 'minzoomlevel':
            case 'maxzoomlevel':
            case 'sequencemode':
            case 'shownavigator':
                // These OpenSeadragon properties require recreating the viewer
                if(this.openSeaDragon) {
                    this.displayOpenSeadragon();
                }
                break;

            case 'shownavigationcontrol':
            case 'showzoomcontrol':
            case 'showhomecontrol':
            case 'showfullpagecontrol':
            case 'showsequencecontrol':
                // These OSD control attributes require recreating the viewer
                if(this.openSeaDragon) {
                    this.displayOpenSeadragon();
                }
                break;
            
            case 'clicktozoom':
                if(this.openSeaDragon) {
                    this.openSeaDragon.gestureSettingsMouse.clickToZoom = newPropertyValue !== 'false';
                }
                break;
            // handle default
            default:  
              console.log("Invalid property: '"+property+"'");
      
        }
    
    }

    /**
     * Creates a single toolbar button with an SVG icon.
     * @param {string} label - Accessible label for the button.
     * @param {string} title - Tooltip text.
     * @param {string} svgContent - Inner SVG markup for the icon.
     * @param {Function} clickHandler - Click event handler.
     * @returns {HTMLButtonElement} The created button element.
     */
    createButton(label, title, svgContent, clickHandler) {
        const button = document.createElement('button');
        button.setAttribute('aria-label', label);
        button.setAttribute('title', title);
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgContent}</svg>`;
        button.addEventListener('click', (e) => {
            e.preventDefault();
            clickHandler();
        });
        return button;
    }

    /**
     * Creates the custom toolbar with navigation buttons and appends it to the shadow DOM.
     * Called once during connectedCallback.
     */
    createToolbar() {
        this.toolbar = document.createElement('div');
        this.toolbar.id = 'toolbar';

        // Zoom controls
        this.btnZoomIn = this.createButton('Zoom in', 'Zoom in',
            '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
            () => this.zoomIn());

        this.btnZoomOut = this.createButton('Zoom out', 'Zoom out',
            '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>',
            () => this.zoomOut());

        // Home control
        this.btnHome = this.createButton('Reset view', 'Reset view',
            '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
            () => this.home());

        // Fullscreen control
        this.btnFullScreen = this.createButton('Toggle fullscreen', 'Toggle fullscreen',
            '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
            () => this.toggleFullScreen());

        // Sequence controls
        this.btnPrevPage = this.createButton('Previous page', 'Previous page',
            '<polyline points="15 18 9 12 15 6"/>',
            () => this.previousPage());

        this.btnNextPage = this.createButton('Next page', 'Next page',
            '<polyline points="9 18 15 12 9 6"/>',
            () => this.nextPage());

        this.toolbar.appendChild(this.btnZoomIn);
        this.toolbar.appendChild(this.btnZoomOut);
        this.toolbar.appendChild(this.btnHome);
        this.toolbar.appendChild(this.btnFullScreen);
        this.toolbar.appendChild(this.btnPrevPage);
        this.toolbar.appendChild(this.btnNextPage);

        this.shadowRoot.appendChild(this.toolbar);
    }

    /**
     * Initializes or reinitializes the OpenSeadragon viewer with current settings.
     * Handles both IIIF manifest URLs and direct tile sources.
     * For IIIF manifests, fetches and parses the manifest to extract image URLs.
     */
    displayOpenSeadragon() {
        // Ensure the viewer container exists before initialization
        if (!this.shadowRoot || !this.shadowRoot.getElementById('viewer')) {
            return;
        }

        if (window.OpenSeadragon) {

            if(this.openSeaDragon) {
                this.openSeaDragon.destroy();
            }

            const tileSources = JSON.parse(this.tilesources);
            
            // Check if it's a IIIF manifest URL (string ending with .json)
            if (Array.isArray(tileSources) && tileSources.length === 1 && 
                typeof tileSources[0] === 'string' && tileSources[0].includes('manifest')) {
                
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
                this.initializeViewer(tileSources);
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
        this.openSeaDragon = OpenSeadragon({
            element: this.shadowRoot.getElementById('viewer'),
            preserveViewport: this.preserveviewport !== 'false',
            visibilityRatio: parseFloat(this.visibilityratio) || 1.0,
            minZoomLevel: parseFloat(this.minzoomlevel) || 0.5,
            defaultZoomLevel: parseFloat(this.defaultzoomlevel) || null,
            maxZoomLevel: parseFloat(this.maxzoomlevel) || 10,
            // OSD built-in controls are hidden by default; set attribute to 'true' to show
            showNavigationControl: this.shownavigationcontrol === 'true',
            tileSources: tileSources,
            showNavigator: this.shownavigator !== 'false',
            showZoomControl: this.showzoomcontrol === 'true',
            showHomeControl: this.showhomecontrol === 'true',
            showFullPageControl: this.showfullpagecontrol === 'true',
            showSequenceControl: this.showsequencecontrol === 'true',
            sequenceMode: this.sequencemode !== 'false',
            gestureSettingsMouse: {
                clickToZoom: this.clicktozoom !== 'false',
            },
            // Merge additional options from openseadragon-options attribute
            ...this.options
        });

        // Apply initial page selection once the viewer is ready
        this.openSeaDragon.addOnceHandler('open', () => {
            const initialPage = parseInt(this.getAttribute('pagenumber') ?? this.pagenumber);
            if (!isNaN(initialPage)) {
                this.goToPage(initialPage);
            }
            this.applyRegionZoom();

            // Reapply region zoom on page changes
            this.openSeaDragon.addHandler('page', () => {
                this.handlePageChange();
            });

            // Ensure region zoom applies when a new page is opened (crucial for sequence mode)
            this.openSeaDragon.addHandler('open', () => {
                this.handlePageChange();
            });
        });

        // Ensure region zoom applies once tiles are available on first load
        this.openSeaDragon.addOnceHandler('tile-loaded', () => {
            this.applyRegionZoom();
        });
    }

    /**
     * Handles zoom and view reset on page changes.
     * Checks if a jumpToZone is pending or if standard attributes should be applied.
     */
    handlePageChange() {
        if (!this.openSeaDragon) return;

        if (this._jumpToZoneData) {
            if (this.openSeaDragon.currentPage() === this._jumpToZoneData.pageNumber) {
                // Only clear the data if the zoom was successfully applied
                if (this.applyRegionZoom(this._jumpToZoneData)) {
                    this._jumpToZoneData = null;
                }
            }
        } else {
            this.home();
        }
    }

    /**
     * Helper to get the current item being viewed.
     * Handles sequence mode vs collection mode logic.
     */
    getCurrentItem() {
        if (!this.openSeaDragon || !this.openSeaDragon.world) return null;
        
        // In sequence mode, the world usually holds just the current image at index 0
        // We check if sequence mode is enabled (assuming it matches the attribute logic)
        if (this.sequencemode !== 'false') {
             return this.openSeaDragon.world.getItemAt(0);
        }
        
        // In standard/collection mode, use the page index
        const idx = this.openSeaDragon.currentPage ? this.openSeaDragon.currentPage() : 0;
        return this.openSeaDragon.world.getItemAt(idx) || this.openSeaDragon.world.getItemAt(0);
    }

    /**
     * Jumps to a specific zone on a specified page.
     * @param {object} zoneData - Object containing pageNumber, ulx, uly, lrx, lry.
     */
    jumpToZone(zoneData) {
        if (!this.openSeaDragon) return;

        const targetPage = parseInt(zoneData.pageNumber);
        
        this._jumpToZoneData = {
            ...zoneData,
            pageNumber: targetPage
        };

        if (this.openSeaDragon.currentPage() !== targetPage) {
            this.goToPage(targetPage);
        } else {
            this.applyRegionZoom(this._jumpToZoneData, false);
            this._jumpToZoneData = null;
        }
    }

    /**
     * Applies a zoom to the rectangle defined by ulx, uly, lrx, lry (image pixel coordinates).
     * Missing values default to the maximum extent of the corresponding axis.
     * @param {object} [customZone=null] - Optional object with ulx, uly, lrx, lry properties. 
     * @param {boolean} [immediately=true] - Whether to apply the zoom immediately (true) or animate (false).
     * @returns {boolean} - True if zoom was applied, false otherwise.
     */
    applyRegionZoom(customZone = null, immediately = true) {
        if(!this.openSeaDragon || !this.openSeaDragon.world || !this.openSeaDragon.world.getItemCount()) {
            return false;
        }

        // Only act if at least one coordinate attribute is present or customZone is passed
        const hasAnyCoord = customZone || this.hasAttribute('ulx') || this.hasAttribute('uly') || this.hasAttribute('lrx') || this.hasAttribute('lry');
        if(!hasAnyCoord) {
            return false;
        }

        const currentItem = this.getCurrentItem ? this.getCurrentItem() : 
            (this.openSeaDragon.world.getItemAt(this.openSeaDragon.currentPage ? this.openSeaDragon.currentPage() : 0) || this.openSeaDragon.world.getItemAt(0));
            
        if(!currentItem) {
            return false;
        }

        const contentSize = currentItem.getContentSize();
        const imgWidth = contentSize.x;
        const imgHeight = contentSize.y;

        // If image not loaded yet, size might be 0? 
        if (imgWidth === 0 || imgHeight === 0) return false;

        let rawUlx, rawUly, rawLrx, rawLry;

        if (customZone) {
            rawUlx = customZone.ulx;
            rawUly = customZone.uly;
            rawLrx = customZone.lrx;
            rawLry = customZone.lry;
        } else {
            rawUlx = this.getAttribute('ulx');
            rawUly = this.getAttribute('uly');
            rawLrx = this.getAttribute('lrx');
            rawLry = this.getAttribute('lry');
        }

        const ulx = (rawUlx !== null && rawUlx !== undefined) ? parseFloat(rawUlx) : imgWidth;
        const uly = (rawUly !== null && rawUly !== undefined) ? parseFloat(rawUly) : imgHeight;
        const lrx = (rawLrx !== null && rawLrx !== undefined) ? parseFloat(rawLrx) : imgWidth;
        const lry = (rawLry !== null && rawLry !== undefined) ? parseFloat(rawLry) : imgHeight;

        const cleanUlx = Math.min(Math.max(isNaN(ulx) ? imgWidth : ulx, 0), imgWidth);
        const cleanUly = Math.min(Math.max(isNaN(uly) ? imgHeight : uly, 0), imgHeight);
        const cleanLrx = Math.min(Math.max(isNaN(lrx) ? imgWidth : lrx, 0), imgWidth);
        const cleanLry = Math.min(Math.max(isNaN(lry) ? imgHeight : lry, 0), imgHeight);

        const minX = Math.min(cleanUlx, cleanLrx);
        const maxX = Math.max(cleanUlx, cleanLrx);
        const minY = Math.min(cleanUly, cleanLry);
        const maxY = Math.max(cleanUly, cleanLry);

        const width = Math.max(maxX - minX, 1); // enforce minimal size
        const height = Math.max(maxY - minY, 1);

        const rect = new OpenSeadragon.Rect(minX, minY, width, height);
        const viewportRect = this.openSeaDragon.viewport.imageToViewportRectangle(rect);
        this.openSeaDragon.viewport.fitBounds(viewportRect, immediately);
        
        return true;
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
            this.openSeaDragon.goToPage(pageNumber);
        }
    }
    
    getCurrentPage() {
        return this.openSeaDragon ? this.openSeaDragon.currentPage() : 0;
    }
    
    getTotalPages() {
        return this.openSeaDragon ? this.openSeaDragon.world.getItemCount() : 0;
    }
    
    // Home/reset view
    home() {
        if(this.openSeaDragon) {
            this.openSeaDragon.viewport.goHome(true);
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
}

customElements.define('edirom-image-viewer', EdiromImageViewer);
