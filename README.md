![GitHub License](https://img.shields.io/github/license/Edirom/edirom-image-viewer)

# Edirom Image Viewer Component

This web component displays IIIF images using the [OpenSeadragon](https://openseadragon.github.io) library. It is intended to be used in the Edirom Online, but can also be (re-)used in other web applications. No compilation or building is necessary to use the web component.

**Note:** This repository only contains the bare JavaScript-based component. There is a separate [demo suite](https://github.com/Edirom/edirom-web-components-demonstrator) for web components developed in the Edirom Online Reloaded project, where the component can be seen and tested.

## Features

- **IIIF Support**: Load IIIF manifests or direct tile sources
- **Image Navigation**: Navigate through multi-page image sequences
- **Zoom & Pan**: Interactive zoom and pan controls
- **Rotation**: Rotate images to any angle
- **Customizable Controls**: Show/hide navigator, zoom buttons, home button, fullscreen toggle
- **Attribute-Driven**: All interactions through standard HTML attributes
- **Custom Configuration**: Pass advanced OpenSeadragon options via JSON
- **Event Communication**: Custom events for state changes

## License

The `edirom-image-viewer.js` comes with the MIT license.

The imported OpenSeadragon library comes with the BSD-3-Clause license.

## How to Use This Web Component

### 1. Include the Component

Add the web component script to your HTML page's `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/openseadragon@4.1.1/build/openseadragon/openseadragon.min.js"></script>
<script src="path/to/edirom-image-viewer.js"></script>
```

### 2. Add the Custom Element

Include the custom element in your HTML `<body>`:

```html
<edirom-openseadragon 
    tilesources='["https://example.com/iiif/manifest.json"]'
    shownavigator="true"
    showzoomcontrol="true"
    sequencemode="true">
</edirom-openseadragon>
```

### 3. Interact via Attributes

Control the component by setting attributes programmatically:

```javascript
const viewer = document.querySelector('edirom-openseadragon');
viewer.setAttribute('zoom', '2.5');
viewer.setAttribute('rotation', '90');
viewer.setAttribute('pagenumber', '5');
```

### 4. Listen to Events

The component fires custom events when state changes:

```javascript
viewer.addEventListener('communicate-zoom-update', (event) => {
    console.log('Zoom changed:', event.detail);
});
```

## Attributes

_Note: All attribute values are strings. The data type information indicates the expected format._

| Attribute                | Type    | Description                                                                                                                                             | Default  |
|--------------------------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| `tilesources`            | string  | JSON array of IIIF manifest URLs or tile source URLs. Example: `'["https://example.com/manifest.json"]'` or `'["https://example.com/info.json"]'` | `""`     |
| `pagenumber`             | number  | Current page number in a multi-image sequence (1-based).                                                                                                 | `1`      |
| `zoom`                   | number  | Zoom level of the viewer.                                                                                                                                | `1`      |
| `rotation`               | number  | Rotation angle in degrees (0-360).                                                                                                                       | `0`      |
| `preserveviewport`       | boolean | Preserve viewport settings when navigating between pages.                                                                                                | `false`  |
| `clicktozoom`            | boolean | Enable click-to-zoom functionality.                                                                                                                      | `true`   |
| `visibilityratio`        | number  | Ratio of image that must remain visible (0.0-1.0).                                                                                                       | `1.0`    |
| `minzoomlevel`           | number  | Minimum allowed zoom level.                                                                                                                              | `0.5`    |
| `maxzoomlevel`           | number  | Maximum allowed zoom level.                                                                                                                              | `10`     |
| `shownavigationcontrol`  | boolean | Show/hide all navigation controls.                                                                                                                       | `true`   |
| `sequencemode`           | boolean | Enable sequence mode for multi-image navigation.                                                                                                         | `false`  |
| `shownavigator`          | boolean | Show/hide the navigator mini-map.                                                                                                                        | `true`   |
| `showzoomcontrol`        | boolean | Show/hide zoom in/out buttons.                                                                                                                           | `true`   |
| `showhomecontrol`        | boolean | Show/hide the home/reset view button.                                                                                                                    | `true`   |
| `showfullpagecontrol`    | boolean | Show/hide the fullscreen toggle button.                                                                                                                  | `true`   |
| `showsequencecontrol`    | boolean | Show/hide previous/next page buttons (requires `sequencemode="true"`).                                                                                   | `true`   |
| `triggerhome`            | string  | Trigger attribute to reset view to home position (set any value to trigger).                                                                             | `""`     |
| `triggerfullscreen`      | string  | Trigger attribute to toggle fullscreen mode (set any value to trigger).                                                                                  | `""`     |
| `openseadragon-options`  | string  | JSON object with additional OpenSeadragon configuration options. Example: `'{"gestureSettingsTouch": {"pinchRotate": true}}'`                          | `""`     |

## Public Methods

The component provides the following public methods:

### Navigation
- `nextPage()` - Navigate to the next page
- `previousPage()` - Navigate to the previous page
- `goToPage(pageNumber)` - Navigate to a specific page
- `getCurrentPage()` - Get the current page number
- `getTotalPages()` - Get the total number of pages

### Zoom
- `zoomIn()` - Zoom in by 20%
- `zoomOut()` - Zoom out by 20%
- `setZoom(level)` - Set zoom to a specific level
- `getZoom()` - Get the current zoom level

### View Control
- `home()` - Reset view to initial state
- `setFullScreen(fullScreen)` - Set fullscreen mode (true/false)
- `toggleFullScreen()` - Toggle fullscreen mode
- `isFullScreen()` - Check if in fullscreen mode

### Rotation
- `rotate(degrees)` - Rotate by specified degrees (relative)
- `setRotation(degrees)` - Set rotation to specific angle (absolute)
- `getRotation()` - Get current rotation angle

## Examples

### Basic IIIF Manifest

```html
<edirom-openseadragon 
    tilesources='["https://iiif.example.com/manifest.json"]'>
</edirom-openseadragon>
```

### Multi-Page Sequence with Controls

```html
<edirom-openseadragon 
    tilesources='["https://example.com/page1.json", "https://example.com/page2.json"]'
    sequencemode="true"
    showsequencecontrol="true"
    preserveviewport="true"
    pagenumber="1">
</edirom-openseadragon>
```

### Custom OpenSeadragon Configuration

```html
<edirom-openseadragon 
    tilesources='["https://example.com/image/info.json"]'
    openseadragon-options='{"gestureSettingsTouch": {"pinchRotate": true}, "animationTime": 0.5}'>
</edirom-openseadragon>
```

## IIIF Support

The component supports both IIIF manifests and direct image tile sources:

- **IIIF Manifests**: Automatically fetches and parses IIIF Presentation API manifests to extract image URLs
- **Direct Tile Sources**: Use IIIF Image API info.json URLs directly

## Events

The component fires custom events when attributes change:

- `communicate-zoom-update` - Fired when zoom level changes
- `communicate-rotation-update` - Fired when rotation changes
- `communicate-pagenumber-update` - Fired when page changes
- And more for each observable attribute

## Browser Support

The component uses modern web standards (Custom Elements, Shadow DOM) and requires a modern browser with ES6+ support




