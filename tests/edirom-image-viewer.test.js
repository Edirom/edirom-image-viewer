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
global.document = { currentScript: null };
global.tileSources = [];
global.customElements = {
    define(name, constructor) {
        if (name === 'edirom-image-viewer') EdiromImageViewer = constructor;
    }
};

require('../edirom-image-viewer.js');

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

function createRegionViewer() {
    const viewer = createViewer();
    let fittedRect = null;
    let fittedImmediately = null;
    let wentHomeImmediately = null;

    viewer.openSeaDragon = {
        world: {
            getItemAt: () => ({
                imageToViewportRectangle: (x, y, width, height) => ({ x, y, width, height })
            })
        },
        viewport: {
            fitBounds(rect, immediately) {
                fittedRect = rect;
                fittedImmediately = immediately;
            },
            goHome(immediately) {
                wentHomeImmediately = immediately;
            }
        }
    };

    return {
        viewer,
        fittedRect: () => fittedRect,
        fittedImmediately: () => fittedImmediately,
        wentHomeImmediately: () => wentHomeImmediately
    };
}

test('_applyZone converts image coordinates and fits with animation', () => {
    const fixture = createRegionViewer();

    fixture.viewer._applyZone({ ulx: 10, uly: 20, lrx: 30, lry: 50 });

    assert.deepEqual(fixture.fittedRect(), {
        x: 10,
        y: 20,
        width: 20,
        height: 30
    });
    assert.equal(fixture.fittedImmediately(), undefined);
});

test('_applyZone goes home with animation when coordinates are absent', () => {
    const fixture = createRegionViewer();

    fixture.viewer._applyZone({ page: 1 });

    assert.equal(fixture.wentHomeImmediately(), undefined);
    assert.equal(fixture.fittedRect(), null);
});

test('_navigateToRegion changes to the target page and defers the zone', () => {
    const viewer = createViewer();
    let targetPage = null;
    const zone = { page: 3, ulx: 1, uly: 2, lrx: 3, lry: 4 };
    viewer.openSeaDragon = {
        currentPage: () => 0,
        goToPage(page) { targetPage = page; }
    };

    viewer._navigateToRegion(zone, 'measure:3', 'zone-changed');

    assert.equal(targetPage, 2);
    assert.deepEqual(viewer._pendingZoneAfterPageChange, {
        zoneKey: 'measure:3',
        zone,
        eventName: 'zone-changed'
    });
});

test('goToPage converts a 1-based page number to a 0-based index', () => {
    const viewer = createViewer();
    let targetIndex = null;
    viewer.openSeaDragon = {
        tileSources: ['one', 'two', 'three'],
        goToPage(index) { targetIndex = index; }
    };

    viewer.goToPage(3);

    assert.equal(targetIndex, 2);
});

test('goToPage ignores page numbers outside the available range', () => {
    const viewer = createViewer();
    let called = false;
    viewer.openSeaDragon = {
        tileSources: ['one', 'two'],
        goToPage() { called = true; }
    };

    viewer.goToPage(0);
    viewer.goToPage(3);

    assert.equal(called, false);
});

test('getCurrentPage converts a 0-based index to a 1-based page number', () => {
    const viewer = createViewer();
    viewer.openSeaDragon = { currentPage: () => 2 };

    assert.equal(viewer.getCurrentPage(), 3);
});

test('getTotalPages uses configured tile sources when available', () => {
    const viewer = createViewer();
    viewer.openSeaDragon = {
        tileSources: ['one', 'two', 'three'],
        world: { getItemCount: () => 1 }
    };

    assert.equal(viewer.getTotalPages(), 3);
});

test('getTotalPages falls back to the world item count', () => {
    const viewer = createViewer();
    viewer.openSeaDragon = {
        world: { getItemCount: () => 4 }
    };

    assert.equal(viewer.getTotalPages(), 4);
});

test('zones-data parses a valid zone map', () => {
    const viewer = createViewer();
    const zones = {
        'measure:1': { type: 'measure', page: 1, ulx: 10, uly: 20, lrx: 30, lry: 40 }
    };

    viewer.handlePropertyChange('zones-data', JSON.stringify(zones));

    assert.deepEqual(viewer._zonesData, zones);
});

test('zones-data falls back to an empty map for malformed JSON', () => {
    const viewer = createViewer();

    withoutConsole('error', () => {
        viewer.handlePropertyChange('zones-data', '{bad json');
    });

    assert.deepEqual(viewer._zonesData, {});
});

test('visible-types parses valid values and resets malformed values', () => {
    const viewer = createViewer();

    viewer.handlePropertyChange('visible-types', '["annotation","measure"]');
    assert.deepEqual(viewer._visibleTypes, ['annotation', 'measure']);

    withoutConsole('error', () => {
        viewer.handlePropertyChange('visible-types', '{bad json');
    });
    assert.deepEqual(viewer._visibleTypes, []);
});

test('_zoneHiddenByFilter matches any configured hidden token', () => {
    const viewer = createViewer();
    viewer._hiddenFilters = ['priority:low', 'category:editorial'];

    assert.equal(viewer._zoneHiddenByFilter(['category:editorial']), true);
    assert.equal(viewer._zoneHiddenByFilter(['category:music']), false);
});

test('setZoom clamps the requested level to viewport limits', () => {
    const viewer = createViewer();
    let appliedZoom = null;
    viewer.openSeaDragon = {
        viewport: {
            getMinZoom: () => 0.5,
            getMaxZoom: () => 4,
            zoomTo(zoom) { appliedZoom = zoom; }
        }
    };

    viewer.setZoom(10);

    assert.equal(appliedZoom, 4);
});

test('constructor parses valid and empty openseadragon-options', () => {
    assert.deepEqual(
        createViewer({ 'openseadragon-options': '{"showNavigator":true}' }).options,
        { showNavigator: true }
    );
    assert.deepEqual(createViewer().options, {});
});

test('constructor rejects malformed openseadragon-options JSON', () => {
    assert.throws(
        () => createViewer({ 'openseadragon-options': '{bad json' }),
        SyntaxError
    );
});