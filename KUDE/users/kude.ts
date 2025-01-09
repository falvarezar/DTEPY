const PDFDocument = require("pdfkit");
const fs = require('fs').promises;
const fsNoPromises = require('fs');
const qr = require('qr-image')
const dayjs = require('dayjs');

var leftMargin = 20, topMargin = 20, rightMargin = 20, qrHeight = 100, defaultFont = 'Helvetica'
var pageWidth = 0, pageHeight = 0, pieHeight = 0, rightWidth = 0, lTicket = false, nSize: any, adicionalkude: any

async function generarKude(data: any, res: any, params: any, kuDeBinary: any) {
    let lLogo = false
    let imagenPath = `../Grf/logo.png` // TOCAR: agregar ruta logo 
    try {
        await fs.access(imagenPath);
        lLogo = true;
    } catch (error: any) {
        lLogo = false;
    }

    let cTipoDoc = data.iTiDE    
    if (cTipoDoc == '4' || cTipoDoc == '5' || cTipoDoc == '6' || cTipoDoc == '7') {
        nSize = JSON.parse(params.establecimientos[0].size) // TOCAR: establecimientos en plural
    } else {
        lTicket = params.establecimientos[0].tipohoja == 2
        nSize = lTicket ? [215, 1200] : JSON.parse(params.establecimientos[0].size)
    }
    
    adicionalkude = params.adicionalkude || "{}" // TOCAR: sacarle json.parse
    let cRuc = params.ruc
    let doc = new PDFDocument({ size: nSize })
    doc.page.margins.bottom = 10
    if (lTicket) { // si es ticket
        leftMargin = 2, topMargin = 10, rightMargin = 2, qrHeight = 100
    }
    pageWidth = doc.page.width
    pageHeight = doc.page.height
    rightWidth = (pageWidth - leftMargin - rightMargin) / (lTicket ? 1 : 2) // es el width maximo para los textos que se imprimen en la "segunda columna"    
    try {
        lTicket ? cabeceraTicket(doc, data, cRuc, params) : cabecera(doc, data, cRuc, params, lLogo)
        if (['1', '5', '6'].includes(cTipoDoc)) { //si es FE, NC o ND entonces llamo a la funcion clientes
            lTicket ? clienteTicket(doc, data) : cliente(doc, data)

            if (!lTicket && data.conceptoEscribania) { //si tiene conceptoEscribania, entonces imprime el concepto entre los datos del cliente y el detalle
                conceptoEscribania(doc, data.conceptoEscribania)
            }
            lTicket ? detalleTicket(doc, data, params.establecimientos[0].ticketResumen) : detalle(doc, data, nSize)
        } else if (cTipoDoc == '4') { //si es AF entonces llamo a la funcion vendedor
            vendedor(doc, data)
            detalleAF(doc, data)
        } else if (cTipoDoc == '7') { //si es NR entonces llamo a la funcion remision
            remision(doc, data)
        }

        // el xml ya se genera en documento.ts
        let cInicial = cTipoDoc == '1' ? "FE" : cTipoDoc == '4' ? "AF" : cTipoDoc == '5' ? "NC" :
            cTipoDoc == '6' ? "ND" : cTipoDoc == '7' ? "NR" : "error"
        let cNombreDoc = cInicial + '_' + data.dEst + '-' + data.dPunExp + '-' + data.dNumDoc

        let cFile = `../documentos/kude/` + cNombreDoc // TOCAR: colocar ruta 

        // Escribe el archivo PDF
        //await fs.mkdir(`${process.env.FileSYSTEM}/${cRuc}/document`, { recursive: true }); // TOCAR: comentar esta linea
        const writeStream = fsNoPromises.createWriteStream(`${cFile}.pdf`);
        doc.pipe(writeStream);
        doc.end();

        writeStream.on('finish', async () => {
            if (lTicket) {
                await redimensionaTicket(`${cFile}.pdf`, `${cFile}.pdf`);
            }

            // TOCAR: agregar esta porcion de codigo
            //const filePathPDF = `../documentos/kude/` + cNombreDoc + '.pdf';
            //const pdf = fs.readFileSync(filePathPDF);
            //const pdfBase64PDF = Buffer.from(pdf).toString('base64');
            //res.status(200).json({ "archivopdf": pdfBase64PDF, "nombre": cNombreDoc })
            res.status(200).json({ "nombre": cNombreDoc })
            // TOCAR: agregar estaporcion de codigo
        });

        writeStream.on('error', (err: any) => {
            console.error('Error escribiendo archivo PDF:', err);
            res.status(500).send({ mensaje: 'Error generando el archivo PDF.' });
        });
    } catch (err: any) {
        console.log(err)
        res.send({ "mensaje": err.message })
    }
}


async function cabecera(doc: any, data: any, cRuc: any, params: any, lLogo: any) {
    const nColumnas = adicionalkude.columnasEncabezado || 2
    const leftCol2 = 150
    const leftCol3 = 380
    const nFitLogo = nColumnas == 2 ? 70 : 120
    const imagenPath = `../Grf/logo.png` // TOCAR: agregar ruta logo 
    if (lLogo) {
        // Si el archivo existe, se agrega al documento
        doc.image(imagenPath, leftMargin + 5, topMargin + (nColumnas == 3 ? 30 : 5), { fit: [nFitLogo, nFitLogo] });
        doc.moveDown(nColumnas == 2 ? 1 : -2); // Ajusta la posición después de la imagen
    }
    doc.fontSize(12).font(defaultFont + '-Bold')
        .text(params.razonSocial, nColumnas == 2 ? leftMargin + 5 : leftCol2)
    if (adicionalkude.texto2) {
        doc.text(adicionalkude.texto2)
    }
    doc.font(defaultFont).fontSize(9)
    /*if (data.dNomFanEmi != data.dNomEmi) {
        doc.text('De ' + data.dNomEmi)
    }*/
    if (adicionalkude.texto3) {
        doc.text(adicionalkude.texto3)
    }
    doc.text(data.dDirEmi, { width: rightWidth })
        .text('Ciudad: ' + data.dDesCiuEmi)
        .text('Telefono: ' + data.dTelEmi)
    if (adicionalkude.texto6) {
        doc.text(adicionalkude.texto6)
    }
    doc.text(data.dEmailE.toLowerCase())
    doc.font(defaultFont).fontSize(7)
    if (params.actividadesEconomicas.length > 0) { // TOCAR: tiene que ser params.actividadesEconomicas
        doc.text('ACTIVIDADES ECONÓMICAS: ')
        for (let i = 0; i < params.actividadesEconomicas.length; i++) {
            doc.text(params.actividadesEconomicas[i].descripcion)
        }
        doc.moveDown(-1)
    } else {
        doc.text('ACTIVIDAD ECONÓMICA' + data.dDesActEco).moveDown(-1)
    }
    let nTop = doc.y
    doc.fontSize(12).text('RUC: ' + cRuc, nColumnas == 2 ? pageWidth / 2 : leftCol3, topMargin + 5, { width: rightWidth }).moveDown(.3)
        .text('Timbrado: ' + data.dNumTim).moveDown(.3)
        .text('Inicio de Vigencia: ' + dayjs(data.dFeIniT).format('DD/MM/YYYY')).moveDown(.75)
        .fontSize(15).font(defaultFont + '-Bold')
        .text(data.dDesTiDE + ' N°: ' + data.dEst + '-' + data.dPunExp + '-' + data.dNumDoc)
    doc.y = nTop
    doc.lineWidth(1.2).roundedRect(leftMargin, topMargin, pageWidth - leftMargin - rightMargin, doc.y - 5, 3).stroke()
}

function cabeceraTicket(doc: any, data: any, cRuc: any, params: any) {
    const nFitLogo = 100
    const imagenPath = `../Grf/logo.png` // TOCAR: agregar ruta logo 

    doc.image(imagenPath, pageWidth / 2 - nFitLogo / 2, topMargin + 5, { fit: [nFitLogo, nFitLogo] })
        .moveDown(0.2).fontSize(10).font(defaultFont + '-Bold')
        .text(params.razonSocial.trim(), leftMargin, doc.y, { width: pageWidth, align: 'center' })

    if (adicionalkude.texto2) {
        doc.text(adicionalkude.texto2.trim(), { width: pageWidth, align: 'center' })
    }
    doc.fontSize(8)
    /*if (data.dNomFanEmi != data.dNomEmi) {
        doc.text('De ' + data.dNomEmi)
    }*/
    if (adicionalkude.texto3) {
        doc.text(adicionalkude.texto3.trim(), { width: pageWidth, align: 'center' })
    }
    doc.text('RUC: ' + cRuc.trim(), { width: pageWidth, align: 'center' })
        .text('ACTIVIDAD ECONÓMICA: ' + data.dDesActEco.trim(), { width: pageWidth, align: 'center' })
        .font(defaultFont).text(data.dDirEmi, { width: pageWidth, align: 'center' })
        .text('Ciudad: ' + data.dDesCiuEmi.trim(), { width: pageWidth, align: 'center' })
        .text('Telefono: ' + data.dTelEmi.trim(), { width: pageWidth, align: 'center' })
    if (adicionalkude.texto6) {
        doc.text(adicionalkude.texto6.trim(), { width: pageWidth, align: 'center' })
    }
    doc.text(data.dEmailE.toLowerCase().trim(), { width: pageWidth, align: 'center' }).moveDown(.5)
        .text('Timbrado: ' + data.dNumTim.trim(), { width: pageWidth, align: 'center' })
        .text('Inicio de Vigencia: ' + dayjs(data.dFeIniT).format('DD/MM/YYYY'), { width: pageWidth, align: 'center' })
        .fontSize(9).font(defaultFont + '-Bold').moveDown(.5)
        .text((data.dDesTiDE + ' N°: ' + data.dEst + '-' + data.dPunExp + '-' + data.dNumDoc).trim(), { width: pageWidth, align: 'center' }).moveDown(.5)
}

function cliente(doc: any, data: any) {
    doc.font(defaultFont).fontSize(9).stroke().moveDown(2)
    let nTop = doc.y
    doc.text('Fecha y hora de emisión: ' + dayjs(data.fecha).format('DD/MM/YYYY HH:mm:ss'), leftMargin + 5)
    if (data.iTiDE != '5' && data.iTiDE != '6') {
        doc.text('Condición de Venta: Contado [' + (data.condicion == "1" ? ' X ' : '   ') + ']  - Crédito [' + (data.condicion == "2" ? 'X' : '   ') + ']')
    }
    doc.text('Moneda: ' + data.dDesMoneOpe)
        .text(((data.iNatRec === '1') ? 'RUC: ' + data.dRucRec + '-' + data.dDVRec : ((data.iTipIDRec === '1' || data.iTipIDRec === '5') ? 'Documento de Identidad No' : data.dDTipIDRec) + ': ' + data.dNumIDRec), pageWidth / 2, nTop, { width: rightWidth })
        .text('Nombre o Razón Social: ' + data.dNomRec, { width: rightWidth })
        .text((data.iTiDE == '5' || data.iTiDE == '6') ? '' : 'Tipo de Transacción: ' + (data.dDesTipTra || ''))
    if (data.docAsociado && data.docAsociado[0].iTipDocAso != 'SinDoc' && data.docAsociado[0] != false) { // si tiene documento asociado
        doc.text('Documento asociado: ' + data.docAsociado[0].dDesTipDocAso, leftMargin + 5)
        if (data.docAsociado && data.docAsociado[0].iTipDocAso == "1") { // si el documento asociado es electronico, solo imprimo el CDC
            doc.moveDown(.2).text('CDC: ' + data.docAsociado[0].dCdCDERef)
        } else { //Si el documento asociado es preimpreso
            doc.text('N° Timbrado: ' + data.docAsociado[0].dNTimDI)
            doc.text('N° Documento asociado: ' + data.docAsociado[0].dEstDocAso + '-' + data.docAsociado[0].dPExpDocAso + '-' + data.docAsociado[0].dNumDocAso)
        }
    }
    doc.roundedRect(leftMargin, nTop - 3, pageWidth - leftMargin - rightMargin, doc.y - nTop + 6, 2).stroke().moveDown(1)
}

function clienteTicket(doc: any, data: any) {
    doc.font(defaultFont).fontSize(7)
        .text('Fecha: ' + dayjs(data.fecha).format('DD/MM/YYYY HH:mm:ss'), leftMargin + 5)
    if (data.iTiDE != '5' && data.iTiDE != '6') {
        doc.text('Condición: Contado [' + (data.condicion == "1" ? ' X ' : '   ') + ']  - Crédito [' + (data.condicion == "2" ? 'X' : '   ') + ']')
    }
    doc.text('Moneda: ' + data.dDesMoneOpe)
        .text(((data.iNatRec === '1') ? 'RUC: ' + data.dRucRec + '-' + data.dDVRec : ((data.iTipIDRec === '1' || data.iTipIDRec === '5') ? 'Documento de Identidad No' : data.dDTipIDRec) + ': ' + data.dNumIDRec))
        .text('Nombre o Razón Social: ' + data.dNomRec, { width: rightWidth })
    //.text((data.iTiDE == '5' || data.iTiDE == '6') ? '' : 'Tipo de Transacción: ' + (data.dDesTiPag || ''))
    if (data.docAsociado && data.docAsociado[0].iTipDocAso != 'SinDoc' && data.docAsociado[0] != false) { // si tiene documento asociado
        doc.text('Documento asociado: ' + data.docAsociado[0].dDesTipDocAso)
        if (data.docAsociado && data.docAsociado[0].iTipDocAso == "1") { // si el documento asociado es electronico, solo imprimo el CDC
            doc.moveDown(.2).text('CDC: ' + data.docAsociado[0].dCdCDERef)
        } else { //Si el documento asociado es preimpreso
            doc.text('N° Timbrado: ' + data.docAsociado[0].dNTimDI)
            doc.text('N° Documento asociado: ' + data.docAsociado[0].dEstDocAso + '-' + data.docAsociado[0].dPExpDocAso + '-' + data.docAsociado[0].dNumDocAso)
        }
    }
}

function conceptoEscribania(doc: any, data: any) {
    let conceptoTop = doc.y + 1
    doc.y = doc.y + 3
    doc.fontSize(9).stroke()
        .font(defaultFont + '-Bold').text('Concepto: ', leftMargin + 5, doc.y, { continued: true, align: 'justify', width: pageWidth - leftMargin - rightMargin - 10 })
        .font(defaultFont).text(data.concepto, { underline: true })
    let y: any = doc.y + 3
    doc.font(defaultFont + '-Bold').text('Escritura N°: ', leftMargin + 5, y, { continued: true })
        .font(defaultFont).text(data.escritura, { underline: true })
        .font(defaultFont + '-Bold').text('de Fecha: ', pageWidth / 4, y, { continued: true })
    if (data.fechaescri) {
        doc.font(defaultFont).text(dayjs(data.fechaescri).format('DD/MM/YYYY'), { underline: true })
    }
    doc.font(defaultFont + '-Bold').text('Protocolo: ', pageWidth / 2, y, { continued: true })
        .font(defaultFont).text(data.protocolo, { underline: true })
        .font(defaultFont + '-Bold').text('Sección: ', (pageWidth / 4) + (pageWidth / 2), y, { continued: true })
        .font(defaultFont).text(data.seccion, { underline: true })
        .roundedRect(leftMargin, conceptoTop, pageWidth - leftMargin - rightMargin, doc.y - conceptoTop, 2).stroke()
}

function vendedor(doc: any, data: any) {
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
        .roundedRect(leftMargin, topMargin + 150, pageWidth - leftMargin - rightMargin, doc.y - topMargin - 150, 2).stroke()
}

function remision(doc: any, data: any) {
    // Doc Asociado
    doc.fontSize(9).moveDown(2)
    let nTop = doc.y
    const docAso = data.docAsociado[0]
    if (docAso && docAso.iTipDocAso != 'SinDoc' && docAso != false) {// si tiene documento asociado
        doc.font(defaultFont + '-Bold').text('DOCUMENTO ASOCIADO', leftMargin + 5, nTop, { align: 'center' })
        raya(doc)
        if (docAso.iTipDocAso == 1) {// si eso doc. electrónico, imprimo el CDC
            doc.font(defaultFont).text('Documento asociado CDC: ' + docAso.dCdCDERef)
                .text('Tipo de documento asociado: ' + docAso.dDesTipDocAso)
        } else if (docAso.iTipDocAso == 2) {// si es doc. preimpreso
            doc.font(defaultFont).text('Documento asociado preimpreso: Timbrado: ' + docAso.dNTimDI
                + ' | Nro: ' + docAso.dEstDocAso + '-' + docAso.dPExpDocAso + '-' + docAso.dNumDocAso)
                .text('Tipo de documento asociado: ' + docAso.dDesTipDocAso)
                .text('Fecha de emisión: ' + dayjs(docAso.dFecEmiDI).format('DD/MM/YYYY'))
        } else if (docAso.iTipDocAso == 3) {// si es Constancia Electrónica”
            doc.font(defaultFont).text('Constancia electrónica: ' + docAso.dDesTipCons)
            if (docAso.iTipCons == 2) { // si es Constancia de microproductores
                doc.text('Número de constancia: ' + docAso.dNumCons)
                    .text('l Número de control de la constancia : ' + docAso.dNumControl)
            }
        }
    }
    // Datos Remision
    raya(doc)
    doc.font(defaultFont + '-Bold').text('DESTINATARIO DE LA MERCADERÍA', leftMargin + 5, doc.y, { align: 'center' })
    raya(doc)
    doc.font(defaultFont).text('Fecha y hora de emisión: ' + dayjs(data.fecha).format('DD/MM/YYYY HH:mm:ss'), leftMargin + 5)
        .text('Nombre o Razón Social: ' + data.dNomRec).moveDown(-1)
        .text(((data.iNatRec === '1') ? 'RUC: ' + data.dRucRec + '-' + data.dDVRec : ((data.iTipIDRec === '1' || data.iTipIDRec === '5') ? 'Documento de Identidad No' : data.dDTipIDRec) + ': ' + data.dNumIDRec), pageWidth / 2)
    // Datos del traslado
    raya(doc)
    doc.font(defaultFont + '-Bold').text('DATOS DEL TRASLADO', leftMargin + 5, doc.y, { align: 'center' })
    raya(doc)
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
        .text('Departamento: ' + data.entrega.dDesDepEnt, { align: 'right' })

    // Datos del vehiculo del transporte
    raya(doc)
    doc.font(defaultFont + '-Bold').text('DATOS DEL VEHÍCULO DEL TRANSPORTE', leftMargin + 5, doc.y, { align: 'center' })
    raya(doc)
    doc.font(defaultFont).text('Tipo de transporte: ' + data.cabecera.dDesTipTrans).moveDown(-1)
        .text('Modalidad del transporte: ' + data.cabecera.dDesModTrans, { align: 'center' }).moveDown(-1)
        .text('Tipo de Vehículo: ' + data.vehiculo.dTiVehTras, { align: 'right' })

    let cRespFlet = data.cabecera.iRespFlete
    cRespFlet = cRespFlet == 1 ? 'Emisor de la Factura Electrónica' : cRespFlet == 2 ? 'Receptor de la Factura Electrónica' :
        cRespFlet == 3 ? 'Tercero' : cRespFlet == 4 ? 'Agente intermediario del transporte' : 'Transporte propio'
    doc.text('Responsable del costo del flete: ' + cRespFlet).moveDown(-1)
        .text('Condición de negociación: ' + data.cabecera.cCondNeg, { align: 'right' })
        .text('Marca: ' + data.vehiculo.dMarVeh).moveDown(-1)
        .text('Nro de identificación del vehículo: ' + data.vehiculo.dNroIDVeh, { align: 'center' }).moveDown(-1)
        .text('Nro de matrícula del vehículo: ' + data.vehiculo.dNroMatVeh, { align: 'right' })

    // Datos del conductor del transporte
    raya(doc)
    doc.font(defaultFont + '-Bold').text('DATOS DEL CONDUCTOR DEL TRANSPORTE', leftMargin + 5, doc.y, { align: 'center' })
    raya(doc)
    doc.font(defaultFont).text('Naturaleza del transportista: ' + (data.transportista.iNatTrans == 1 ? 'C' : 'No c') + 'ontribuyente').moveDown(-1)
        .text('RUC/CI Nro: ' + data.transportista.dRucTrans + ('-' + data.transportista.dDVTrans || ''), { align: 'right' })
        .text('Nombre o razón social del transportista: ' + data.transportista.dNomTrans)
        .text('Nombre y apellido del chofer: ' + data.transportista.dNomChof).moveDown(-1)
        .text('Nro Documento del chofer: ' + data.transportista.dNumIDChof, { align: 'right' })
        .text('Dirección del chofer: ' + data.transportista.dDirChof)
        .moveDown(.2).roundedRect(leftMargin, nTop - 2, pageWidth - leftMargin - rightMargin, doc.y - nTop, 2).stroke().moveDown(2)
    // detalle de la remision
    nTop = doc.y
    doc.roundedRect(leftMargin, nTop - 10, pageWidth - leftMargin - rightMargin, 25, 3).fillOpacity(0.3).fillAndStroke("black")
        .stroke().fillOpacity(1).fillAndStroke().fontSize(8).font(defaultFont + "-Bold")
    lineaNR(doc, "Código", "Unidad Med.", "Cantidad", "Descripción")
    doc.font(defaultFont).moveDown(1)
    var position = nTop + 20; // guardo solo la posicion inicial (primer item)
    data.items.forEach((item: any) => {
        position = lineaNR(doc, item.dCodInt, item.dDesUniMed, item.dCantProSer, item.dDesProSer)
        doc.moveTo(leftMargin, position + 18)
    })
    pieHeight = pie(doc, data);
    position = pageHeight - topMargin - pieHeight - 30
    doc.moveTo(60, nTop - 10).lineTo(60, position + 15)
        .moveTo(120, nTop - 10).lineTo(120, position + 15)
        .moveTo(160, nTop - 10).lineTo(160, position + 15)
    doc.roundedRect(leftMargin, nTop + 15, pageWidth - leftMargin - rightMargin, position - nTop, 3).stroke()
}

function raya(doc: any) {
    doc.moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y).stroke().moveDown(.3)
}

function lineaNR(doc: any, codigo: any, unidadMed: any, cantidad: any, descripcion: any) {
    let y = doc.y
    doc.text(codigo, leftMargin + 5, y)
        .text(unidadMed, leftMargin + 45, y, { width: 50, align: "center" })
        .text(cantidad, leftMargin + 95, y, { width: 50, align: "center" })
        .text(descripcion, leftMargin + 145, y, { width: 320, align: "justify" })
    if (descripcion != '') {
        y = y + doc.heightOfString(descripcion, { width: 320, align: "justify" }) - doc.heightOfString('t')
    }
    return y + doc.heightOfString('t') + 5
}

function detalle(doc: any, data: any, nSize: any) {
    let i, exentas = 0, gravada5 = 0, gravada10 = 0, total = 0, iva5 = 0, iva10 = 0, totaliva = 0
    doc.moveDown(1)
    const invoiceTableTop = doc.y
    doc.roundedRect(leftMargin, invoiceTableTop - 10, pageWidth - leftMargin - rightMargin, 25, 2)
        .fillOpacity(0.3).fillAndStroke("black").stroke()
        .fillOpacity(1).fillAndStroke().fontSize(8).font(defaultFont + "-Bold");
    generateTableRow(doc, invoiceTableTop, "Código", "Cantidad", "Descripción", "Costo Unit.", "Desc.", "Exentas", "Gravadas 5", "Gravadas 10", nSize);
    doc.font(defaultFont);
    var position = invoiceTableTop + 20; // guardo solo la posicion inicial (primer item)
    //for (i = 0; i < 22; i++) {
    data.items.forEach((item: any) => {
        //const item = data.items[i];
        if (item) {
            //const position = invoiceTableTop + (i + 1) * nEspaciado;
            position = generateTableRow(
                doc, position, item.dCodInt, item.dCantProSer, item.dDesProSer,
                currency(item.dPUniProSer, data.cMoneOpe),
                currency((+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt), data.cMoneOpe),
                currency((item.dTasaIVA == 0) ? item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt)) : 0, data.cMoneOpe),
                currency((item.dTasaIVA == 5) ? item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt)) : 0, data.cMoneOpe),
                currency((item.dTasaIVA == 10) ? item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt)) : 0, data.cMoneOpe), nSize)
            exentas += ((item.dTasaIVA == 0 ? item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt)) : 0))
            gravada5 += ((item.dTasaIVA == 5 ? item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt)) : 0))
            gravada10 += ((item.dTasaIVA == 10 ? item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt)) : 0))
            total += item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt))
            iva5 += ((item.dTasaIVA == 5 ? (item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt))) / 21 : 0))
            iva10 += ((item.dTasaIVA == 10 ? (item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt))) / 11 : 0))
            totaliva += ((item.dTasaIVA == 5 ? (item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt))) / 21 : 0)) + ((item.dTasaIVA == 10 ? (item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt))) / 11 : 0))
            doc.moveTo(leftMargin, position + 18).stroke();
        }
    });
    total = total - (data.dRedon || 0)
    let totalGs = data.cMoneOpe == 'PYG' ? total : data.totalGs
    pieHeight = pie(doc, data) // imprimo el pie, me devuelve en que posicion se imprime
    //si tiene items2 (items de escribania), entonces imprime el detalle al final de la factura
    const detEscribaniaHeight = (data.items2 ? data.items2[0] != false : data.items2) ? detalleEscribania(doc, data, total, nSize) : 0
    // calculo la ubicacion del subtotal
    let subtotalPosition = pageHeight - topMargin - pieHeight - detEscribaniaHeight - 120
    // dibujo las rayas de los detalles
    doc.moveTo(57, invoiceTableTop - 10).lineTo(57, subtotalPosition - 10)
        .moveTo(99, invoiceTableTop - 10).lineTo(99, subtotalPosition - 10)
        .moveTo(332, invoiceTableTop - 10).lineTo(332, subtotalPosition - 10)
        .moveTo(381, invoiceTableTop - 10).lineTo(381, subtotalPosition - 10)
        .font(defaultFont + '-Bold').fontSize(9)
    generateHrPie(doc, subtotalPosition - 10);
    generateTableRow(doc, subtotalPosition, "SUBTOTAL", "", "", "", "", currency(exentas, data.cMoneOpe), currency(gravada5, data.cMoneOpe), currency(gravada10, data.cMoneOpe), nSize)

    subtotalPosition += 15
    doc.moveTo(424, invoiceTableTop - 10).lineTo(424, subtotalPosition - 5)
        .moveTo(477, invoiceTableTop - 10).lineTo(477, subtotalPosition - 5)
    generateHrPie(doc, subtotalPosition - 5);
    generateTableRow(doc, subtotalPosition, "RES. SEDECO 347 UNID", "", "", "", "", "", "", currency(data.dRedon || 0, data.cMoneOpe), nSize)

    subtotalPosition += 15
    generateHrPie(doc, subtotalPosition - 5);
    generateTableRow(doc, subtotalPosition, "TOTAL DE LA OPERACIÓN", "", "", "", "", "", "", currency(total, data.cMoneOpe), nSize)

    subtotalPosition += 18
    generateHrPie(doc, subtotalPosition - 5);
    generateTableRow(doc, subtotalPosition, "TOTAL EN GUARANÍES", "", "", "", "", "", "", currency(totalGs, data.cMoneOpe), nSize)

    subtotalPosition += 15
    doc.moveTo((nSize[0] === 600) ? 525 : 530, invoiceTableTop - 10).lineTo((nSize[0] === 600) ? 525 : 530, subtotalPosition)
    generateHrPie(doc, subtotalPosition);
    subtotalPosition += 5
    doc.text("LIQUIDACIÓN IVA:              (5%)       " + currency(iva5, data.cMoneOpe)
        + "               (10%)       " + currency(iva10, data.cMoneOpe) + "             TOTAL IVA      " + currency(totaliva, data.cMoneOpe), leftMargin + 5, subtotalPosition)

    subtotalPosition += 15
    doc.roundedRect(leftMargin, invoiceTableTop + 15, pageWidth - leftMargin - rightMargin, subtotalPosition - invoiceTableTop - 15, 2).stroke()
}

function detalleTicket(doc: any, data: any, lTicketResumen: any) {
    let i, exentas = 0, gravada5 = 0, gravada10 = 0, total = 0, iva5 = 0, iva10 = 0, totaliva = 0, descuento = 0
    doc.moveDown(.5)
    const invoiceTableTop = doc.y
    if (lTicketResumen == false) {
        raya(doc)
        doc.font(defaultFont + '-Bold')
        generateTableRowTicket(doc, "Código", "Cant.", "Descripción", "Costo Unit.", "Desc.", "IVA", "Costo Total")
        doc.font(defaultFont)
        raya(doc)
    }
    data.items.forEach((item: any) => {
        if (item) {
            if (lTicketResumen == false) {
                generateTableRowTicket(doc, item.dCodInt, formatDecimal(item.dCantProSer), item.dDesProSer,
                    currency(item.dPUniProSer, data.cMoneOpe), currency((+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt), data.cMoneOpe),
                    formatDecimal(item.dTasaIVA), currency((item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt))), data.cMoneOpe))
            }
            exentas += ((item.dTasaIVA == 0 ? item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt)) : 0))
            gravada5 += ((item.dTasaIVA == 5 ? item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt)) : 0))
            gravada10 += ((item.dTasaIVA == 10 ? item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt)) : 0))
            total += item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt))
            iva5 += ((item.dTasaIVA == 5 ? (item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt))) / 21 : 0))
            iva10 += ((item.dTasaIVA == 10 ? (item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt))) / 11 : 0))
            totaliva += ((item.dTasaIVA == 5 ? (item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt))) / 21 : 0)) + ((item.dTasaIVA == 10 ? (item.dCantProSer * (item.dPUniProSer - (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt))) / 11 : 0))
            descuento += item.dCantProSer * (+item.dDescGloItem + +item.dAntGloPreUniIt + +item.dDescItem + +item.dAntPreUniIt)
        }
    })
    raya(doc)
    let y = doc.y
    doc.fontSize(9)
    totalTicket(doc, 'SUBTOTAL', total + descuento, data.cMoneOpe)
    totalTicket(doc, 'DESCUENTO', descuento, data.cMoneOpe)
    totalTicket(doc, 'RES. SEDECO 347', data.dRedon, data.cMoneOpe)
    doc.font(defaultFont + '-Bold')
    totalTicket(doc, 'TOTAL', (total - (data.dRedon || 0)), data.cMoneOpe)
    raya(doc)
    doc.font(defaultFont)
    totalTicket(doc, 'TOTAL EXENTAS', exentas, data.cMoneOpe)
    totalTicket(doc, 'TOTAL GRAVADAS 5', gravada5, data.cMoneOpe)
    totalTicket(doc, 'TOTAL GRAVADAS 10', gravada10, data.cMoneOpe)
    raya(doc)
    doc.text('LIQUIDACION IVA', leftMargin, doc.y, { width: pageWidth, align: 'center' })
    totalTicket(doc, 'IVA 5', iva5, data.cMoneOpe)
    totalTicket(doc, 'IVA 10', iva10, data.cMoneOpe)
    raya(doc)
    pieTicket(doc, data)
}

function totalTicket(doc: any, titulo: any, monto: any, moneda: string) {
    let y = doc.y
    doc.text(titulo, leftMargin + 20, y).text(currency(monto, moneda), pageWidth - 120, y, { width: 100, align: "right" })
}

function generateTableRow(doc: any, y: any, codigo: any, cantidad: any, descripcion: any, costoUnit: any, descuento: any, exentas: any, gravadas5: any, gravadas10: any, nSize: any) {
    doc.text(codigo, leftMargin + 5, y)
        .text(cantidad, leftMargin + 40, y, { width: 35, align: "center" })
        .text(descripcion, leftMargin + 85, y, { width: 220, align: "justify" })
    if (descripcion != '') {
        y = y + doc.heightOfString(descripcion, { width: 220, align: "justify" }) - doc.heightOfString('t')
    }
    doc.text(costoUnit, leftMargin + 268, y, { width: 90, align: "right" })
        .text(descuento, leftMargin + 313, y, { width: 90, align: "right" })
        .text(exentas, leftMargin + 365, y, { width: 90, align: "right" })
        .text(gravadas5, leftMargin + ((nSize[0] === 600) ? 413 : 418), y, { width: 90, align: "right" })
        .text(gravadas10, leftMargin + ((nSize[0] === 600) ? 468 : 480), y, { width: 90, align: "right" })
    return y + doc.heightOfString('t') + 5
}

function generateTableRowTicket(doc: any, codigo: any, cantidad: any, descripcion: any, costoUnit: any, descuento: any, iva: any, total: any) {
    //generateTableRowTicket(doc, invoiceTableTop, "Código", "Cantidad", "Descripción", "Costo Unit.", "Desc.", "IVA", "Costo Total");
    doc.text(descripcion, leftMargin + 4, doc.y, { width: pageWidth })
    /*if (descripcion != '') {
        y = y + doc.heightOfString(descripcion, { width: pageWidth, align: "justify" }) - doc.heightOfString('t')
    }*/
    let y: any = doc.y
    //doc.text(codigo, leftMargin, y)
    doc.text(cantidad, leftMargin, y, { width: 26, align: "right" })
        .text(iva, leftMargin + 22, y, { width: 20, align: "right" })
        .text(descuento, leftMargin + 48, y, { width: 28, align: "right" })
        .text(costoUnit, leftMargin + 74, y, { width: 66, align: "right" })
        .text(total, leftMargin + 140, y, { width: 66, align: "right" }).moveDown(.5)
    //return y + doc.heightOfString('t') + 5
}

function detalleAF(doc: any, data: any) {
    let total = 0
    const invoiceTableTop = doc.y + 15;
    doc.roundedRect(leftMargin, invoiceTableTop - 10, pageWidth - leftMargin - rightMargin, 25, 3)
        .fillOpacity(0.3).fillAndStroke("black")
        .stroke().fillOpacity(1).fillAndStroke().fontSize(8).font(defaultFont + "-Bold");
    lineaAF(doc, invoiceTableTop, "Código", "Cantidad", "Descripción", "Precio Unit.", "Valor Venta")
    doc.font(defaultFont);
    var position = invoiceTableTop + 20; // guardo solo la posicion inicial (primer item)
    data.items.forEach((item: any) => {
        position = lineaAF(doc, position, item.dCodInt, item.dCantProSer, item.dDesProSer,
            currency(item.dPUniProSer, data.cMoneOpe), currency(item.dCantProSer * item.dPUniProSer, data.cMoneOpe))
        total += item.dCantProSer * item.dPUniProSer
        doc.moveTo(leftMargin, position + 18)
    })

    pieHeight = pie(doc, data);
    position = pageHeight - topMargin - pieHeight - 30

    doc.moveTo(57, invoiceTableTop - 10).lineTo(57, position - 10)
        .moveTo(99, invoiceTableTop - 10).lineTo(99, position - 10)
        .moveTo(440, invoiceTableTop - 10).lineTo(440, position - 10)
        .moveTo(500, invoiceTableTop - 10).lineTo(500, position - 10)
        .moveTo(leftMargin, position).font(defaultFont + '-Bold').fontSize(9)
    lineaAF(doc, position, "TOTAL A PAGAR", "", "", "", currency(total, data.cMoneOpe))
    generateHrPie(doc, position - 10);
    doc.roundedRect(leftMargin, invoiceTableTop + 15, pageWidth - leftMargin - rightMargin, position - invoiceTableTop, 3).stroke()
}

function detalleEscribania(doc: any, data: any, totalFactura: any, nSize: any) {
    const detEscribaniaTableTop = pageHeight - topMargin * 2 - pieHeight - 10
        - ((data.items2[0] ? data.items2.length : -1) * (doc.heightOfString("A")) + 70)
    doc.y = detEscribaniaTableTop

    var nTotalDet = 0
    doc.font(defaultFont + '-Bold').fontSize(11).text('REEMBOLSO DE IMPUESTOS / TASAS', leftMargin + 5)
        .moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y)
        .font(defaultFont + '-BoldOblique').fontSize(9).moveDown(.3)
        .text(`El notario entrega los documentos originales de reembolso a ${data.dNomRec} para utilizar en la contabilidad del mismo.`, leftMargin + 5, doc.y, { width: pageWidth - leftMargin - rightMargin - 10 })
        .moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y)
        .font(defaultFont).moveDown(.3)
    let yDet = doc.y

    data.items2.forEach((detalle: any) => {
        if (detalle) {
            let y = doc.y
            doc.text(detalle.descripcion, leftMargin + 5)
                .text(currency(detalle.precioUnitario * detalle.cantidad, data.cMoneOpe), leftMargin + ((nSize[0] === 600) ? 468 : 480), y, { width: 90, align: "right" })
            nTotalDet += detalle.precioUnitario * detalle.cantidad
            doc.moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y).moveDown(.3)
        }
    })

    let y = doc.y
    doc.font(defaultFont + '-Bold').text('TOTAL REEMBOLSO DE IMPUESTOS / TASAS', leftMargin + 5)
        .text(currency(nTotalDet, data.cMoneOpe), leftMargin + ((nSize[0] === 600) ? 468 : 480), y, { width: 90, align: "right" })
        .moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y).moveDown(.3)
        .moveTo(530, yDet - 3.7).lineTo(530, y + 10.3)
    y = doc.y
    doc.text('TOTAL DE VENTAS / SERVCIOS', leftMargin + 5)
        .text('FACTURA: ' + data.dEst + '-' + data.dPunExp + '-' + data.dNumDoc, pageWidth / 2, y, { width: 200 })
        .text(currency(totalFactura, data.cMoneOpe), leftMargin + ((nSize[0] === 600) ? 468 : 480), y, { width: 90, align: "right" })
        .moveTo(leftMargin, doc.y).lineTo(pageWidth - rightMargin, doc.y).moveDown(.3)
    y = doc.y
    doc.text('TOTAL A PAGAR', leftMargin + 5)
        .text(currency(totalFactura + nTotalDet, data.cMoneOpe), leftMargin + ((nSize[0] === 600) ? 468 : 480), y, { width: 90, align: "right" })
        .roundedRect(leftMargin, detEscribaniaTableTop - 5, pageWidth - leftMargin - rightMargin, doc.y - detEscribaniaTableTop + 5, 2).stroke()
    return doc.y - detEscribaniaTableTop
}

function lineaAF(doc: any, y: any, codigo: any, cantidad: any, descripcion: any, costoUnit: any, total: any) {
    doc.text(codigo, leftMargin + 5, y)
        .text(cantidad, leftMargin + 40, y, { width: 35, align: "center" })
        .text(descripcion, leftMargin + 85, y, { width: 320, align: "justify" })
    if (descripcion != '') {
        y = y + doc.heightOfString(descripcion, { width: 320, align: "justify" }) - doc.heightOfString('t')
    }
    doc.text(costoUnit, leftMargin + 350, y, { width: 120, align: "right" })
        .text(total, leftMargin + 450, y, { width: 120, align: "right" })
    return y + doc.heightOfString('t') + 5
}

function pie(doc: any, data: any) {
    var position = pageHeight - topMargin
    let npieHeight = 0
    if (adicionalkude.pie && data.iTiDE == '1') { // si la empresa tiene pie, imprimo antes del QR
        doc.fontSize(8).font(defaultFont)
        npieHeight = 10 + adicionalkude.pie.firma ? 50 : 0
            + doc.heightOfString(adicionalkude.pie.titulo, { width: pageWidth - leftMargin - rightMargin })
            + doc.heightOfString(adicionalkude.pie.texto, { width: pageWidth - leftMargin - rightMargin })
        if (adicionalkude.pie.firma) {
            doc.text("Recibí conforme:", pageWidth / 4, position - npieHeight + 10, { continued: true })
                .text("Aclaración de firma:", pageWidth / 2, position - npieHeight + 10)
        }
        if (adicionalkude.pie.titulo) {
            doc.font(defaultFont + '-Bold').text(adicionalkude.pie.titulo, leftMargin + 5, doc.y, { width: pageWidth - leftMargin - rightMargin })
        }
        if (adicionalkude.pie.titulo) {
            doc.font(defaultFont).text(adicionalkude.pie.texto, leftMargin + 5, doc.y, { width: pageWidth - leftMargin - rightMargin })
        }
        doc.roundedRect(leftMargin, position - npieHeight, pageWidth - leftMargin - rightMargin, npieHeight + 5, 2).stroke()
    }
    position = position - qrHeight - npieHeight - 5
    doc.fontSize(7.5).font(defaultFont)
        .text("Consulte la validez de esta " + data.dDesTiDE + " con el número de CDC impreso abajo en: https:\/\/ekuatia.set.gov.py\/consultas\/", leftMargin + 130, position, { width: pageWidth })
        .moveDown(1).rect(leftMargin + 130, doc.y - 3, pageWidth - leftMargin - rightMargin - 130, 12).fillAndStroke("#D3D3D3", "gray")
        .fillAndStroke('black').fontSize(11).font(defaultFont + '-Bold')
        .text('CDC: ' + data.cdc.trim(), { width: pageWidth - leftMargin - rightMargin - 130, align: "center" }).moveDown(1)
        .fontSize(8).text("ESTE DOCUMENTO ES UNA REPRESENTACIÓN GRÁFICA DE UN DOCUMENTO ELECTRÓNICO (XML)", { width: pageWidth - leftMargin - rightMargin - 130 })
        .font(defaultFont).moveDown(2)
        .text("Si su documento electrónico presenta algún error puede solicitar la modificación dentro de las 72 horas siguientes a la emisión de este comprobante", { width: pageWidth - leftMargin - rightMargin - 130 })
    const qrCodeImage = qr.imageSync(data.qr, { type: 'png', size: 10, ec_level: 'L', margin: 0 })
    doc.image(qrCodeImage, leftMargin + 15, position, { fit: [100, 100] })
    return qrHeight + npieHeight + 5
}

function pieTicket(doc: any, data: any) {
    doc.fontSize(8).font(defaultFont)
        .text("Consulte la validez de esta " + data.dDesTiDE, leftMargin, doc.y, { width: pageWidth, align: 'center' })
        .text("con el número de CDC impreso abajo en:", { width: pageWidth, align: 'center' })
        .text("https:\/\/ekuatia.set.gov.py\/consultas\/", { width: pageWidth, align: 'center' })
        .font(defaultFont + '-Bold').text('CDC: ' + data.cdc.trim(), { width: pageWidth - leftMargin - rightMargin, align: "center" }).moveDown(.5)
        .font(defaultFont).text("ESTE DOCUMENTO ES UNA REPRESENTACIÓN GRÁFICA DE UN DOCUMENTO ELECTRÓNICO (XML)", { width: pageWidth, align: 'center' }).moveDown(.5)
    const qrCodeImage = qr.imageSync(data.qr, { type: 'png', size: 10, ec_level: 'L', margin: 0 })
    doc.image(qrCodeImage, (pageWidth - qrHeight) / 2, doc.y, { fit: [qrHeight, qrHeight] })

    pageHeight = doc.y + 10

    /*let page = doc.page(0)
    let pageContent = page.attributedString
    doc.addPage({ size: [pageWidth, pageHeight] })
    doc.*/
}


async function redimensionaTicket(inputPath: any, outputPath: any) {
    const { PDFDocument: PDFLibDocument } = require('pdf-lib')
    // Lee el archivo PDF de origen
    const sourcePdfBytes = await fs.readFile(inputPath)
    // Carga el archivo PDF de origen
    const sourcePdfDoc = await PDFLibDocument.load(sourcePdfBytes)
    // Crea un nuevo documento PDF
    const PdfDoc = await PDFLibDocument.create()
    const [firstDonorPage] = await PdfDoc.copyPages(sourcePdfDoc, [0])
    const newPage = await PdfDoc.insertPage(0, firstDonorPage)
    newPage.translateContent(0, pageHeight - 1200)
    newPage.setSize(pageWidth, pageHeight)
    // Guarda el nuevo documento PDF en un archivo
    const modifiedPdfBytes = await PdfDoc.save();
    await fs.writeFile(outputPath, modifiedPdfBytes);
}

function generateHrPie(doc: any, y: any) {
    doc.lineWidth(1).moveTo(leftMargin, y).lineTo(pageWidth - rightMargin, y).stroke();
}

function formatCurrency(amount: any) {
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/*const currency = (number: any) => {
    return new Intl.NumberFormat().format(number);
};*/

const currency = (number: any, moneda: string) => {
    const floatNumber = parseFloat(number);
    // Verifica si el número es un entero
    if (Number.isInteger(floatNumber)) {
        return new Intl.NumberFormat('es-PY').format(floatNumber);
    } else if (moneda == 'PYG') {
        return new Intl.NumberFormat('es-PY', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(floatNumber);
    } else {
        return new Intl.NumberFormat('es-PY', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(floatNumber);

    }
};

function formatDecimal(amount: any) {
    return Math.round(amount).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "1.");;
}

export { generarKude }