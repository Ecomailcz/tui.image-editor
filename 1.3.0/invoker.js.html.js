tui.util.defineNamespace("fedoc.content", {});
fedoc.content["invoker.js.html"] = "      <div id=\"main\" class=\"main\">\n\n\n\n    \n    <section>\n        <article>\n            <pre class=\"prettyprint source linenums\"><code>/**\n * @author NHN Ent. FE Development Team &lt;dl_javascript@nhnent.com>\n * @fileoverview Invoker - invoke commands\n */\n'use strict';\n\nvar ImageLoader = require('./component/imageLoader');\nvar Cropper = require('./component/cropper');\nvar MainComponent = require('./component/main');\nvar Flip = require('./component/flip');\nvar Rotation = require('./component/rotation');\nvar FreeDrawing = require('./component/freeDrawing');\nvar Line = require('./component/line');\nvar Text = require('./component/text');\nvar Icon = require('./component/icon');\nvar Filter = require('./component/filter');\nvar eventNames = require('./consts').eventNames;\n\n/**\n * Invoker\n * @class\n */\nvar Invoker = tui.util.defineClass(/** @lends Invoker.prototype */{\n    init: function() {\n        /**\n         * Custom Events\n         * @type {tui.util.CustomEvents}\n         */\n        this._customEvents = new tui.util.CustomEvents();\n\n        /**\n         * Undo stack\n         * @type {Array.&lt;Command>}\n         * @private\n         */\n        this._undoStack = [];\n\n        /**\n         * Redo stack\n         * @type {Array.&lt;Command>}\n         * @private\n         */\n        this._redoStack = [];\n\n        /**\n         * Component map\n         * @type {Object.&lt;string, Component>}\n         * @private\n         */\n        this._componentMap = {};\n\n        /**\n         * Lock-flag for executing command\n         * @type {boolean}\n         * @private\n         */\n        this._isLocked = false;\n\n        this._createComponents();\n    },\n\n    /**\n     * Create components\n     * @private\n     */\n    _createComponents: function() {\n        var main = new MainComponent();\n\n        this._register(main);\n        this._register(new ImageLoader(main));\n        this._register(new Cropper(main));\n        this._register(new Flip(main));\n        this._register(new Rotation(main));\n        this._register(new FreeDrawing(main));\n        this._register(new Line(main));\n        this._register(new Text(main));\n        this._register(new Icon(main));\n        this._register(new Filter(main));\n    },\n\n    /**\n     * Register component\n     * @param {Component} component - Component handling the canvas\n     * @private\n     */\n    _register: function(component) {\n        this._componentMap[component.getName()] = component;\n    },\n\n    /**\n     * Invoke command execution\n     * @param {Command} command - Command\n     * @returns {jQuery.Deferred}\n     * @private\n     */\n    _invokeExecution: function(command) {\n        var self = this;\n\n        this.lock();\n\n        return $.when(command.execute(this._componentMap))\n            .done(function() {\n                self.pushUndoStack(command);\n            })\n            .done(command.executeCallback)\n            .always(function() {\n                self.unlock();\n            });\n    },\n\n    /**\n     * Invoke command undo\n     * @param {Command} command - Command\n     * @returns {jQuery.Deferred}\n     * @private\n     */\n    _invokeUndo: function(command) {\n        var self = this;\n\n        this.lock();\n\n        return $.when(command.undo(this._componentMap))\n            .done(function() {\n                self.pushRedoStack(command);\n            })\n            .done(command.undoCallback)\n            .always(function() {\n                self.unlock();\n            });\n    },\n\n    /**\n     * Fire custom events\n     * @see {@link tui.util.CustomEvents.prototype.fire}\n     * @param {...*} arguments - Arguments to fire a event\n     * @private\n     */\n    _fire: function() {\n        var event = this._customEvents;\n        event.fire.apply(event, arguments);\n    },\n\n    /**\n     * Attach custom events\n     * @see {@link tui.util.CustomEvents.prototype.on}\n     * @param {...*} arguments - Arguments to attach events\n     */\n    on: function() {\n        var event = this._customEvents;\n        event.on.apply(event, arguments);\n    },\n\n    /**\n     * Get component\n     * @param {string} name - Component name\n     * @returns {Component}\n     */\n    getComponent: function(name) {\n        return this._componentMap[name];\n    },\n\n    /**\n     * Lock this invoker\n     */\n    lock: function() {\n        this._isLocked = true;\n    },\n\n    /**\n     * Unlock this invoker\n     */\n    unlock: function() {\n        this._isLocked = false;\n    },\n\n    /**\n     * Invoke command\n     * Store the command to the undoStack\n     * Clear the redoStack\n     * @param {Command} command - Command\n     * @returns {jQuery.Deferred}\n     */\n    invoke: function(command) {\n        if (this._isLocked) {\n            return $.Deferred.reject();\n        }\n\n        return this._invokeExecution(command)\n            .done($.proxy(this.clearRedoStack, this));\n    },\n\n    /**\n     * Undo command\n     * @returns {jQuery.Deferred}\n     */\n    undo: function() {\n        var command = this._undoStack.pop();\n        var jqDefer;\n\n        if (command &amp;&amp; this._isLocked) {\n            this.pushUndoStack(command, true);\n            command = null;\n        }\n        if (command) {\n            if (this.isEmptyUndoStack()) {\n                this._fire(eventNames.EMPTY_UNDO_STACK);\n            }\n            jqDefer = this._invokeUndo(command);\n        } else {\n            jqDefer = $.Deferred().reject();\n        }\n\n        return jqDefer;\n    },\n\n    /**\n     * Redo command\n     * @returns {jQuery.Deferred}\n     */\n    redo: function() {\n        var command = this._redoStack.pop();\n        var jqDefer;\n\n        if (command &amp;&amp; this._isLocked) {\n            this.pushRedoStack(command, true);\n            command = null;\n        }\n        if (command) {\n            if (this.isEmptyRedoStack()) {\n                this._fire(eventNames.EMPTY_REDO_STACK);\n            }\n            jqDefer = this._invokeExecution(command);\n        } else {\n            jqDefer = $.Deferred().reject();\n        }\n\n        return jqDefer;\n    },\n\n    /**\n     * Push undo stack\n     * @param {Command} command - command\n     * @param {boolean} [isSilent] - Fire event or not\n     */\n    pushUndoStack: function(command, isSilent) {\n        this._undoStack.push(command);\n        if (!isSilent) {\n            this._fire(eventNames.PUSH_UNDO_STACK);\n        }\n    },\n\n    /**\n     * Push redo stack\n     * @param {Command} command - command\n     * @param {boolean} [isSilent] - Fire event or not\n     */\n    pushRedoStack: function(command, isSilent) {\n        this._redoStack.push(command);\n        if (!isSilent) {\n            this._fire(eventNames.PUSH_REDO_STACK);\n        }\n    },\n\n    /**\n     * Return whether the redoStack is empty\n     * @returns {boolean}\n     */\n    isEmptyRedoStack: function() {\n        return this._redoStack.length === 0;\n    },\n\n    /**\n     * Return whether the undoStack is empty\n     * @returns {boolean}\n     */\n    isEmptyUndoStack: function() {\n        return this._undoStack.length === 0;\n    },\n\n    /**\n     * Clear undoStack\n     */\n    clearUndoStack: function() {\n        if (!this.isEmptyUndoStack()) {\n            this._undoStack = [];\n            this._fire(eventNames.EMPTY_UNDO_STACK);\n        }\n    },\n\n    /**\n     * Clear redoStack\n     */\n    clearRedoStack: function() {\n        if (!this.isEmptyRedoStack()) {\n            this._redoStack = [];\n            this._fire(eventNames.EMPTY_REDO_STACK);\n        }\n    }\n});\n\nmodule.exports = Invoker;\n</code></pre>\n        </article>\n    </section>\n\n\n\n</div>\n\n"