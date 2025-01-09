"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersRoutes = void 0;
const common_routes_config_1 = require("../common/common.routes.config");
const facturacionelectronicapy_xmlgen_1 = __importDefault(require("facturacionelectronicapy-xmlgen"));
const facturacionelectronicapy_xmlsign_1 = __importDefault(require("facturacionelectronicapy-xmlsign"));
const facturacionelectronicapy_qrgen_1 = __importDefault(require("facturacionelectronicapy-qrgen"));
const kude_1 = require("./kude");
const toJSON_1 = require("./toJSON");
require('dotenv').config();
const xml2js = require('xml2js');
const dayjs = require('dayjs');
const fs = require('fs');
const fechaActual = dayjs().format('YYYY-MM-DDTHH:mm:ss');
let idcsc = process.env.IDCSC;
let csc = process.env.CSC;
let ambiente = process.env.AMBIENTE;
let certificado = process.env.P12_FILE_PATH;
let password = process.env.P12_PASSWORD;
let paramstring = process.env.PARAMS;
let params = JSON.parse(fs.readFileSync(paramstring, 'utf8'));
let kuDeBinary = 1;
class UsersRoutes extends common_routes_config_1.CommonRoutesConfig {
    constructor(app) {
        super(app, 'UsersRoutes');
    }
    configureRoutes() {
        this.app.route(`/kude`)
            .get((req, res) => {
            res.status(200).send(`GET en kude`);
        })
            .post(async (req, res) => {
            const data = req.body;
            params.fechaFirmaDigital = fechaActual;
            //test: true --> Hbilita para probar en test el cambio en la nota tecnica 13
            let config = {
                defaultValues: true,
                errorSeparator: '; ',
                errorLimit: 10,
                redondeoSedeco: false,
                decimals: 2,
                taxDecimals: 2,
                pygDecimals: 0,
                partialTaxDecimals: 8,
                pygTaxDecimals: 0,
                userObjectRemove: false,
                test: false
            };
            if (data.hasOwnProperty('documentoAsociado') && Array.isArray(data.documentoAsociado) && data.documentoAsociado.length === 1 && data.documentoAsociado[0] === false) {
                // Si la condición es verdadera, cambia el valor de documentoAsociado a null
                data.documentoAsociado = null;
            }
            await facturacionelectronicapy_xmlgen_1.default.generateXMLDE(params, data, config).then(async (xml) => {
                await facturacionelectronicapy_xmlsign_1.default.signXML(xml, certificado, password, true).then(async (xmlFirmado) => {
                    await facturacionelectronicapy_qrgen_1.default.generateQR(xmlFirmado, idcsc, csc, ambiente).then(async (xmlQR) => {
                        const result = await xml2js.parseStringPromise(xmlQR, { mergeAttrs: true });
                        const jsonDE = JSON.stringify(result, null, 4);
                        const cjson = (0, toJSON_1.toJSON)(JSON.parse(jsonDE));
                        const data = JSON.parse(cjson);
                        //return res.status(200).json({"qr": data.qr})                            
                        if (req.body.conceptoEscribania) { // agregamos concepto Escribania si existe
                            data.conceptoEscribania = req.body.conceptoEscribania;
                        }
                        if (req.body.items2) { // agregamos items2 si existe
                            data.items2 = req.body.items2;
                        }
                        (0, kude_1.generarKude)(data, res, params, kuDeBinary)
                            .catch((e) => {
                            return res.status(400).json({ "mensaje": e.message });
                        });
                    }).catch((erro) => {
                        return res.status(400).json({ "mensaje": erro.message });
                    });
                }).catch((erro) => {
                    return res.status(400).json({ "mensaje": erro.message });
                });
            }).catch((erro) => {
                return res.status(400).json({ "mensaje": erro.message });
            });
        });
        return this.app;
    }
}
exports.UsersRoutes = UsersRoutes;
//# sourceMappingURL=users.routes.config.js.map