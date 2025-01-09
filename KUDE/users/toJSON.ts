function toJSON(obj: any) {

    let i
    let j
    let k
    let l
    let m
    //============================================================================
    let cTimbrado = ''
    let cTimbDoc
    for (i in obj.rDE.DE[0].gTimb[0]) {
        cTimbrado += `"${i}"` + ':"' + obj.rDE.DE[0].gTimb[0][i][0] + '",'
    }
    cTimbDoc = cTimbrado.substring(0, cTimbrado.length - 1)
    //============================================================================

    //============================================================================        
    let cEmisor = ''
    let cProveedor
    for (i in obj.rDE.DE[0].gDatGralOpe[0].gEmis[0]) {
        if (i == 'gActEco') {
            for (j in obj.rDE.DE[0].gDatGralOpe[0].gEmis[0].gActEco[0]) {
                cEmisor += `"${j}"` + ':"' + obj.rDE.DE[0].gDatGralOpe[0].gEmis[0].gActEco[0][j][0] + '",'
            }
        } else {
            cEmisor += `"${i}"` + ':"' + obj.rDE.DE[0].gDatGralOpe[0].gEmis[0][i][0] + '",'
        }
    }
    cProveedor = cEmisor.substring(0, cEmisor.length - 1)
    //=============================================================================

    //============================================================================
    let cReceptor = ''
    let cCliente
    for (i in obj.rDE.DE[0].gDatGralOpe[0].gDatRec[0]) {
        cReceptor += `"${i}"` + ':"' + obj.rDE.DE[0].gDatGralOpe[0].gDatRec[0][i][0] + '",'
    }
    cCliente = cReceptor.substring(0, cReceptor.length - 1)
    //============================================================================

    //============================================================================
    let cMonOperacion = ''
    let cMoneda
    if (obj.rDE.DE[0].gTimb[0].iTiDE != '7') {
        for (i in obj.rDE.DE[0].gDatGralOpe[0].gOpeCom[0]) {
            cMonOperacion += `"${i}"` + ':"' + obj.rDE.DE[0].gDatGralOpe[0].gOpeCom[0][i][0] + '",'
        }
        cMoneda = cMonOperacion.substring(0, cMonOperacion.length - 1)
    }
    //============================================================================

    //============================================================================
    let cVendedor = ''
    let cPrestador
    if (obj.rDE.DE[0].gTimb[0].iTiDE == '4') {
        for (i in obj.rDE.DE[0].gDtipDE[0].gCamAE[0]) {
            cVendedor += `"${i}"` + ':"' + obj.rDE.DE[0].gDtipDE[0].gCamAE[0][i][0] + '",'
        }
        cPrestador = cVendedor.substring(0, cVendedor.length - 1)
    }
    //============================================================================

    //============================================================================
    let cForma = ''
    let cFormaPago
    let cTipMot = ''
    let cMotivoNota
    if (obj.rDE.DE[0].gTimb[0].iTiDE == '1' || obj.rDE.DE[0].gTimb[0].iTiDE == '4') { //si es FE, AFE
        if (obj.rDE.DE[0].gDtipDE[0].gCamCond[0].iCondOpe[0] == '1') {
            for (i in obj.rDE.DE[0].gDtipDE[0].gCamCond[0].gPaConEIni[0]) {
                cForma += `"${i}"` + ':"' + obj.rDE.DE[0].gDtipDE[0].gCamCond[0].gPaConEIni[0][i][0] + '",'
            }
        } else {
            for (i in obj.rDE.DE[0].gDtipDE[0].gCamCond[0].gPagCred[0]) {
                cForma += `"${i}"` + ':"' + obj.rDE.DE[0].gDtipDE[0].gCamCond[0].gPagCred[0][i][0] + '",'
            }
        }
        cFormaPago = cForma.substring(0, cForma.length - 1)
    } else if (obj.rDE.DE[0].gTimb[0].iTiDE == '5' || obj.rDE.DE[0].gTimb[0].iTiDE == '6') { // si es NCE, NDE
        for (i in obj.rDE.DE[0].gDtipDE[0].gCamNCDE[0]) {
            cTipMot += `"${i}"` + ':"' + obj.rDE.DE[0].gDtipDE[0].gCamNCDE[0][i][0] + '",'
        }
        cMotivoNota = cTipMot.substring(0, cTipMot.length - 1)
    } else {
        for (i in obj.rDE.DE[0].gDtipDE[0].gCamNRE[0]) {
            cTipMot += `"${i}"` + ':"' + obj.rDE.DE[0].gDtipDE[0].gCamNRE[0][i][0] + '",'
        }
        cMotivoNota = cTipMot.substring(0, cTipMot.length - 1)
    }
    //============================================================================


    //==================== D A T O S   T R A N S P O R T E =======================
    let cCabecera
    let cSalida
    let cEntrega
    let cVehiculo
    let cTransportista
    if (obj.rDE.DE[0].gTimb[0].iTiDE == '7') {
        let cCabecera0 = ''
        for (i in obj.rDE.DE[0].gDtipDE[0].gTransp[0]) {
            if (i != 'gCamSal') {
                cCabecera0 += `"${i}"` + ':"' + obj.rDE.DE[0].gDtipDE[0].gTransp[0][i][0] + '",'
            } else {
                break; // Sale del bucle
            }
        }
        cCabecera = cCabecera0.substring(0, cCabecera0.length - 1)
        //========================================================================
        let cSalida0 = ''
        for (i in obj.rDE.DE[0].gDtipDE[0].gTransp[0].gCamSal[0]) {
            cSalida0 += `"${i}"` + ':"' + obj.rDE.DE[0].gDtipDE[0].gTransp[0].gCamSal[0][i][0] + '",'
        }
        cSalida = cSalida0.substring(0, cSalida0.length - 1)
        //========================================================================
        let cEntrega0 = ''
        for (i in obj.rDE.DE[0].gDtipDE[0].gTransp[0].gCamEnt[0]) {
            cEntrega0 += `"${i}"` + ':"' + obj.rDE.DE[0].gDtipDE[0].gTransp[0].gCamEnt[0][i][0] + '",'
        }
        cEntrega = cEntrega0.substring(0, cEntrega0.length - 1)
        //========================================================================
        let cVehiculo0 = ''
        for (i in obj.rDE.DE[0].gDtipDE[0].gTransp[0].gVehTras[0]) {
            cVehiculo0 += `"${i}"` + ':"' + obj.rDE.DE[0].gDtipDE[0].gTransp[0].gVehTras[0][i][0] + '",'
        }
        cVehiculo = cVehiculo0.substring(0, cVehiculo0.length - 1)
        //========================================================================
        let cTransportista0 = ''
        for (i in obj.rDE.DE[0].gDtipDE[0].gTransp[0].gCamTrans[0]) {
            cTransportista0 += `"${i}"` + ':"' + obj.rDE.DE[0].gDtipDE[0].gTransp[0].gCamTrans[0][i][0] + '",'
        }
        cTransportista = cTransportista0.substring(0, cTransportista0.length - 1)
    }

    //============================================================================

    //============================================================================
    let cDocAso = ''
    let cDocumentoAso = ''
    for (i in obj.rDE.DE[0]) {
        if (i == 'gCamDEAsoc') {
            for (j in obj.rDE.DE[0].gCamDEAsoc) {
                for (k in obj.rDE.DE[0].gCamDEAsoc[j]) {
                    cDocAso += `"${k}"` + ':"' + obj.rDE.DE[0].gCamDEAsoc[j][k][0] + '",'
                }
                cDocumentoAso += '{' + cDocAso.substring(0, cDocAso.length - 1) + '},'
                cDocAso = ''
            }
        }
    }
    if (cDocumentoAso != '') {
        cDocumentoAso = cDocumentoAso.substring(0, cDocumentoAso.length - 1)
    } else {
        cDocumentoAso = '{"iTipDocAso": "SinDoc"}'
    }
    //============================================================================

    //============================================================================
    let cRegistro = ''
    let cDetalle = ''
    for (i in obj.rDE.DE[0].gDtipDE[0].gCamItem) {
        for (j in obj.rDE.DE[0].gDtipDE[0].gCamItem[i]) {
            if (j == 'gValorItem') {
                for (k in obj.rDE.DE[0].gDtipDE[0].gCamItem[i].gValorItem[0]) {
                    if (k == 'gValorRestaItem') {
                        for (l in obj.rDE.DE[0].gDtipDE[0].gCamItem[i].gValorItem[0].gValorRestaItem[0]) {
                            cRegistro += `"${l}"` + ':"' + obj.rDE.DE[0].gDtipDE[0].gCamItem[i].gValorItem[0].gValorRestaItem[0][l][0] + '",'
                        }
                    } else {
                        cRegistro += `"${k}"` + ':"' + obj.rDE.DE[0].gDtipDE[0].gCamItem[i].gValorItem[0][k][0] + '",'
                    }
                }
            } else if (j == 'gCamIVA') {
                for (m in obj.rDE.DE[0].gDtipDE[0].gCamItem[i].gCamIVA[0]) {
                    cRegistro += `"${m}"` + ':"' + obj.rDE.DE[0].gDtipDE[0].gCamItem[i].gCamIVA[0][m][0] + '",'
                }
            } else {
                cRegistro += `"${j}"` + ':"' + obj.rDE.DE[0].gDtipDE[0].gCamItem[i][j][0] + '",'
            }
        }
        cDetalle += '{' + cRegistro.substring(0, cRegistro.length - 1) + '},'
        cRegistro = ''
    }
    cDetalle = cDetalle.substring(0, cDetalle.length - 1)


    //=============================================================================


    let objson = ''
    if (obj.rDE.DE[0].gTimb[0].iTiDE == '1') { // si es factura
        objson = '{'
            + '"cdc"' + ':"' + `${obj.rDE.DE[0].Id[0]}` + '",'
            + '"fecha"' + ':"' + `${obj.rDE.DE[0].gDatGralOpe[0].dFeEmiDE[0]}` + '",'
            + cTimbDoc + ','
            + cProveedor + ','
            + cCliente + ','
            + cMoneda + ','
            + '"condicion"' + ':"' + `${obj.rDE.DE[0].gDtipDE[0].gCamCond[0].iCondOpe[0]}` + '",'
            + cFormaPago + ','
            + '"docAsociado"' + ':[' + cDocumentoAso + '],'
            + '"qr"' + ':"' + `${obj.rDE.gCamFuFD[0].dCarQR[0]}` + '",'
            + '"items"' + ':[' + cDetalle + '],'
            + '"dRedon"' + ':"' + `${obj.rDE.DE[0].gTotSub[0].dRedon}` + '",'
            + '"totalOpe"' + ':"' + `${obj.rDE.DE[0].gTotSub[0].dTotGralOpe}` + '",'
            + '"totalGs"' + ':"' + `${obj.rDE.DE[0].gTotSub[0].dTotalGs}` + '"'
            + '}'

    } else if (obj.rDE.DE[0].gTimb[0].iTiDE == '4') { // si es autofactura
        objson = '{'
            + '"cdc"' + ':"' + `${obj.rDE.DE[0].Id[0]}` + '",'
            + '"fecha"' + ':"' + `${obj.rDE.DE[0].gDatGralOpe[0].dFeEmiDE[0]}` + '",'
            + cTimbDoc + ','
            + cProveedor + ','
            + cCliente + ','
            + cMoneda + ','
            + cPrestador + ','
            + '"condicion"' + ':"' + `${obj.rDE.DE[0].gDtipDE[0].gCamCond[0].iCondOpe[0]}` + '",'
            + cFormaPago + ','
            + '"docAsociado"' + ':[' + cDocumentoAso + '],'
            + '"qr"' + ':"' + `${obj.rDE.gCamFuFD[0].dCarQR[0]}` + '",'
            + '"items"' + ':[' + cDetalle + '],'
            + '"dRedon"' + ':"' + `${obj.rDE.DE[0].gTotSub[0].dRedon}` + '",'
            + '"totalOpe"' + ':"' + `${obj.rDE.DE[0].gTotSub[0].dTotGralOpe}` + '",'
            + '"totalGs"' + ':"' + `${obj.rDE.DE[0].gTotSub[0].dTotalGs}` + '"'
            + '}'

    } else if (obj.rDE.DE[0].gTimb[0].iTiDE == '5' || obj.rDE.DE[0].gTimb[0].iTiDE == '6') { // si es NCE, NDE
        objson = '{'
            + '"cdc"' + ':"' + `${obj.rDE.DE[0].Id[0]}` + '",'
            + '"fecha"' + ':"' + `${obj.rDE.DE[0].gDatGralOpe[0].dFeEmiDE[0]}` + '",'
            + cTimbDoc + ','
            + cProveedor + ','
            + cCliente + ','
            + cMoneda + ','
            + cMotivoNota + ','
            + '"docAsociado"' + ':[' + cDocumentoAso + '],'
            + '"qr"' + ':"' + `${obj.rDE.gCamFuFD[0].dCarQR[0]}` + '",'
            + '"items"' + ':[' + cDetalle + '],'
            + '"dRedon"' + ':"' + `${obj.rDE.DE[0].gTotSub[0].dRedon}` + '",'
            + '"totalOpe"' + ':"' + `${obj.rDE.DE[0].gTotSub[0].dTotGralOpe}` + '",'
            + '"totalGs"' + ':"' + `${obj.rDE.DE[0].gTotSub[0].dTotalGs}` + '"'
            + '}'
    } else if (obj.rDE.DE[0].gTimb[0].iTiDE == '7') { // si es NRE
        objson = '{'
            + '"cdc"' + ':"' + `${obj.rDE.DE[0].Id[0]}` + '",'
            + '"fecha"' + ':"' + `${obj.rDE.DE[0].gDatGralOpe[0].dFeEmiDE[0]}` + '",'
            + cTimbDoc + ','
            + cProveedor + ','
            + cCliente + ','
            + cMotivoNota + ','
            + '"docAsociado"' + ':[' + cDocumentoAso + '],'
            + '"qr"' + ':"' + `${obj.rDE.gCamFuFD[0].dCarQR[0]}` + '",'
            + '"cabecera"' + ':{' + cCabecera + '},'
            + '"salida"' + ':{' + cSalida + '},'
            + '"entrega"' + ':{' + cEntrega + '},'
            + '"vehiculo"' + ':{' + cVehiculo + '},'
            + '"transportista"' + ':{' + cTransportista + '},'
            + '"items"' + ':[' + cDetalle + ']'
            + '}'
    }

    return objson
}

export { toJSON }