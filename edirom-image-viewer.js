
class EdiromOpenseadragon extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        console.log("Constructor called");

        // Load OpenSeadragon library
    }

    static get observedAttributes() {
        return ['preserveviewport', 'visibilityration', 'minzoomlevel', 'maxzoomlevel', 'shownavigationcontrol', 'sequencemode', 'tilesources'];
    }

    attributeChangedCallback(property, oldValue, newValue) {

        // handle property change
        this.set(property, newValue);

        if(property === 'tilesources') {
            this.displayOpenSeadragon();
        }
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
        // Callback when the element is added to the document's DOM
        osdScript.onload = () => this.displayOpenSeadragon();
    }

    displayOpenSeadragon() {
        console.log("this is attribute called hi " ,  this.maxzoomlevel)
        console.log("OpenSeadragon script loaded");
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
                showNavigationControl: this.shownavigationcontrol,
                sequenceMode: this.sequencemode,
                tileSources: JSON.parse(this.tilesources)

            });
        } else {
            console.error('OpenSeadragon library is not loaded.');
        }
    }
}

customElements.define('edirom-openseadragon', EdiromOpenseadragon);
