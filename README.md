![GitHub License](https://github.com/Edirom/edirom-openseadragon)

# Edirom Openseadragon Component

This web component displays IIIF tile sources using openseadragon library. It is intended to be used in tbe Edirom Online, but can also be (re-)used in other web applications. No compilation or building is necessary to use the web component. 
The component uses (https://openseadragon.github.io) library. 
Note: This repository only contains the bare JavaScript-based component, there is a separate [demo suite](https://github.com/Edirom/edirom-web-components-demonstrator) for web components developed in the Edirom Online Reloaded project, where the component can be seen and tested.


## License

The edirom-openseadragon.js comes with the license MIT. 

The imported Openseadragon library comes with the license BSD-3-Clause license.


## How to use this web component

1. Clone the repository into a directory of your choice
2. Include the path to the web component's JavaScript file into the `<head>` an HTML page
```html
<script src="path/to/edirom-openseadragon.js"></script>
```
3. Include a custom element (this is specified and can be processed by the component) into the `<body>` of the HTML page. The attributes of the custom element are used as parameters at initialization of the component and changing them (manually or programmatically) can control the components state and behaviour during runtime. The state changes of the web component are communicated outwards via custom events (called 'communicate-{change-type}-update'). The component/document that instantiates the web component (its parent) can listen (via event listeners which have to be implemented individually) and react to the communicated state changes if necessary. The separation of inward communication (via custom element's attributes) and outward communication (via custom events) is esp. necessary to handle frequently populated information like currentTime of the audio player and avoid interference between reading and writing info about the component's state.
```html
<edirom-openseadragon preserveviewport='' visibilityratio='' minzoomLevel='' maxzoomLevel='' shownavigationcontrol='' sequencemode='' tileSources=''></edirom-openseadragon>
```

### Parameters

_Note: All attribute values are strings internally, the data type information below indicates the necessary format of the attribute value._

The Openseadrgon parameters mentioned below are based on the available [Openseadragon library](https://openseadragon.github.io/docs/).  This list below is can be extended to add additonal Openseadragon parameters. 
| Parameter              | Data type | Description                                                                                                                                             | Default  |
|------------------------|------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| preserveviewport       | string     | Preserves the viewport settings when navigating between pages.                                                                                           | "false"  |
| visibilityratio        | string     | Sets the visibility ratio of the rendered SVG.                                                                                                           | "1.0"    |
| minzoomLevel           | integer    | The minimum zoom level for the rendered SVG.                                                                                                             | "1"      |
| maxzoomLevel           | integer    | The maximum zoom level for the rendered SVG.                                                                                                             | "10"     |
| shownavigationcontrol  | string     | Controls the visibility of the navigation controls.                                                                                                      | "true"   |
| sequencemode           | string     | Sets the mode for sequence navigation (e.g., 'continuous', 'discrete').                                                                                  | "false"  |
| tilesources            | string     | URL or array of URLs for the source tiles used in rendering the SVG. e.g., `tilesources='["https://libimages1.princeton.edu/loris/pudl0001%2F4609321%2Fs42%2F00000001.jp2/info.json", "https://libimages1.princeton.edu/loris/pudl0001%2F4609321%2Fs42%2F00000002.jp2/info.json"...]'` | ""       |




