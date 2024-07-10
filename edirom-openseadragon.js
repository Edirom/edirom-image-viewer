class EdiromOpenseadragon extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Load OpenSeadragon library
        const openSeaDragonScript = document.createElement('script');
        openSeaDragonScript.src = "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.1/openseadragon.min.js";
        openSeaDragonScript.defer = true;
        this.shadowRoot.appendChild(openSeaDragonScript);

        // Create a div for the OpenSeadragon viewer
        this.viewerDiv = document.createElement('div');
        this.viewerDiv.id = 'viewer';
        this.viewerDiv.style.width = '100%';
        this.viewerDiv.style.height = '100%'; 
        this.shadowRoot.appendChild(this.viewerDiv);

        openSeaDragonScript.onload = () => this.displayOpenSeadragon();
    }

    displayOpenSeadragon() {
        if (window.OpenSeadragon) {
            OpenSeadragon({
                element: this.shadowRoot.getElementById('viewer'),
                preserveViewport: true,
                visibilityRatio: 1,
                minZoomLevel: 1,
                defaultZoomLevel: 1,
                sequenceMode: true,
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

    connectedCallback() {
        // Callback when the element is added to the document's DOM
    }
}

customElements.define('edirom-openseadragon', EdiromOpenseadragon);
