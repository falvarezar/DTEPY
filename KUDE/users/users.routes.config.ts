import { CommonRoutesConfig } from '../common/common.routes.config';
import express from 'express';
import xmlgen from 'facturacionelectronicapy-xmlgen'
import xmlsign from 'facturacionelectronicapy-xmlsign'
import qrgen from 'facturacionelectronicapy-qrgen'
import { generarKude } from './kude'
import { toJSON } from './toJSON'
require('dotenv').config();
const xml2js = require('xml2js');
const dayjs = require('dayjs');
const fs = require('fs');

const fechaActual = dayjs().format('YYYY-MM-DDTHH:mm:ss');
let idcsc: any = process.env.IDCSC
let csc: any = process.env.CSC
let ambiente: any = process.env.AMBIENTE
let certificado = process.env.P12_FILE_PATH;
let password = process.env.P12_PASSWORD;
let paramstring = process.env.PARAMS;
let params = JSON.parse(fs.readFileSync(paramstring, 'utf8'));
let kuDeBinary = 1

export class UsersRoutes extends CommonRoutesConfig {
    constructor(app: express.Application) {
        super(app, 'UsersRoutes');
    }

    configureRoutes() {
        this.app.route(`/kude`)
            .get((req: express.Request, res: express.Response) => {
                res.status(200).send(`GET en kude`);
            })
            .post(async (req: express.Request, res: express.Response) => {
                const data = req.body
                params.fechaFirmaDigital = fechaActual

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
                }

                if (data.hasOwnProperty('documentoAsociado') && Array.isArray(data.documentoAsociado) && data.documentoAsociado.length === 1 && data.documentoAsociado[0] === false) {
                    // Si la condición es verdadera, cambia el valor de documentoAsociado a null
                    data.documentoAsociado = null;
                }
                
                await xmlgen.generateXMLDE(params, data, config).then(async (xml) => {
                    await xmlsign.signXML(xml, certificado, password, true).then(async (xmlFirmado: string) => {
                        await qrgen.generateQR(xmlFirmado, idcsc, csc, ambiente).then(async xmlQR => {
                            const result = await xml2js.parseStringPromise(xmlQR, { mergeAttrs: true })
                            const jsonDE = JSON.stringify(result, null, 4)
                            const cjson = toJSON(JSON.parse(jsonDE))
                            const data = JSON.parse(cjson)
                            //return res.status(200).json({"qr": data.qr})                            

                            if (req.body.conceptoEscribania) {  // agregamos concepto Escribania si existe
                                data.conceptoEscribania = req.body.conceptoEscribania
                            }
                            if (req.body.items2) {  // agregamos items2 si existe
                                data.items2 = req.body.items2
                            }

                            generarKude(data, res, params, kuDeBinary)
                                .catch((e) => {
                                    return res.status(400).json({ "mensaje": e.message })
                                })
                        }).catch((erro) => {
                            return res.status(400).json({ "mensaje": erro.message })
                        });
                    }).catch((erro) => {
                        return res.status(400).json({ "mensaje": erro.message })
                    });
                }).catch((erro) => {
                    return res.status(400).json({ "mensaje": erro.message })
                });
            });


        return this.app;
    }

}