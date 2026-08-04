'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

let EdiromImageViewer;

class MockEventTarget {
    constructor() {
        this.listeners = new Map();
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) || new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
    }

    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }

    dispatchEvent(event) {
        event.target ||= this;
        for (const listener of this.listeners.get(event.type) || []) listener.call(this, event);
        return true;
    }

    listenerCount(type) {
        return this.listeners.get(type)?.size || 0;
    }
}

class MockElement extends MockEventTarget {
    constructor(tagName = '') {
        super();
        this.tagName = tagName.toUpperCase();
        this.children = [];
        this.style = {};
        this.attributes = new Map();
        this.id = '';
        this.innerHTML = '';
        this.textContent = '';
    }

    appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
        return child;
    }

    removeChild(child) {
        this.children = this.children.filter((candidate) => candidate !== child);
        child.parentNode = null;
        return child;
    }

    getElementById(id) {
        for (const child of this.children) {
            if (child.id === id) return child;
            const descendant = child.getElementById?.(id);
            if (descendant) return descendant;
        }
        return null;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
        if (name === 'id') this.id = String(value);
    }

    getAttribute(name) {
        return this.attributes.has(name) ? this.attributes.get(name) : null;
    }

    hasAttribute(name) {
        return this.attributes.has(name);
    }

    blur() {}
}

class MockHTMLElement extends MockElement {
    constructor() {
        super('edirom-image-viewer');
    }

    attachShadow() {
        this.shadowRoot = new MockElement('shadow-root');
        return this.shadowRoot;
    }

    setAttribute(name, value) {
        const oldValue = this.getAttribute(name);
        const newValue = String(value);
        super.setAttribute(name, newValue);
        if (oldValue !== newValue && this.constructor.observedAttributes.includes(name)) {
            this.attributeChangedCallback(name, oldValue, newValue);
        }
    }
}

class MockCustomEvent {
    constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
        this.bubbles = Boolean(options.bubbles);
    }
}

class MockDocument extends MockEventTarget {
    constructor() {
        super();
        this.fullscreenElement = null;
        this.head = new MockElement('head');
        this.head.querySelectorAll = () => [];
        this.body = new MockElement('body');
        this.body.appendChild = (child) => {
            MockElement.prototype.appendChild.call(this.body, child);
            child.connectedCallback?.();
            return child;
        };
        this.body.removeChild = (child) => {
            MockElement.prototype.removeChild.call(this.body, child);
            child.disconnectedCallback?.();
            return child;
        };
    }

    createElement(tagName) {
        return new MockElement(tagName);
    }

    getElementById(id) {
        return this.head.getElementById(id) || this.body.getElementById(id);
    }
}

function OpenSeadragon() {
    throw new Error('OpenSeadragon should not be constructed directly in contract tests');
}
OpenSeadragon.Rect = class Rect {
    constructor(x, y, width, height) {
        Object.assign(this, { x, y, width, height });
    }
};

const documentMock = new MockDocument();
global.HTMLElement = MockHTMLElement;
global.CustomEvent = MockCustomEvent;
global.document = documentMock;
global.window = { OpenSeadragon };
global.OpenSeadragon = OpenSeadragon;
global.customElements = {
    define(name, constructor) {
        if (name === 'edirom-image-viewer') EdiromImageViewer = constructor;
    }
};

require('./edirom-image-viewer.js');

function withoutConsole(method, callback) {
    const original = console[method];
    console[method] = () => {};
    try {
        return callback();
    } finally {
        console[method] = original;
    }
}

function mountViewer() {
    const viewer = new EdiromImageViewer();
    withoutConsole('log', () => document.body.appendChild(viewer));
    return viewer;
}

function unmountViewer(viewer) {
    if (viewer.parentNode === document.body) document.body.removeChild(viewer);
}

function click(element) {
    element.dispatchEvent({ type: 'click', preventDefault() {} });
}

test('attributeChangedCallback dispatches a bubbling communicate-property-update event', () => {
    const viewer = mountViewer();
    let received;
    viewer.addEventListener('communicate-zoom-update', (event) => {
        received = event;
    });

    viewer.setAttribute('zoom', '2.5');

    assert.deepEqual(received.detail, { zoom: '2.5' });
    assert.equal(received.bubbles, true);
    unmountViewer(viewer);
});

test('setting tilesources delegates viewer rebuilding and announces the total', () => {
    const viewer = mountViewer();
    let rebuildCalls = 0;
    let totalPages;
    viewer.displayOpenSeadragon = () => rebuildCalls++;
    viewer.addEventListener('total-pages-changed', (event) => {
        totalPages = event.detail.totalPages;
    });

    viewer.setAttribute('tilesources', '["one.json","two.json"]');

    assert.equal(rebuildCalls, 1);
    assert.equal(totalPages, 2);
    unmountViewer(viewer);
});

test('setting openseadragon-options parses options and rebuilds an active viewer', () => {
    const viewer = mountViewer();
    let rebuildCalls = 0;
    viewer.openSeaDragon = {};
    viewer.displayOpenSeadragon = () => rebuildCalls++;

    viewer.setAttribute('openseadragon-options', '{"showNavigator":false}');

    assert.equal(rebuildCalls, 1);
    assert.deepEqual(viewer.options, { showNavigator: false });
    unmountViewer(viewer);
});

test('trigger attributes invoke home and toggleFullScreen', () => {
    const viewer = mountViewer();
    let homeCalls = 0;
    let fullscreenCalls = 0;
    viewer.home = () => homeCalls++;
    viewer.toggleFullScreen = () => fullscreenCalls++;

    viewer.setAttribute('triggerhome', 'true');
    viewer.setAttribute('triggerfullscreen', 'true');

    assert.equal(homeCalls, 1);
    assert.equal(fullscreenCalls, 1);
    unmountViewer(viewer);
});

test('clicktozoom updates gestureSettingsMouse without recreating the viewer', () => {
    const viewer = mountViewer();
    const osdViewer = { gestureSettingsMouse: { clickToZoom: true } };
    let rebuildCalls = 0;
    viewer.openSeaDragon = osdViewer;
    viewer.displayOpenSeadragon = () => rebuildCalls++;

    viewer.setAttribute('clicktozoom', 'false');
    assert.equal(osdViewer.gestureSettingsMouse.clickToZoom, false);

    viewer.setAttribute('clicktozoom', 'true');
    assert.equal(osdViewer.gestureSettingsMouse.clickToZoom, true);
    assert.equal(rebuildCalls, 0);
    assert.equal(viewer.openSeaDragon, osdViewer);
    unmountViewer(viewer);
});

test('zones-data updates the universal zone lookup map', () => {
    const viewer = mountViewer();
    const zones = {
        'measure:1': { type: 'measure', page: 1, ulx: 10, uly: 20, lrx: 30, lry: 40 }
    };

    viewer.setAttribute('zones-data', JSON.stringify(zones));

    assert.deepEqual(viewer._zonesData, zones);
    unmountViewer(viewer);
});

test('zone strips a nonce and delegates navigation by key', () => {
    const viewer = mountViewer();
    let appliedKey;
    viewer._applyZoneByKey = (key) => { appliedKey = key; };

    viewer.setAttribute('zone', 'measure:1|42');

    assert.equal(appliedKey, 'measure:1');
    unmountViewer(viewer);
});

test('connectedCallback creates the viewer container and OpenSeadragon script', () => {
    const viewer = mountViewer();

    assert.ok(viewer.shadowRoot.getElementById('viewer'));
    assert.ok(document.getElementById('osd-script'));
    unmountViewer(viewer);
});
