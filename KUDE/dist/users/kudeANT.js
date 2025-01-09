"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarKude = void 0;
const PDFDocument = require("pdfkit");
const fs = require('fs');
const qr = require('qr-image');
const dayjs = require('dayjs');
var leftMargin = 20, topMargin = 20, rightMargin = 20, qrHeight = 100, defaultFont = 'Helvetica';
var pageWidth = 0, pageHeight = 0, pieHeight = 0, rightWidth = 0, lTicket = false;
function generarKude(data, res, params /*, xmlQR: any*/, kuDeBinary /*, today: any, resp: any, cMailConf: any*/) {
    return __awaiter(this, void 0, void 0, function* () {
        lTicket = params.establecimientos[0].tipohoja == 2; // TOCAR: tiene que ser establecimientos con S plural
        let cRuc = params.ruc;
        let doc = new PDFDocument({ size: lTicket ? [215, 1200] : 'LEGAL' /*, bufferPages: lTicket */ });
        doc.page.margins.bottom = 10;
        if (lTicket) { // si es ticket
            leftMargin = 2, topMargin = 10, rightMargin = 2, qrHeight = 100;
        }
        pageWidth = doc.page.width;
        pageHeight = doc.page.height;
        rightWidth = (pageWidth - leftMargin - rightMargin) / (lTicket ? 1 : 2); // es el width maximo para los textos que se imprimen en la "segunda columna"
        let cTipoDoc = data.iTiDE;
        try {
            lTicket ? cabeceraTicket(doc, data, cRuc, params) : cabecera(doc, data, cRuc, params);
            if (['1', '5', '6'].includes(cTipoDoc)) { //si es FE, NC o ND entonces llamo a la funcion clientes
                lTicket ? clienteTicket(doc, data) : cliente(doc, data);
                if (!lTicket && data.conceptoEscribania) { //si tiene conceptoEscribania, entonces imprime el concepto entre los datos del cliente y el detalle
                    conceptoEscribania(doc, data.conceptoEscribania);
                }
                lTicket ? detalleTicket(doc, data) : detalle(doc, data);
            }
            else if (cTipoDoc == '4') { //si es AF entonces llamo a la funcion vendedor
                vendedor(doc, data);
                detalleAF(doc, data);
            }
            else if (cTipoDoc == '7') { //si es NR entonces llamo a la funcion remision
                remision(doc, data);
                //detalleAF(doc, data)
            }
            // el xml ya se genera en documento.ts
            let cInicial = cTipoDoc == '1' ? "FE" : cTipoDoc == '4' ? "AF" : cTipoDoc == '5' ? "NC" :
                cTipoDoc == '6' ? "ND" : cTipoDoc == '7' ? "NR" : "error";
            let cNombreDoc = cInicial + '_' + data.dEst + '-' + data.dPunExp + '-' + data.dNumDoc;
            let cFile = `../documentos/kude/` + cNombreDoc; // TOCAR: colocar ruta 
            let out = yield fs.createWriteStream(cFile + '.pdf');
            yield doc.pipe(out);
            yield doc.end();
            yield out.on('finish', function () {
                return __awaiter(this, void 0, void 0, function* () {
                    if (lTicket) {
                        yield redimensionaTicket(cFile + '.pdf', cFile + '.pdf');
                    }
                    // TOCAR: agregar esta porcion de codigo
                    const filePathPDF = `../documentos/kude/` + cNombreDoc + '.pdf';
                    const pdf = fs.readFileSync(filePathPDF);
                    const pdfBase64PDF = Buffer.from(pdf).toString('base64');
                    res.status(200).json({ "archivopdf": pdfBase64PDF, "nombre": cNombreDoc });
                    // TOCAR: agregar estaporcion de codigo
                });
            });
        }
        catch (err) {
            console.log(err);
            res.send({ "mensaje": err.message });
        }
    });
}
exports.generarKude = generarKude;
function cabecera(doc, data, cRuc, params) {
    const adicionalkude = params.adicionalkude; // TOCAR: sacarle json.parse
    const nColumnas = adicionalkude.columnasEncabezado || 2;
    const leftCol2 = 150;
    const leftCol3 = 380;
    const nFitLogo = nColumnas == 2 ? 70 : 120;
    const imagenPath = `../Grf/logo.png`; // TOCAR: agregar ruta logo 
    doc.image(imagenPath, leftMargin + 5, topMargin + (nColumnas == 3 ? 30 : 5), { fit: [nFitLogo, nFitLogo] })
        .moveDown(nColumnas == 2 ? 1 : -2).fontSize(12).font(defaultFont + '-Bold')
        .text(params.razonSocial, nColumnas == 2 ? leftMargin + 5 : leftCol2);
    if (adicionalkude.texto2) {
        doc.text(adicionalkude.texto2);
    }
    doc.font(defaultFont).fontSize(9);
    /*if (data.dNomFanEmi != data.dNomEmi) {
        doc.text('De ' + data.dNomEmi)
    }*/
    if (adicionalkude.texto3) {
        doc.text(adicionalkude.texto3);
    }
    doc.text(data.dDirEmi, { width: rightWidth })
        .text('Ciudad: ' + data.dDesCiuEmi)
        .text('Telefono: ' + data.dTelEmi);
    if (adicionalkude.texto6) {
        doc.text(adicionalkude.texto6);
    }
    doc.text(data.dEmailE.toLowerCase())
        .text('Actividad Económica: ' + data.dDesActEco).moveDown(-1);
    let nTop = doc.y;
    doc.fontSize(12).text('RUC: ' + cRuc, nColumnas == 2 ? pageWidth / 2 : leftCol3, topMargin + 5, { width: rightWidth }).moveDown(.3)
        .text('Timbrado: ' + data.dNumTim).moveDown(.3)
        .text('Inicio de Vigencia: ' + dayjs(data.dFeIniT).format('DD/MM/YYYY')).moveDown(.75)
        .fontSize(16).font(defaultFont + '-Bold')
        .text(data.dDesTiDE + ' N°: ' + data.dEst + '-' + data.dPunExp + '-' + data.dNumDoc);
    doc.y = nTop;
    doc.lineWidth(1.2).roundedRect(leftMargin, topMargin, pageWidth - leftMargin - rightMargin, doc.y - 5, 3).stroke();
}
function cabeceraTicket(doc, data, cRuc, params) {
    const adicionalkude = params.adicionalkude; // TOCAR: sacarle json.parse
    const nFitLogo = 70;
    const imagenPath = `../Grf/logo.png`; // TOCAR: agregar ruta logo 
    doc.image(imagenPath, pageWidth / 2 - nFitLogo / 2, topMargin + 5, { fit: [nFitLogo, nFitLogo] })
        .moveDown(1).fontSize(10).font(defaultFont + '-Bold')
        .text(params.razonSocial.trim(), leftMargin, doc.y, { width: pageWidth, align: 'center' });
    if (adicionalkude.texto2) {
        doc.text(adicionalkude.texto2.trim(), { width: pageWidth, align: 'center' });
    }
    doc.fontSize(8);
    /*if (data.dNomFanEmi != data.dNomEmi) {
        doc.text('De ' + data.dNomEmi)
    }*/
    if (adicionalkude.texto3) {
        doc.text(adicionalkude.texto3.trim(), { width: pageWidth, align: 'center' });
    }
    doc.text('RUC: ' + cRuc.trim(), { width: pageWidth, align: 'center' })
        .text('Actividad Económica: ' + data.dDesActEco.trim(), { width: pageWidth })
        .font(defaultFont).text(data.dDirEmi)
        .text('Ciudad: ' + data.dDesCiuEmi.trim())
        .text('Telefono: ' + data.dTelEmi.trim());
    if (adicionalkude.texto6) {
        doc.text(adicionalkude.texto6.trim(), { width: pageWidth });
    }
    doc.text(data.dEmailE.toLowerCase().trim()).moveDown(.5)
        .text('Timbrado: ' + data.dNumTim.trim())
        .text('Inicio de Vigencia: ' + dayjs(data.dFeIniT).format('DD/MM/YYYY'))
        .fontSize(9).font(defaultFont + '-Bold').moveDown(.5)
        .text((data.dDesTiDE + ' N°: ' + data.dEst + '-' + data.dPunExp + '-' + data.dNumDoc).trim(), { width: pageWidth, align: 'center' }).moveDown(.5);
}
function cliente(doc, data) {
    doc.font(defaultFont).fontSize(9).stroke().moveDown(2);
    let nTop = doc.y;
    doc.text('Fecha y hora de emisión: ' + dayjs(data.fecha).format('DD/MM/YYYY HH:mm:ss'), leftMargin + 5);
    if (data.iTiDE != '5' && data.iTiDE != '6') {
        doc.text('Condición de Venta: Contado [' + (data.condicion == "1" ? ' X ' : '   ') + ']  - Crédito [' + (data.condicion == "2" ? 'X' : '   ') + ']');
    }
    doc.text('Moneda: ' + data.dDesMoneOpe)
        .text(((data.iNatRec === '1') ? 'RUC: ' + data.dRucRec + '-' + data.dDVRec : 'Documento de Identidad No: ' + data.dNumIDRec), pageWidth / 2, nTop, { width: rightWidth })
        .text('Nombre o Razón Social: ' + data.dNomRec, { width: rightWidth })
        .text((data.iTiDE == '5' || data.iTiDE == '6') ? '' : 'Tipo de Transacción: ' + (data.dDesTiPag || ''));
    if (data.docAsociado && data.docAsociado[0].iTipDocAso != 'SinDoc') { // si tiene documento asociado
        doc.text('Documento asociado: ' + data.docAsociado[0].dDesTipDocAso, leftMargin + 5);
        if (data.docAsociado && data.docAsociado[0].iTipDocAso == "1") { // si el documento asociado es electronico, solo imprimo el CDC
            doc.moveDown(.2).text('CDC: ' + data.docAsociado[0].dCdCDERef);
        }
        else { //Si el documento asociado es preimpreso
            doc.text('N° Timbrado: ' + data.docAsociado[0].dNTimDI);
            doc.text('N° Documento asociado: ' + data.docAsociado[0].dEstDocAso + '-' + data.docAsociado[0].dPExpDocAso + '-' + data.docAsociado[0].dNumDocAso);
        }
    }
    doc.roundedRect(leftMargin, nTop - 3, pageWidth - leftMargin - rightMargin, doc.y - nTop + 6, 2).stroke().moveDown(1);
}
function clienteTicket(doc, data) {
    doc.font(defaultFont).fontSize(7)
        .text('Fecha: ' + dayjs(data.fecha).format('DD/MM/YYYY HH:mm:ss'));
    if (data.iTiDE != '5' && data.iTiDE != '6') {
        doc.text('Condición: Contado [' + (data.condicion == "1" ? ' X ' : '   ') + ']  - Crédito [' + (data.condicion == "2" ? 'X' : '   ') + ']');
    }
    doc.text('Moneda: ' + data.dDesMoneOpe)
        .text(((data.iNatRec === '1') ? 'RUC: ' + data.dRucRec + '-' + data.dDVRec : 'Documento de Identidad No: ' + data.dNumIDRec))
        .text('Nombre o Razón Social: ' + data.dNomRec, { width: rightWidth });
    //.text((data.iTiDE == '5' || data.iTiDE == '6') ? '' : 'Tipo de Transacción: ' + (data.dDesTiPag || ''))
    if (data.docAsociado && data.docAsociado[0].iTipDocAso != 'SinDoc') { // si tiene documento asociado
        doc.text('Documento asociado: ' + data.docAsociado[0].dDesTipDocAso);
        if (data.docAsociado && data.docAsociado[0].iTipDocAso == "1") { // si el documento asociado es electronico, solo imprimo el CDC
            doc.moveDown(.2).text('CDC: ' + data.docAsociado[0].dCdCDERef);
        }
        else { //Si el documento asociado es preimpreso
            doc.text('N° Timbrado: ' + data.docAsociado[0].dNTimDI);
            doc.text('N° Documento asociado: ' + data.docAsociado[0].dEstDocAso + '-' + data.docAsociado[0].dPExpDocAso + '-' + data.docAsociado[0].dNumDocAso);
        }
    }
}
function conceptoEscribania(doc, data) {
    let conceptoTop = doc.y + 1;
    doc.y = doc.y + 3;
    doc.fontSize(9).stroke()
        .font(defaultFont + '-Bold').text('Concepto: ', leftMargin + 5, doc.y, { continued: true, align: 'justify', width: pageWidth - leftMargin - rightMargin - 10 })
        .font(defaultFont).text(data.concepto, { underline: true });
    let y = doc.y + 3;
    doc.font(defaultFont + '-Bold').text('Escritura N°: ', leftMargin + 5, y, { continued: true })
        .font(defaultFont).text(data.escritura, { underline: true })
        .font(defaultFont + '-Bold').text('de Fecha: ', pageWidth / 4, y, { continued: true });
    if (data.fechaescri) {
        doc.font(defaultFont).text(dayjs(data.fechaescri).format('DD/MM/YYYY'), { underline: true });
    }
    doc.font(defaultFont + '-Bold').text('Protocolo: ', pageWidth / 2, y, { continued: true })
        .font(defaultFont + '-Bold').text('Protocolo: ', pageWidth / 2, y, { continued: true })
        .font(defaultFont).text(data.protocolo, { underline: true })
        .font(defaultFont + '-Bold').text('Sección: ', (pageWidth / 4) + (pageWidth / 2), y, { continued: true })
        .font(defaultFont).text(data.seccion, { underline: true })
        .roundedRect(leftMargin, conceptoTop, pageWidth - leftMargin - rightMargin, doc.y - conceptoTop, 2).stroke();
}
function vendedor(doc, data) {
    doc.font(defaultFont).fontSize(9).stroke()
        .text('Ciudad del Vendedor: ' + data.dDesCiuEmi, pageWidth / 2, topMargin + 155, { width: (pageWidth / 2) - 30 })
        .text('Tipo de constancia: ' + data.docAsociado[0].dDesTipDocAso)
        .text('N° de constancia: ' + data.docAsociado[0].dNumCons)
        .text('N° de control: ' + data.docAsociado[0].dNumControl)
        //.text('N° de comprobante de retención:') //PENDIENTE
        .text('Fecha y hora de emisión: ' + dayjs(data.fecha).format('DD/MM/YYYY HH:mm:ss'), leftMargin + 5, topMargin + 155)
        .text('Naturaleza del vendedor: ' + data.dDesNatVen)
        .text('N° de documento de identidad del vendedor: ' + data.dNumIDVen)
        .text('Nombre y Apellido del Vendedor: ' + data.dNomVen)
        .text('Dirección del Vendedor: ' + data.dDirVen)
        .text('N° de casa del vendedor: ' + data.dNumCasVen)
        .text('Nombre o razón social del comprador: ' + data.dNomRec)
        .text('RUC del comprador: ' + data.dRucRec)
        .text('DV del comprador: ' + data.dDVRec)
        .text('Deparamento del vendedor: ' + data.dDesDepVen)
        .text('Distrito del vendedor: ' + data.dDesDisVen)
        .roundedRect(leftMargin, topMargin + 150, pageWidth - leftMargin - rightMargin, doc.y - topMargin - 150, 2).stroke();
}
function remision(doc, data) {
    // Doc Asociado
    doc.fontSize(9).moveDown(2);
    let nTop = doc.y;
    const docAso = data.docAsociado[0];
    if (docAso && docAso.iTipDocAso != 'SinDoc') { // si tiene documento asociado
        doc.font(defaultFont + '-Bold').text('DOCUMENTO ASOCIADO', leftMargin + 5, nTop, { align: 'center' });
        raya(doc);
        if (docAso.iTipDocAso == 1) { // si eso doc. electrónico, imprimo el CDC
            doc.font(defaultFont).text('Documento asociado CDC: ' + docAso.dCdCDERef)
                .text('Tipo de documento asociado: ' + docAso.dDesTipDocAso);
        }
        else if (docAso.iTipDocAso == 2) { // si es doc. preimpreso
            doc.font(defaultFont).text('Documento asociado preimpreso: Timbrado: ' + docAso.dNTimDI
                + ' | Nro: ' + docAso.dEstDocAso + '-' + docAso.dPExpDocAso + '-' + docAso.dNumDocAso)
                .text('Tipo de documento asociado: ' + docAso.dDesTipDocAso)
                .text('Fecha de emisión: ' + dayjs(docAso.dFecEmiDI).format('DD/MM/YYYY'));
        }
        else if (docAso.iTipDocAso == 3) { // si es Constancia Electrónica”
            doc.font(defaultFont).text('Constancia electrónica: ' + docAso.dDesTipCons);
            if (docAso.iTipCons == 2) { // si es Constancia de microproductores
                doc.text('Número de constancia: ' + docAso.dNumCons)
                    .text('l Número de control de la constancia : ' + docAso.dNumControl);
            }
        }
    }
    // Datos Remision
    raya(doc);
    doc.font(defaultFont + '-Bold').text('DESTINATARIO DE LA MERCADERÍA', leftMargin + 5, doc.y, { align: 'center' });
    raya(doc);
    doc.font(defaultFont).text('Fecha y hora de emisión: ' + dayjs(data.fecha).format('DD/MM/YYYY HH:mm:ss'), leftMargin + 5)
        .text('Nombre o Razón Social: ' + data.dNomRec).moveDown(-1)
        .text(((data.iNatRec === '1') ? 'RUC: ' + data.dRucRec + '-' + data.dDVRec : 'Documento de Identidad No: ' + data.dNumIDRec), pageWidth / 2);
    // Datos del traslado
    raya(doc);
    doc.font(defaultFont + '-Bold').text('DATOS DEL TRASLADO', leftMargin + 5, doc.y, { align: 'center' });
    raya(doc);
    doc.font(defaultFont).text('Responsable de la emisión: ' + data.dDesRespEmiNR).moveDown(-1)
        .text('Motivo de emisión: ' + data.dDesMotEmiNR, pageWidth / 2)
        .text('Fecha de inicio de traslado: ' + dayjs(data.cabecera.dIniTras).format('DD/MM/YYYY'), leftMargin + 5).moveDown(-1)
        .text('Fecha de fin de traslado: ' + dayjs(data.cabecera.dFinTras).format('DD/MM/YYYY'), { align: 'center' }).moveDown(-1)
        .text('Kilómetros estimados de recorrido: ' + data.dKmR, { align: 'right' })
        .text('Dirección del local de salida: ' + data.salida.dDirLocSal + ' ' + data.salida.dNumCasSal, leftMargin + 5)
        .text('Ciudad: ' + data.salida.dDesCiuSal).moveDown(-1)
        .text('Distrito: ' + data.salida.dDesDisSal, { align: 'center' }).moveDown(-1)
        .text('Departamento: ' + data.salida.dDesDepSal, { align: 'right' })
        .text('Dirección del local de entrega: ' + data.entrega.dDirLocEnt + ' ' + data.entrega.dNumCasEnt, leftMargin + 5)
        .text('Ciudad: ' + data.entrega.dDesCiuEnt).moveDown(-1)
        .text('Distrito: ' + data.entrega.dDesDisEnt, { align: 'center' }).moveDown(-1)
        .text('Departamento: ' + data.entrega.dDesDepEnt, { align: 'right' });
    // Datos del vehiculo del transporte
    raya(doc);
    doc.font(defaultFont + '-Bold').text('DATOS DEL VEHÍCULO DEL TRANSPORTE', leftMargin + 5, doc.y, { align: 'center' });
    raya(doc);
    doc.font(defaultFont).text('Tipo de transporte: ' + data.cabecera.dDesTipTrans).moveDown(-1)
        .text('Modalidad del transporte: ' + data.cabecera.dDesModTrans, { align: 'center' }).moveDown(-1)
        .text('Tipo de Vehículo: ' + data.vehiculo.dTiVehTras, { align: 'right' });
    let cRespFlet = data.cabecera.iRespFlete;
    cRespFlet = cRespFlet == 1 ? 'Emisor de la Factura Electrónica' : cRespFlet == 2 ? 'Receptor de la Factura Electrónica' :
        cRespFlet == 3 ? 'Tercero' : cRespFlet == 4 ? 'Agente intermediario del transporte' : 'Transporte propio';
    doc.text('Responsable del costo del flete: ' + cRespFlet).moveDown(-1)
        .text('Condición de negociación: ' + data.cabecera.cCondNeg, { align: 'right' })
        .text('Marca: ' + data.vehiculo.dMarVeh).moveDown(-1)
        .text('Nro de identificación del vehículo: ' + data.vehiculo.dNroIDVeh, { align: 'center' }).moveDown(-1)
        .text('Nro de matrícula del vehículo: ' + data.vehiculo.dNroMatVeh, { align: 'right' });
    // Datos del conductor del transporte
    raya(doc);
    doc.font(defaultFont + '-Bold').text('DATOS DEL CONDUCTOR DEL TRANSPORTE', leftMargin + 5, doc.y, { align: 'center' });
    raya(doc);
    doc.font(defaultFont).text('Naturaleza del transportista: ' + (data.transportista.iNatTrans == 1 ? 'C' : 'No c') + 'ontribuyente').moveDown(-1)
        .text('RUC/CI Nro: ' + data.transportista.dRucTrans + ('-' + data.transportista.dDVTrans || ''), { align: 'right' })
        .text('Nombre o razón social del transportista: ' + data.transportista.dNomTrans)
        .text('Nombre y apellido del chofer: ' + data.transportista.dNomChof).moveDown(-1)
        .text('Nro Documento del chofer: ' + data.transportista.dNumIDChof, { align: 'right' })
        .text('Dirección del chofer: ' + data.transportista.dDirChof)
        .moveDown(.2).roundedRect(leftMargin, nTop - 2, pageWidth - leftMargin - rightMargin, doc.y - nTop, 2).stroke().moveDown(2);
    // detalle de la remision
    nTop = doc.y;
    doc.roundedRect(leftMargin, nTop - 10, pageWidth - leftMargin - rightMargin, 25, 3).fillOpacity(0.3).fillAndStroke("black")
        .stroke().fillOpacity(1).fillAndStroke().fontSize(8).font(defaultFont + "-Bold");
    lineaNR(doc, "Código", "Unidad Med.", "Cantidad", "Descripción");
    doc.font(defaultFont).moveDown(1);
    var position = nTop + 20; // guardo solo la posicion inicial (primer item)
    data.items.forEach((item) => {
        position = lineaNR(doc, item.dCodInt, item.dDesUniMed, item.dCantProSer, item.dDesProSer);
        doc.moveTo(leftMargin, position + 18);
    });
    pieHeight = pie(doc, data);
    position = pageHeight - topMargin - pieHeight - 30;
    doc.moveTo(60, nTop - 10).lineTo(60, position + 15)
        .moveTo(120, nTop - 10).lineTo(120, position + 15)
        .moveTo(160, nTop - 10).lineTo(160, position + 15);
    doc.roundedRect(leftMargin, nTop + 15, pageWidth - leftMargin - rightMargin, position - nTop, 3).stroke();
}
function raya(doc) {
    doc.moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y).stroke().moveDown(.3);
}
function lineaNR(doc, codigo, unidadMed, cantidad, descripcion) {
    let y = doc.y;
    doc.text(codigo, leftMargin + 5, y)
        .text(unidadMed, leftMargin + 45, y, { width: 50, align: "center" })
        .text(cantidad, leftMargin + 95, y, { width: 50, align: "center" })
        .text(descripcion, leftMargin + 145, y, { width: 320, align: "justify" });
    if (descripcion != '') {
        y = y + doc.heightOfString(descripcion, { width: 320, align: "justify" }) - doc.heightOfString('t');
    }
    return y + doc.heightOfString('t') + 5;
}
function detalle(doc, data) {
    let i, exentas = 0, gravada5 = 0, gravada10 = 0, total = 0, iva5 = 0, iva10 = 0, totaliva = 0;
    doc.moveDown(1);
    const invoiceTableTop = doc.y;
    doc.roundedRect(leftMargin, invoiceTableTop - 10, pageWidth - leftMargin - rightMargin, 25, 2)
        .fillOpacity(0.3).fillAndStroke("black").stroke()
        .fillOpacity(1).fillAndStroke().fontSize(8).font(defaultFont + "-Bold");
    generateTableRow(doc, invoiceTableTop, "Código", "Cantidad", "Descripción", "Costo Unit.", "Desc.", "Exentas", "Gravadas 5", "Gravadas 10");
    doc.font(defaultFont);
    var position = invoiceTableTop + 20; // guardo solo la posicion inicial (primer item)
    //for (i = 0; i < 22; i++) {
    data.items.forEach((item) => {
        //const item = data.items[i];
        if (item) {
            //const position = invoiceTableTop + (i + 1) * nEspaciado;
            position = generateTableRow(doc, position, item.dCodInt, item.dCantProSer, item.dDesProSer, formatCurrency(item.dPUniProSer), formatCurrency((item.dDescGloItem > 0) ? item.dDescGloItem : item.dDescItem), formatCurrency((item.dTasaIVA == 0) ? item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem)) : 0), formatCurrency((item.dTasaIVA == 5) ? item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem)) : 0), formatCurrency((item.dTasaIVA == 10) ? item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem)) : 0));
            exentas += ((item.dTasaIVA == 0 ? item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem)) : 0));
            gravada5 += ((item.dTasaIVA == 5 ? item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem)) : 0));
            gravada10 += ((item.dTasaIVA == 10 ? item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem)) : 0));
            total += item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem));
            iva5 += ((item.dTasaIVA == 5 ? (item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem))) / 21 : 0));
            iva10 += ((item.dTasaIVA == 10 ? (item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem))) / 11 : 0));
            totaliva += ((item.dTasaIVA == 5 ? (item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem))) / 21 : 0)) + ((item.dTasaIVA == 10 ? (item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem))) / 11 : 0));
            doc.moveTo(leftMargin, position + 18).stroke();
        }
    });
    total = total - (data.dRedon || 0);
    pieHeight = pie(doc, data); // imprimo el pie, me devuelve en que posicion se imprime
    //si tiene items2 (items de escribania), entonces imprime el detalle al final de la factura
    const detEscribaniaHeight = (data.items2) ? detalleEscribania(doc, data, total) : 0;
    // calculo la ubicacion del subtotal
    let subtotalPosition = doc.page.height - topMargin - pieHeight - detEscribaniaHeight - 120;
    // dibujo las rayas de los detalles
    doc.moveTo(57, invoiceTableTop - 10).lineTo(57, subtotalPosition - 10)
        .moveTo(99, invoiceTableTop - 10).lineTo(99, subtotalPosition - 10)
        .moveTo(332, invoiceTableTop - 10).lineTo(332, subtotalPosition - 10)
        .moveTo(381, invoiceTableTop - 10).lineTo(381, subtotalPosition - 10)
        .font(defaultFont + '-Bold').fontSize(9);
    generateHrPie(doc, subtotalPosition - 10);
    generateTableRow(doc, subtotalPosition, "SUBTOTAL", "", "", "", "", formatCurrency(exentas), formatCurrency(gravada5), formatCurrency(gravada10));
    subtotalPosition += 15;
    doc.moveTo(424, invoiceTableTop - 10).lineTo(424, subtotalPosition - 5)
        .moveTo(477, invoiceTableTop - 10).lineTo(477, subtotalPosition - 5);
    generateHrPie(doc, subtotalPosition - 5);
    generateTableRow(doc, subtotalPosition, "RES. SEDECO 347 UNID", "", "", "", "", "", "", formatCurrency(data.dRedon || 0));
    subtotalPosition += 15;
    generateHrPie(doc, subtotalPosition - 5);
    generateTableRow(doc, subtotalPosition, "TOTAL DE LA OPERACIÓN", "", "", "", "", "", "", formatCurrency(total));
    subtotalPosition += 18;
    generateHrPie(doc, subtotalPosition - 5);
    generateTableRow(doc, subtotalPosition, "TOTAL EN GUARANÍES", "", "", "", "", "", "", formatCurrency(total));
    subtotalPosition += 15;
    doc.moveTo(530, invoiceTableTop - 10).lineTo(530, subtotalPosition);
    generateHrPie(doc, subtotalPosition);
    subtotalPosition += 5;
    doc.text("LIQUIDACIÓN IVA:              (5%)       " + formatCurrency(iva5)
        + "               (10%)       " + formatCurrency(iva10) + "             TOTAL IVA      " + formatCurrency(totaliva), leftMargin + 5, subtotalPosition);
    subtotalPosition += 15;
    doc.roundedRect(leftMargin, invoiceTableTop + 15, pageWidth - leftMargin - rightMargin, subtotalPosition - invoiceTableTop - 15, 2).stroke();
}
function detalleTicket(doc, data) {
    let i, exentas = 0, gravada5 = 0, gravada10 = 0, total = 0, iva5 = 0, iva10 = 0, totaliva = 0, descuento = 0;
    doc.moveDown(.5);
    const invoiceTableTop = doc.y;
    raya(doc);
    doc.font(defaultFont + '-Bold');
    generateTableRowTicket(doc, "Código", "Cant.", "Descripción", "Costo Unit.", "Desc.", "IVA", "Costo Total");
    doc.font(defaultFont);
    raya(doc);
    data.items.forEach((item) => {
        if (item) {
            generateTableRowTicket(doc, item.dCodInt, formatDecimal(item.dCantProSer), item.dDesProSer, formatCurrency(item.dPUniProSer), formatCurrency((item.dDescGloItem > 0) ? item.dDescGloItem : item.dDescItem), formatDecimal(item.dTasaIVA), formatCurrency((item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem)))));
            exentas += ((item.dTasaIVA == 0 ? item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem)) : 0));
            gravada5 += ((item.dTasaIVA == 5 ? item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem)) : 0));
            gravada10 += ((item.dTasaIVA == 10 ? item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem)) : 0));
            total += item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem));
            iva5 += ((item.dTasaIVA == 5 ? (item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem))) / 21 : 0));
            iva10 += ((item.dTasaIVA == 10 ? (item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem))) / 11 : 0));
            totaliva += ((item.dTasaIVA == 5 ? (item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem))) / 21 : 0)) + ((item.dTasaIVA == 10 ? (item.dCantProSer * (item.dPUniProSer - (item.dDescGloItem > 0 ? item.dDescGloItem : item.dDescItem))) / 11 : 0));
            descuento += (item.dDescGloItem > 0) ? item.dDescGloItem : item.dDescItem * item.dCantProSer;
        }
    });
    raya(doc);
    let y = doc.y;
    doc.fontSize(9);
    totalTicket(doc, 'SUBTOTAL', total + descuento);
    totalTicket(doc, 'DESCUENTO', descuento);
    totalTicket(doc, 'RES. SEDECO 347', data.dRedon);
    doc.font(defaultFont + '-Bold');
    totalTicket(doc, 'TOTAL', (total - (data.dRedon || 0)));
    raya(doc);
    doc.font(defaultFont);
    totalTicket(doc, 'TOTAL EXENTAS', exentas);
    totalTicket(doc, 'TOTAL GRAVADAS 5', gravada5);
    totalTicket(doc, 'TOTAL GRAVADAS 10', gravada10);
    raya(doc);
    doc.text('LIQUIDACION IVA', leftMargin, doc.y, { width: pageWidth, align: 'center' });
    totalTicket(doc, 'IVA 5', iva5);
    totalTicket(doc, 'IVA 10', iva10);
    raya(doc);
    pieTicket(doc, data);
}
function totalTicket(doc, titulo, monto) {
    let y = doc.y;
    doc.text(titulo, leftMargin + 20, y).text(formatCurrency(monto), pageWidth - 120, y, { width: 100, align: "right" });
}
function generateTableRow(doc, y, codigo, cantidad, descripcion, costoUnit, descuento, exentas, gravadas5, gravadas10) {
    doc.text(codigo, leftMargin + 5, y)
        .text(cantidad, leftMargin + 40, y, { width: 35, align: "center" })
        .text(descripcion, leftMargin + 85, y, { width: 220, align: "justify" });
    if (descripcion != '') {
        y = y + doc.heightOfString(descripcion, { width: 220, align: "justify" }) - doc.heightOfString('t');
    }
    doc.text(costoUnit, leftMargin + 268, y, { width: 90, align: "right" })
        .text(descuento, leftMargin + 313, y, { width: 90, align: "right" })
        .text(exentas, leftMargin + 365, y, { width: 90, align: "right" })
        .text(gravadas5, leftMargin + 418, y, { width: 90, align: "right" })
        .text(gravadas10, leftMargin + 480, y, { width: 90, align: "right" });
    return y + doc.heightOfString('t') + 5;
}
function generateTableRowTicket(doc, codigo, cantidad, descripcion, costoUnit, descuento, iva, total) {
    //generateTableRowTicket(doc, invoiceTableTop, "Código", "Cantidad", "Descripción", "Costo Unit.", "Desc.", "IVA", "Costo Total");
    doc.text(descripcion, leftMargin, doc.y, { width: pageWidth });
    /*if (descripcion != '') {
        y = y + doc.heightOfString(descripcion, { width: pageWidth, align: "justify" }) - doc.heightOfString('t')
    }*/
    let y = doc.y;
    //doc.text(codigo, leftMargin, y)
    doc.text(cantidad, leftMargin, y, { width: 26, align: "right" })
        .text(iva, leftMargin + 22, y, { width: 20, align: "right" })
        .text(descuento, leftMargin + 44, y, { width: 28, align: "right" })
        .text(costoUnit, leftMargin + 74, y, { width: 66, align: "right" })
        .text(total, leftMargin + 144, y, { width: 66, align: "right" }).moveDown(.5);
    //return y + doc.heightOfString('t') + 5
}
function detalleAF(doc, data) {
    let total = 0;
    const invoiceTableTop = doc.y + 15;
    doc.roundedRect(leftMargin, invoiceTableTop - 10, pageWidth - leftMargin - rightMargin, 25, 3)
        .fillOpacity(0.3).fillAndStroke("black")
        .stroke().fillOpacity(1).fillAndStroke().fontSize(8).font(defaultFont + "-Bold");
    lineaAF(doc, invoiceTableTop, "Código", "Cantidad", "Descripción", "Precio Unit.", "Valor Venta");
    doc.font(defaultFont);
    var position = invoiceTableTop + 20; // guardo solo la posicion inicial (primer item)
    data.items.forEach((item) => {
        position = lineaAF(doc, position, item.dCodInt, item.dCantProSer, item.dDesProSer, formatCurrency(item.dPUniProSer), formatCurrency(item.dCantProSer * item.dPUniProSer));
        total += item.dCantProSer * item.dPUniProSer;
        doc.moveTo(leftMargin, position + 18);
    });
    pieHeight = pie(doc, data);
    position = pageHeight - topMargin - pieHeight - 30;
    doc.moveTo(57, invoiceTableTop - 10).lineTo(57, position - 10)
        .moveTo(99, invoiceTableTop - 10).lineTo(99, position - 10)
        .moveTo(440, invoiceTableTop - 10).lineTo(440, position - 10)
        .moveTo(500, invoiceTableTop - 10).lineTo(500, position - 10)
        .moveTo(leftMargin, position).font(defaultFont + '-Bold').fontSize(9);
    lineaAF(doc, position, "TOTAL A PAGAR", "", "", "", formatCurrency(total));
    generateHrPie(doc, position - 10);
    doc.roundedRect(leftMargin, invoiceTableTop + 15, pageWidth - leftMargin - rightMargin, position - invoiceTableTop, 3).stroke();
}
function detalleEscribania(doc, data, totalFactura) {
    const detEscribaniaTableTop = pageHeight - topMargin * 2 - qrHeight -
        ((data.items2[0] ? data.items2.length : -1) * (doc.heightOfString("A")) + 70);
    doc.y = detEscribaniaTableTop;
    /*doc.text(data.items2.length)
    doc.text(data.items2[0])*/
    var nTotalDet = 0;
    doc.font(defaultFont + '-Bold').fontSize(11).text('REEMBOLSO DE IMPUESTOS / TASAS', leftMargin + 5)
        .moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y)
        .font(defaultFont + '-BoldOblique').fontSize(9).moveDown(.3)
        .text(`El notario entrega los documentos originales de reembolso a ${data.dNomRec} para utilizar en la contabilidad del mismo.`, leftMargin + 5, doc.y, { width: pageWidth - leftMargin - rightMargin - 10 })
        .moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y)
        .font(defaultFont).moveDown(.3);
    let yDet = doc.y;
    data.items2.forEach((detalle) => {
        if (detalle) {
            let y = doc.y;
            doc.text(detalle.descripcion, leftMargin + 5)
                .text(formatCurrency(detalle.precioUnitario * detalle.cantidad), leftMargin + 480, y, { width: 90, align: "right" });
            nTotalDet += detalle.precioUnitario * detalle.cantidad;
            doc.moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y).moveDown(.3);
        }
    });
    let y = doc.y;
    doc.font(defaultFont + '-Bold').text('TOTAL REEMBOLSO DE IMPUESTOS / TASAS', leftMargin + 5)
        .text(formatCurrency(nTotalDet), leftMargin + 480, y, { width: 90, align: "right" })
        .moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y).moveDown(.3)
        .moveTo(530, yDet - 3.7).lineTo(530, y + 10.3);
    y = doc.y;
    doc.text('TOTAL DE VENTAS / SERVCIOS', leftMargin + 5)
        .text('FACTURA: ' + data.dEst + '-' + data.dPunExp + '-' + data.dNumDoc, pageWidth / 2, y, { width: 200 })
        .text(formatCurrency(totalFactura), leftMargin + 480, y, { width: 90, align: "right" })
        .moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y).moveDown(.3);
    y = doc.y;
    doc.text('TOTAL A PAGAR', leftMargin + 5)
        .text(formatCurrency(totalFactura + nTotalDet), leftMargin + 480, y, { width: 90, align: "right" })
        .roundedRect(leftMargin, detEscribaniaTableTop - 5, pageWidth - leftMargin - rightMargin, doc.y - detEscribaniaTableTop + 5, 2).stroke();
    return doc.y - detEscribaniaTableTop;
}
function lineaAF(doc, y, codigo, cantidad, descripcion, costoUnit, total) {
    doc.text(codigo, leftMargin + 5, y)
        .text(cantidad, leftMargin + 40, y, { width: 35, align: "center" })
        .text(descripcion, leftMargin + 85, y, { width: 320, align: "justify" });
    if (descripcion != '') {
        y = y + doc.heightOfString(descripcion, { width: 320, align: "justify" }) - doc.heightOfString('t');
    }
    doc.text(costoUnit, leftMargin + 350, y, { width: 120, align: "right" })
        .text(total, leftMargin + 450, y, { width: 120, align: "right" });
    return y + doc.heightOfString('t') + 5;
}
function pie(doc, data) {
    const position = pageHeight - topMargin - qrHeight;
    doc.fontSize(7.5).font(defaultFont)
        .text("Consulte la validez de esta " + data.dDesTiDE + " con el número de CDC impreso abajo en: https:\/\/ekuatia.set.gov.py\/consultas\/", leftMargin + 130, position, { width: pageWidth })
        .moveDown(1).rect(leftMargin + 130, doc.y - 3, pageWidth - leftMargin - rightMargin - 130, 12).fillAndStroke("#D3D3D3", "gray")
        .fillAndStroke('black').fontSize(11).font(defaultFont + '-Bold')
        .text('CDC: ' + data.cdc.trim(), { width: pageWidth - leftMargin - rightMargin - 130, align: "center" }).moveDown(1)
        .fontSize(8).text("ESTE DOCUMENTO ES UNA REPRESENTACIÓN GRÁFICA DE UN DOCUMENTO ELECTRÓNICO (XML)", { width: pageWidth - leftMargin - rightMargin - 130 })
        .font(defaultFont).moveDown(2)
        .text("Si su documento electrónico presenta algún error puede solicitar la modificación dentro de las 72 horas siguientes a la emisión de este comprobante", { width: pageWidth - leftMargin - rightMargin - 130 });
    const qrCodeImage = qr.imageSync(data.qr, {
        type: 'png',
        size: 10,
        ec_level: 'L',
        margin: 0
    });
    doc.image(qrCodeImage, leftMargin + 15, position, { fit: [100, 100] });
    return doc.y - position;
}
function pieTicket(doc, data) {
    doc.fontSize(8).font(defaultFont)
        .text("Consulte la validez de esta " + data.dDesTiDE + " con el número de CDC impreso abajo en: https:\/\/ekuatia.set.gov.py\/consultas\/", leftMargin, doc.y, { width: pageWidth - leftMargin - rightMargin, align: 'justify' }).moveDown(.5)
        .font(defaultFont + '-Bold').text('CDC: ' + data.cdc.trim(), { width: pageWidth - leftMargin - rightMargin, align: "center" }).moveDown(.5)
        .font(defaultFont).text("ESTE DOCUMENTO ES UNA REPRESENTACIÓN GRÁFICA DE UN DOCUMENTO ELECTRÓNICO (XML)", { width: pageWidth - leftMargin - rightMargin, align: 'justify' }).moveDown(.5)
        .fontSize(7).text("Si su documento electrónico presenta algún error puede solicitar la modificación dentro de las 72 horas siguientes a la emisión de este comprobante", { width: pageWidth - leftMargin - rightMargin, align: 'justify' }).moveDown(.5);
    const qrCodeImage = qr.imageSync(data.qr, { type: 'png', size: 10, ec_level: 'L', margin: 0 });
    doc.image(qrCodeImage, (pageWidth - qrHeight) / 2, doc.y, { fit: [qrHeight, qrHeight] });
    pageHeight = doc.y + 10;
    /*let page = doc.page(0)
    let pageContent = page.attributedString
    doc.addPage({ size: [pageWidth, pageHeight] })
    doc.*/
}
function redimensionaTicket(inputPath, outputPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const { PDFDocument: PDFLibDocument } = require('pdf-lib');
        // Lee el archivo PDF de origen
        const sourcePdfBytes = fs.readFileSync(inputPath);
        // Carga el archivo PDF de origen
        const sourcePdfDoc = yield PDFLibDocument.load(sourcePdfBytes);
        // Crea un nuevo documento PDF
        const PdfDoc = yield PDFLibDocument.create();
        const [firstDonorPage] = yield PdfDoc.copyPages(sourcePdfDoc, [0]);
        const newPage = yield PdfDoc.insertPage(0, firstDonorPage);
        newPage.translateContent(0, pageHeight - 1200);
        newPage.setSize(pageWidth, pageHeight);
        // Guarda el nuevo documento PDF en un archivo
        const modifiedPdfBytes = yield PdfDoc.save();
        yield fs.writeFileSync(outputPath, modifiedPdfBytes);
    });
}
function generateHrPie(doc, y) {
    doc.lineWidth(1).moveTo(leftMargin, y).lineTo(pageWidth - rightMargin, y).stroke();
}
function formatCurrency(amount) {
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function formatDecimal(amount) {
    return Math.round(amount).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "1.");
    ;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia3VkZUFOVC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3VzZXJzL2t1ZGVBTlQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN6QixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7QUFDOUIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRS9CLElBQUksVUFBVSxHQUFHLEVBQUUsRUFBRSxTQUFTLEdBQUcsRUFBRSxFQUFFLFdBQVcsR0FBRyxFQUFFLEVBQUUsUUFBUSxHQUFHLEdBQUcsRUFBRSxXQUFXLEdBQUcsV0FBVyxDQUFBO0FBQ2hHLElBQUksU0FBUyxHQUFHLENBQUMsRUFBRSxVQUFVLEdBQUcsQ0FBQyxFQUFFLFNBQVMsR0FBRyxDQUFDLEVBQUUsVUFBVSxHQUFHLENBQUMsRUFBRSxPQUFPLEdBQUcsS0FBSyxDQUFBO0FBRWpGLFNBQWUsV0FBVyxDQUFDLElBQVMsRUFBRSxHQUFRLEVBQUUsTUFBVyxDQUFBLGdCQUFnQixFQUFFLFVBQWUsQ0FBQSwyQ0FBMkM7O1FBQ25JLE9BQU8sR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQSxDQUFDLHFEQUFxRDtRQUN4RyxJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFBO1FBQ3JCLElBQUksR0FBRyxHQUFHLElBQUksV0FBVyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQSwyQkFBMkIsRUFBRSxDQUFDLENBQUE7UUFDL0YsR0FBRyxDQUFDLElBQUksQ0FB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QyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3JKLE9BQU8sSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzVJLFFBQVEsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzdJLFNBQVMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQy9JLEtBQUssSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtZQUM3RyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2hKLEtBQUssSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbEosUUFBUSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxD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YUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUN0RixjQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFDOUcsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6SixPQUFPLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1SSxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM3SSxTQUFTLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMvSSxLQUFLLElBQUksSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7WUFDN0csSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoSixLQUFLLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xKLFFBQVEsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2hTLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtTQUMvRjtJQUNMLENBQUMsQ0FBQyxDQUFBO0lBQ0YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ1QsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNiLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDZixXQUFXLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxLQUFLLEdBQUcsU0FBUyxDQUFD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