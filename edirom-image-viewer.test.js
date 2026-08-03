'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

let initialAttributes = {};
let EdiromImageViewer;

class MockHTMLElement {
    constructor() {
        this._attributes = new Map(
            Object.entries(initialAttributes).map(([name, value]) => [name, String(value)])
        );
        this.tagName = 'EDIROM-IMAGE-VIEWER';
    }

    attachShadow() {
        this.shadowRoot = {
            appendChild() {},
            getElementById() { return null; }
        };
        return this.shadowRoot;
    }

    getAttribute(name) {
        return this._attributes.has(name) ? this._attributes.get(name) : null;
    }

    hasAttribute(name) {
        return this._attributes.has(name);
    }

    setAttribute(name, value) {
        this._attributes.set(name, String(value));
    }

    dispatchEvent() {}
}

function OpenSeadragon() {
    return {};
}

OpenSeadragon.Rect = class Rect {
    constructor(x, y, width, height) {
        Object.assign(this, { x, y, width, height });
    }
};

global.HTMLElement = MockHTMLElement;
global.OpenSeadragon = OpenSeadragon;
global.window = { OpenSeadragon };
global.tileSources = [];
global.customElements = {
    define(name, constructor) {
        if (name === 'edirom-image-viewer') EdiromImageViewer = constructor;
    }
};

require('./edirom-image-viewer.js');

function createViewer(attributes = {}) {
    initialAttributes = attributes;
    const viewer = new EdiromImageViewer();
    initialAttributes = {};
    return viewer;
}

function withoutConsole(method, callback) {
    const original = console[method];
    console[method] = () => {};
    try {
        return callback();
    } finally {
        console[method] = original;
    }
}

function createRegionViewer(width = 100, height = 200) {
    const viewer = createViewer();
    let fittedRect = null;
    let fittedImmediately = null;

    viewer.openSeaDragon = {
        world: {
            getItemCount: () => 1,
            getItemAt: () => ({
                getContentSize: () => ({ x: width, y: height })
            })
        },
        currentPage: () => 0,
        viewport: {
            imageToViewportRectangle: (rect) => rect,
            fitBounds(rect, immediately) {
                fittedRect = rect;
                fittedImmediately = immediately;
            }
        }
    };

    return {
        viewer,
        fittedRect: () => fittedRect,
        fittedImmediately: () => fittedImmediately
    };
}

test('applyRegionZoom clamps coordinates to the image extent', () => {
    const fixture = createRegionViewer();

    withoutConsole('log', () => fixture.viewer.applyRegionZoom({
        ulx: -10,
        uly: -20,
        lrx: 150,
        lry: 250
    }));

    assert.deepEqual({ ...fixture.fittedRect() }, {
        x: 0,
        y: 0,
        width: 100,
        height: 200
    });
});

test('applyRegionZoom swaps reversed corners', () => {
    const fixture = createRegionViewer();

    withoutConsole('log', () => fixture.viewer.applyRegionZoom({
        ulx: 90,
        uly: 180,
        lrx: 10,
        lry: 20
    }));

    assert.deepEqual({ ...fixture.fittedRect() }, {
        x: 10,
        y: 20,
        width: 80,
        height: 160
    });
});

test('applyRegionZoom enforces a minimum one-pixel region', () => {
    const fixture = createRegionViewer();

    withoutConsole('log', () => fixture.viewer.applyRegionZoom({
        ulx: 25,
        uly: 50,
        lrx: 25,
        lry: 50
    }));

    assert.deepEqual({ ...fixture.fittedRect() }, {
        x: 25,
        y: 50,
        width: 1,
        height: 1
    });
});

test('applyRegionZoom falls back to the full extent for NaN coordinates', () => {
    const fixture = createRegionViewer();

    withoutConsole('log', () => fixture.viewer.applyRegionZoom({
        ulx: 'invalid',
        uly: 'invalid',
        lrx: 'invalid',
        lry: 'invalid'
    }));

    assert.deepEqual({ ...fixture.fittedRect() }, {
        x: 0,
        y: 0,
        width: 100,
        height: 200
    });
});

test('applyRegionZoom forwards the immediate flag to fitBounds', () => {
    const fixture = createRegionViewer();

    withoutConsole('log', () => fixture.viewer.applyRegionZoom({
        ulx: 10,
        uly: 20,
        lrx: 30,
        lry: 40
    }, false));

    assert.equal(fixture.fittedImmediately(), false);
});

test('goToPage converts a 1-based page number to a 0-based index', () => {
    const viewer = createViewer();
    let targetIndex = null;
    viewer.openSeaDragon = {
        goToPage(index) { targetIndex = index; }
    };

    viewer.goToPage(3);

    assert.equal(targetIndex, 2);
});

test('getCurrentPage converts a 0-based index to a 1-based page number', () => {
    const viewer = createViewer();
    viewer.openSeaDragon = { currentPage: () => 2 };

    assert.equal(viewer.getCurrentPage(), 3);
});

test('getTotalPages uses tile sources in sequence mode', () => {
    const viewer = createViewer();
    viewer.sequencemode = 'true';
    viewer.openSeaDragon = {
        tileSources: ['one', 'two', 'three'],
        world: { getItemCount: () => 1 }
    };

    assert.equal(viewer.getTotalPages(), 3);
});

test('getTotalPages uses world item count in collection mode', () => {
    const viewer = createViewer();
    viewer.sequencemode = 'false';
    viewer.openSeaDragon = {
        tileSources: ['one', 'two', 'three'],
        world: { getItemCount: () => 4 }
    };

    assert.equal(viewer.getTotalPages(), 4);
});

test('parseRestrictZoneConfig parses valid numeric values', () => {
    const viewer = createViewer();

    assert.deepEqual(viewer.parseRestrictZoneConfig(JSON.stringify({
        pageNumber: '2',
        ulx: '10.5',
        uly: 20,
        lrx: 30,
        lry: 40
    })), {
        pageNumber: 2,
        ulx: 10.5,
        uly: 20,
        lrx: 30,
        lry: 40
    });
});

test('parseRestrictZoneConfig returns null for empty and malformed input', () => {
    const viewer = createViewer();

    assert.equal(viewer.parseRestrictZoneConfig(''), null);
    withoutConsole('error', () => {
        assert.equal(viewer.parseRestrictZoneConfig('{bad json'), null);
    });
});

test('parseOnlyRevealZones parses valid entries and removes invalid entries', () => {
    const viewer = createViewer();

    assert.deepEqual(viewer.parseOnlyRevealZones(JSON.stringify([
        { pageNumber: 1, ulx: 10, uly: 20, lrx: 30, lry: 40 },
        { pageNumber: 2, ulx: 'bad', uly: 20, lrx: 30, lry: 40 }
    ])), [
        { pageNumber: 1, ulx: 10, uly: 20, lrx: 30, lry: 40 }
    ]);
});

test('parseOnlyRevealZones returns an empty array for empty and malformed input', () => {
    const viewer = createViewer();

    assert.deepEqual(viewer.parseOnlyRevealZones(''), []);
    withoutConsole('error', () => {
        assert.deepEqual(viewer.parseOnlyRevealZones('{bad json'), []);
    });
});

test('constructor parses valid and empty openseadragon-options', () => {
    assert.deepEqual(
        createViewer({ 'openseadragon-options': '{"showNavigator":true}' }).options,
        { showNavigator: true }
    );
    assert.deepEqual(createViewer().options, {});
});

test('constructor falls back to empty options for invalid JSON', () => {
    withoutConsole('error', () => {
        assert.deepEqual(
            createViewer({ 'openseadragon-options': '{bad json' }).options,
            {}
        );
    });
});