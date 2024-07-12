
class EdiromOpenseadragon extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        console.log("Constructor called");

        // Load OpenSeadragon library
    }

    static get observedAttributes() {
        return ['preserveviewport', 'visibilityratio', 'minzoomlevel', 'maxzoomlevel', 'shownavigationcontrol', 'sequencemode', 'tilesources'];
    }

    attributeChangedCallback(property, oldValue, newValue) {
        console.log("hi");

        // handle property change
        this.set(property, newValue);
    }

    set(property, newPropertyValue) {
        console.log("hi2");
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
      
        console.log("OpenSeadragon script loaded");
        if (window.OpenSeadragon) {
            OpenSeadragon({
                element: this.shadowRoot.getElementById('viewer'),
                preserveViewport: this.preserveViewport === 'true',
                visibilityRatio: 1,
                minZoomLevel: 1,
                defaultZoomLevel: 1,
                maxZoomLevel: 1,
                showNavigationControl: 'true',
                sequenceMode: 'true',
                tileSources: [
                    "https://libimages1.princeton.edu/loris/pudl0001%2F4609321%2Fs42%2F00000001.jp2/info.json",
                    "https://libimages1.princeton.edu/loris/pudl0001%2F4609321%2Fs42%2F00000002.jp2/info.json",
                    "https://libimages1.princeton.edu/loris/pudl0001%2F4609321%2Fs42%2F00000003.jp2/info.json",
                    "https://libimages1.princeton.edu/loris/pudl0001%2F4609321%2Fs42%2F00000004.jp2/info.json",
                    "https://libimages1.princeton.edu/loris/pudl0001%2F4609321%2Fs42%2F00000005.jp2/info.json",
                    "https://libimages1.princeton.edu/loris/pudl0001%2F4609321%2Fs42%2F00000006.jp2/info.json",
                    "https://libimages1.princeton.edu/loris/pudl0001%2F4609321%2Fs42%2F00000007.jp2/info.json"
                ]
            });
        } else {
            console.error('OpenSeadragon library is not loaded.');
        }
    }
}

customElements.define('edirom-openseadragon', EdiromOpenseadragon);
