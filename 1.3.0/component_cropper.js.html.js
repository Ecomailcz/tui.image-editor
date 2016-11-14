tui.util.defineNamespace("fedoc.content", {});
fedoc.content["component_cropper.js.html"] = "      <div id=\"main\" class=\"main\">\n\n\n\n    \n    <section>\n        <article>\n            <pre class=\"prettyprint source linenums\"><code>/**\n * @author NHN Ent. FE Development Team &lt;dl_javascript@nhnent.com>\n * @fileoverview Image crop module (start cropping, end cropping)\n */\n'use strict';\nvar Component = require('../interface/component');\nvar Cropzone = require('../extension/cropzone');\nvar consts = require('../consts');\nvar util = require('../util');\n\nvar MOUSE_MOVE_THRESHOLD = 10;\n\nvar abs = Math.abs;\nvar clamp = util.clamp;\nvar keyCodes = consts.keyCodes;\n\n/**\n * Cropper components\n * @param {Component} parent - parent component\n * @extends {Component}\n * @class Cropper\n */\nvar Cropper = tui.util.defineClass(Component, /** @lends Cropper.prototype */{\n    init: function(parent) {\n        this.setParent(parent);\n\n        /**\n         * Cropzone\n         * @type {Cropzone}\n         * @private\n         */\n        this._cropzone = null;\n\n        /**\n         * StartX of Cropzone\n         * @type {number}\n         * @private\n         */\n        this._startX = null;\n\n        /**\n         * StartY of Cropzone\n         * @type {number}\n         * @private\n         */\n        this._startY = null;\n\n        /**\n         * State whether shortcut key is pressed or not\n         * @type {boolean}\n         * @private\n         */\n        this._withShiftKey = false;\n\n        /**\n         * Listeners\n         * @type {object.&lt;string, function>}\n         * @private\n         */\n        this._listeners = {\n            keydown: $.proxy(this._onKeyDown, this),\n            keyup: $.proxy(this._onKeyUp, this),\n            mousedown: $.proxy(this._onFabricMouseDown, this),\n            mousemove: $.proxy(this._onFabricMouseMove, this),\n            mouseup: $.proxy(this._onFabricMouseUp, this)\n        };\n    },\n\n    /**\n     * Component name\n     * @type {string}\n     */\n    name: consts.componentNames.CROPPER,\n\n    /**\n     * Start cropping\n     */\n    start: function() {\n        var canvas;\n\n        if (this._cropzone) {\n            return;\n        }\n        canvas = this.getCanvas();\n        canvas.forEachObject(function(obj) { // {@link http://fabricjs.com/docs/fabric.Object.html#evented}\n            obj.evented = false;\n        });\n        this._cropzone = new Cropzone({\n            left: -10,\n            top: -10,\n            width: 1,\n            height: 1,\n            strokeWidth: 0, // {@link https://github.com/kangax/fabric.js/issues/2860}\n            cornerSize: 10,\n            cornerColor: 'black',\n            fill: 'transparent',\n            hasRotatingPoint: false,\n            hasBorders: false,\n            lockScalingFlip: true,\n            lockRotation: true\n        });\n        canvas.deactivateAll();\n        canvas.add(this._cropzone);\n        canvas.on('mouse:down', this._listeners.mousedown);\n        canvas.selection = false;\n        canvas.defaultCursor = 'crosshair';\n\n        fabric.util.addListener(document, 'keydown', this._listeners.keydown);\n        fabric.util.addListener(document, 'keyup', this._listeners.keyup);\n    },\n\n    /**\n     * End cropping\n     * @param {boolean} isApplying - Is applying or not\n     * @returns {?{imageName: string, url: string}} cropped Image data\n     */\n    end: function(isApplying) {\n        var canvas = this.getCanvas();\n        var cropzone = this._cropzone;\n        var data;\n\n        if (!cropzone) {\n            return null;\n        }\n        cropzone.remove();\n        canvas.selection = true;\n        canvas.defaultCursor = 'default';\n        canvas.off('mouse:down', this._listeners.mousedown);\n        canvas.forEachObject(function(obj) {\n            obj.evented = true;\n        });\n        if (isApplying) {\n            data = this._getCroppedImageData();\n        }\n        this._cropzone = null;\n\n        fabric.util.removeListener(document, 'keydown', this._listeners.keydown);\n        fabric.util.removeListener(document, 'keyup', this._listeners.keyup);\n\n        return data;\n    },\n\n    /**\n     * onMousedown handler in fabric canvas\n     * @param {{target: fabric.Object, e: MouseEvent}} fEvent - Fabric event\n     * @private\n     */\n    _onFabricMouseDown: function(fEvent) {\n        var canvas = this.getCanvas();\n        var coord;\n\n        if (fEvent.target) {\n            return;\n        }\n\n        canvas.selection = false;\n        coord = canvas.getPointer(fEvent.e);\n\n        this._startX = coord.x;\n        this._startY = coord.y;\n\n        canvas.on({\n            'mouse:move': this._listeners.mousemove,\n            'mouse:up': this._listeners.mouseup\n        });\n    },\n\n    /**\n     * onMousemove handler in fabric canvas\n     * @param {{target: fabric.Object, e: MouseEvent}} fEvent - Fabric event\n     * @private\n     */\n    _onFabricMouseMove: function(fEvent) {\n        var canvas = this.getCanvas();\n        var pointer = canvas.getPointer(fEvent.e);\n        var x = pointer.x;\n        var y = pointer.y;\n        var cropzone = this._cropzone;\n\n        if (abs(x - this._startX) + abs(y - this._startY) > MOUSE_MOVE_THRESHOLD) {\n            cropzone.remove();\n            cropzone.set(this._calcRectDimensionFromPoint(x, y));\n\n            canvas.add(cropzone);\n        }\n    },\n\n    /**\n     * Get rect dimension setting from Canvas-Mouse-Position(x, y)\n     * @param {number} x - Canvas-Mouse-Position x\n     * @param {number} y - Canvas-Mouse-Position Y\n     * @returns {{left: number, top: number, width: number, height: number}}\n     * @private\n     */\n    _calcRectDimensionFromPoint: function(x, y) {\n        var canvas = this.getCanvas();\n        var canvasWidth = canvas.getWidth();\n        var canvasHeight = canvas.getHeight();\n        var startX = this._startX;\n        var startY = this._startY;\n        var left = clamp(x, 0, startX);\n        var top = clamp(y, 0, startY);\n        var width = clamp(x, startX, canvasWidth) - left; // (startX &lt;= x(mouse) &lt;= canvasWidth) - left\n        var height = clamp(y, startY, canvasHeight) - top; // (startY &lt;= y(mouse) &lt;= canvasHeight) - top\n\n        if (this._withShiftKey) { // make fixed ratio cropzone\n            if (width > height) {\n                height = width;\n            } else if (height > width) {\n                width = height;\n            }\n\n            if (startX >= x) {\n                left = startX - width;\n            }\n\n            if (startY >= y) {\n                top = startY - height;\n            }\n        }\n\n        return {\n            left: left,\n            top: top,\n            width: width,\n            height: height\n        };\n    },\n\n    /**\n     * onMouseup handler in fabric canvas\n     * @private\n     */\n    _onFabricMouseUp: function() {\n        var cropzone = this._cropzone;\n        var listeners = this._listeners;\n        var canvas = this.getCanvas();\n\n        canvas.setActiveObject(cropzone);\n        canvas.off({\n            'mouse:move': listeners.mousemove,\n            'mouse:up': listeners.mouseup\n        });\n    },\n\n    /**\n     * Get cropped image data\n     * @returns {?{imageName: string, url: string}} cropped Image data\n     * @private\n     */\n    _getCroppedImageData: function() {\n        var cropzone = this._cropzone;\n        var cropInfo;\n\n        if (!cropzone.isValid()) {\n            return null;\n        }\n\n        cropInfo = {\n            left: cropzone.getLeft(),\n            top: cropzone.getTop(),\n            width: cropzone.getWidth(),\n            height: cropzone.getHeight()\n        };\n\n        return {\n            imageName: this.getImageName(),\n            url: this.getCanvas().toDataURL(cropInfo)\n        };\n    },\n\n    /**\n     * Keydown event handler\n     * @param {KeyboardEvent} e - Event object\n     * @private\n     */\n    _onKeyDown: function(e) {\n        if (e.keyCode === keyCodes.SHIFT) {\n            this._withShiftKey = true;\n        }\n    },\n\n    /**\n     * Keyup event handler\n     * @param {KeyboardEvent} e - Event object\n     * @private\n     */\n    _onKeyUp: function(e) {\n        if (e.keyCode === keyCodes.SHIFT) {\n            this._withShiftKey = false;\n        }\n    }\n});\n\nmodule.exports = Cropper;\n</code></pre>\n        </article>\n    </section>\n\n\n\n</div>\n\n"