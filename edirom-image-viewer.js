
class EdiromOpenseadragon extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        console.log("Constructor called");

        // Load OpenSeadragon library
    }

    static get observedAttributes() {
        return ['preserveviewport', 'clicktozoom', 'visibilityratio', 'minzoomlevel', 'maxzoomlevel', 'shownavigationcontrol',  'sequencemode', 'shownavigator', 'showzoomcontrol', 'showhomecontrol', 'showfullpagecontrol', 'showsequencecontrol', 'tilesources'];
    }

    attributeChangedCallback(property, oldValue, newValue) {

        // handle property change
        this.set(property, newValue);

    }

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


    handlePropertyChange(property, newPropertyValue) {
        switch(property) {
      
            // handle tileSources property change
            case 'tilesources':
                this.displayOpenSeadragon();
                break;
            case 'showfullpagecontrol':                
                this.openSeaDragon.showFullPageControl =  newPropertyValue === 'true';
                break;
    
                
            // handle default
            default:  
              console.log("Invalid property: '"+property+"'");
      
        }
    
    }

    displayOpenSeadragon() {
        if (window.OpenSeadragon) {

            if(this.openSeaDragon) {
                this.openSeaDragon.destroy();
            }

            this.openSeaDragon = OpenSeadragon({
                element: this.shadowRoot.getElementById('viewer'),
                preserveViewport: this.preserveviewport,
                visibilityRatio: this.visibilityratio,
                minZoomLevel: this.minzoomlevel,
                defaultZoomLevel: this.defaultzoomLevel,
                maxZoomLevel: this.maxzoomlevel,
                showNavigationControl: this.shownavigationcontrol === 'true',
                tileSources: JSON.parse(this.tilesources),
                showNavigator:  this.shownavigator === 'true',
                showZoomControl:  this.showzoomcontrol === 'true',
                showHomeControl:  this.showhomecontrol === 'true',
                showFullPageControl:  this.showfullpagecontrol === 'true',
                showSequenceControl:  this.showsequencecontrol === 'true',
                gestureSettingsMouse: {
                  clickToZoom: this.clicktozoom === 'true',
                }
            });
        } else {
            console.error('OpenSeadragon library is not loaded.');
        }
    }
}

customElements.define('edirom-openseadragon', EdiromOpenseadragon);
