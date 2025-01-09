"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonRoutesConfig = void 0;
class CommonRoutesConfig {
    app;
    name;
    constructor(app, name) {
        this.app = app;
        this.name = name;
        this.configureRoutes();
    }
    getName() {
        return this.name;
    }
}
exports.CommonRoutesConfig = CommonRoutesConfig;
//# sourceMappingURL=common.routes.config.js.map