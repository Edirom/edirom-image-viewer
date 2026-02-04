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
class EdiromOpenseadragon extends HTMLElement {
    /**
     * Creates an instance of EdiromOpenseadragon.
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
        const osdScript = document.createElement('script');
        osdScript.src = "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.1/openseadragon.min.js";
        osdScript.defer = true;
        this.shadowRoot.appendChild(osdScript);
       

        // Create a div for the OpenSeadragon viewer
        this.viewerDiv = document.createElement('div');
        this.viewerDiv.id = 'viewer';
        this.viewerDiv.style.width = '100%';
        this.viewerDiv.style.height = '100%';
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
            preserveViewport: this.preserveviewport === 'true',
            visibilityRatio: parseFloat(this.visibilityratio) || 1.0,
            minZoomLevel: parseFloat(this.minzoomlevel) || 0.5,
            defaultZoomLevel: parseFloat(this.defaultzoomlevel) || null,
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
        if (this.sequencemode === 'true') {
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

customElements.define('edirom-openseadragon', EdiromOpenseadragon);
