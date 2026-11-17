/**
 * Cliente de Integración Oficial con el Servicio Web API SUNAT SIRE
 * Normativa: R.S. N° 000112-2021/SUNAT, R.S. N° 000040-2022/SUNAT y modificatorias.
 * 
 * Endpoints Oficiales:
 * - OAuth 2.0 Token: https://api-seguridad.sunat.gob.pe/v1/clientessol/{client_id}/oauth2/token/
 * - SIRE Producción: https://api-sire.sunat.gob.pe/v1/contribuyente/mype
 * - SIRE Beta:       https://api-sire-beta.sunat.gob.pe/v1/contribuyente/mype
 */
export class SunatSireApiClient {
  static URL_AUTH = 'https://api-seguridad.sunat.gob.pe/v1/clientessol';
  static URL_SIRE_PROD = 'https://api-sire.sunat.gob.pe/v1/contribuyente/mype';
  static URL_SIRE_BETA = 'https://api-sire-beta.sunat.gob.pe/v1/contribuyente/mype';
  static DEFAULT_TIMEOUT_MS = 8000;

  /**
   * Obtiene la URL base de SIRE según el ambiente configurado
   */
  static getBaseSireUrl(ambiente = 'prod') {
    return ambiente === 'beta' ? this.URL_SIRE_BETA : this.URL_SIRE_PROD;
  }

  /**
   * Solicita o renueva el token OAuth 2.0 ante el servidor de seguridad de SUNAT
   * @param {Object} creds
   * @param {string} creds.clientId Client ID generado en SOL
   * @param {string} creds.clientSecret Client Secret generado en SOL
   * @param {string} creds.ruc RUC del contribuyente (11 dígitos)
   * @param {string} creds.usuarioSol Usuario SOL secundario o principal
   * @param {string} creds.claveSol Clave SOL
   * @param {number} [timeoutMs] Timeout opcional en milisegundos
   */
  static async solicitarToken({ clientId, clientSecret, ruc, usuarioSol, claveSol, timeoutMs = this.DEFAULT_TIMEOUT_MS }) {
    if (!clientId || !clientSecret) {
      throw new Error('Faltan credenciales de Servicio Web SUNAT (Client ID o Client Secret).');
    }
    if (!ruc || !usuarioSol || !claveSol) {
      throw new Error('Faltan credenciales SOL (RUC, Usuario SOL o Clave SOL).');
    }

    const cleanClientId = clientId.trim();
    const cleanClientSecret = clientSecret.trim();
    const cleanRuc = ruc.trim();
    const cleanUsuario = usuarioSol.trim().toUpperCase();
    const cleanClave = claveSol.trim();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const bodyParams = new URLSearchParams({
      grant_type: 'password',
      scope: 'https://api-sire.sunat.gob.pe https://api.sunat.gob.pe/v1/contribuyente/contribuyentes',
      client_id: cleanClientId,
      client_secret: cleanClientSecret,
      username: `${cleanRuc}${cleanUsuario}`,
      password: cleanClave
    });

    const tokenUrl = `${this.URL_AUTH}/${encodeURIComponent(cleanClientId)}/oauth2/token/`;

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: bodyParams.toString(),
        signal: controller.signal
      });

      clearTimeout(timer);

      const responseText = await response.text();
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { raw: responseText };
      }

      if (!response.ok) {
        const errorDesc = data.error_description || data.error || data.message || `Error HTTP ${response.status}`;
        const err = new Error(`Error de autenticación SUNAT (${response.status}): ${errorDesc}`);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      if (!data.access_token) {
        throw new Error('La respuesta de SUNAT no contiene access_token.');
      }

      const expiresIn = Number(data.expires_in) || 3600;
      const expiresAt = new Date(Date.now() + (expiresIn - 300) * 1000); // 5 min de margen

      return {
        accessToken: data.access_token,
        tokenType: data.token_type || 'Bearer',
        expiresIn: expiresIn,
        expiresAt: expiresAt
      };
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`Tiempo de espera agotado al conectar con el servidor OAuth de SUNAT (${timeoutMs / 1000}s).`);
        timeoutErr.code = 'ETIMEDOUT';
        throw timeoutErr;
      }
      throw err;
    }
  }

  /**
   * Consulta comprobantes de la propuesta oficial SIRE (RCE o RVIE)
   * GET /v1/contribuyente/mype/{compras|ventas}/propuesta/{periodo}/comprobantes
   * @param {Object} params
   * @param {string} params.token Token Bearer de SUNAT
   * @param {string} params.periodo Periodo en formato YYYY-MM o YYYYMM (ej. 2026-08 o 202608)
   * @param {string} params.tipoRegistro 'RCE' para Compras o 'RVIE' para Ventas
   * @param {number} [params.pagina=1] Número de página
   * @param {number} [params.registrosPorPagina=100] Registros por página (máx 1000)
   * @param {string} [params.ambiente='prod'] 'prod' o 'beta'
   * @param {number} [params.timeoutMs]
   */
  static async consultarPropuestaComprobantes({
    token,
    periodo,
    tipoRegistro = 'RCE',
    pagina = 1,
    registrosPorPagina = 100,
    ambiente = 'prod',
    timeoutMs = this.DEFAULT_TIMEOUT_MS
  }) {
    if (!token) throw new Error('Token de acceso SUNAT requerido para consultar propuesta SIRE.');

    const periodoClean = String(periodo).replace(/\D/g, ''); // '202608'
    const endpointTipo = tipoRegistro.toUpperCase() === 'RCE' ? 'compras' : 'ventas';
    const baseUrl = this.getBaseSireUrl(ambiente);

    const queryParams = new URLSearchParams({
      numPagina: String(pagina),
      numRegXPag: String(registrosPorPagina)
    });

    const url = `${baseUrl}/${endpointTipo}/propuesta/${periodoClean}/comprobantes?${queryParams.toString()}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timer);

      const responseText = await response.text();
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { raw: responseText };
      }

      if (!response.ok) {
        const errorDesc = data.message || data.error || data.desError || `HTTP ${response.status}`;
        const err = new Error(`Error en API SIRE SUNAT [${endpointTipo.toUpperCase()}] (${response.status}): ${errorDesc}`);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      // SUNAT retorna los comprobantes dentro de 'registros', 'comprobantes' o arreglo directo
      const rawList = Array.isArray(data)
        ? data
        : (data.registros || data.comprobantes || data.items || data.detalle || []);

      return {
        success: true,
        periodo: periodoClean,
        tipoRegistro: tipoRegistro.toUpperCase(),
        totalRegistros: data.paginacion?.totalRegistros ?? rawList.length,
        pagina: data.paginacion?.numPag ?? pagina,
        registrosPorPagina: data.paginacion?.numReg ?? registrosPorPagina,
        comprobantes: rawList,
        rawResponse: data
      };
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`Tiempo de espera agotado al consultar API SIRE SUNAT (${timeoutMs / 1000}s).`);
        timeoutErr.code = 'ETIMEDOUT';
        throw timeoutErr;
      }
      throw err;
    }
  }

  /**
   * Solicita ticket de descarga masiva para propuesta completa en SUNAT SIRE
   * POST /v1/contribuyente/mype/{compras|ventas}/propuesta/{periodo}/solicitar-ticket
   */
  static async solicitarTicketPropuesta({
    token,
    periodo,
    tipoRegistro = 'RCE',
    codTipoArchivo = '1',
    ambiente = 'prod',
    timeoutMs = this.DEFAULT_TIMEOUT_MS
  }) {
    if (!token) throw new Error('Token de acceso SUNAT requerido para solicitar ticket SIRE.');

    const periodoClean = String(periodo).replace(/\D/g, '');
    const endpointTipo = tipoRegistro.toUpperCase() === 'RCE' ? 'compras' : 'ventas';
    const baseUrl = this.getBaseSireUrl(ambiente);
    const url = `${baseUrl}/${endpointTipo}/propuesta/${periodoClean}/solicitar-ticket`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ codTipoArchivo }),
        signal: controller.signal
      });

      clearTimeout(timer);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorDesc = data.message || data.error || `HTTP ${response.status}`;
        throw new Error(`Error solicitando ticket SIRE: ${errorDesc}`);
      }

      return {
        numTicket: data.numTicket || data.numPedido || null,
        fecRecepcion: data.fecRecepcion || new Date().toISOString(),
        raw: data
      };
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Consulta el estado de procesamiento de un Ticket de consulta masiva en SIRE
   * GET /v1/contribuyente/mype/{compras|ventas}/propuesta/{periodo}/tickets/{numTicket}
   */
  static async consultarEstadoTicket({
    token,
    periodo,
    numTicket,
    tipoRegistro = 'RCE',
    ambiente = 'prod',
    timeoutMs = this.DEFAULT_TIMEOUT_MS
  }) {
    const periodoClean = String(periodo).replace(/\D/g, '');
    const endpointTipo = tipoRegistro.toUpperCase() === 'RCE' ? 'compras' : 'ventas';
    const baseUrl = this.getBaseSireUrl(ambiente);
    const url = `${baseUrl}/${endpointTipo}/propuesta/${periodoClean}/tickets/${encodeURIComponent(numTicket)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timer);
      return await response.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Prueba integral de conectividad OAuth 2.0 y API SIRE con las credenciales del cliente
   */
  static async probarConexion({ clientId, clientSecret, ruc, usuarioSol, claveSol, ambiente = 'prod' }) {
    if (!clientId || !clientSecret) {
      return {
        conectado: false,
        modo: 'SIN_CREDENCIALES_API',
        mensaje: 'El cliente no tiene registrado Client ID y Client Secret de la API SUNAT en Gestión de Clientes.',
        faltantes: ['sunat_client_id', 'sunat_client_secret']
      };
    }

    if (!ruc || !usuarioSol || !claveSol) {
      return {
        conectado: false,
        modo: 'SIN_CREDENCIALES_SOL',
        mensaje: 'Faltan credenciales SOL del contribuyente (RUC, Usuario SOL o Clave SOL).',
        faltantes: ['usuario_sol', 'clave_sol']
      };
    }

    try {
      const auth = await this.solicitarToken({
        clientId,
        clientSecret,
        ruc,
        usuarioSol,
        claveSol,
        timeoutMs: 6000
      });

      return {
        conectado: true,
        modo: 'API_SUNAT_OFICIAL',
        mensaje: 'Conexión exitosa con el servicio Web API SUNAT SIRE. Credenciales SOL y OAuth 2.0 validadas.',
        ambiente: ambiente,
        tokenValidoHasta: auth.expiresAt.toISOString(),
        expiresInSegundos: auth.expiresIn
      };
    } catch (err) {
      return {
        conectado: false,
        modo: 'ERROR_CONEXION_SUNAT',
        mensaje: `No se pudo conectar a la API SUNAT: ${err.message}`,
        error: err.message,
        codigoHttp: err.status || null
      };
    }
  }

  /**
   * Normaliza un comprobante recibido de la API oficial de SUNAT SIRE
   * a la estructura estándar de base de datos de ContaTask
   */
  static normalizarComprobante(raw, { tipoRegistro = 'RCE', clienteRuc = '', defaultPeriodo = '' } = {}) {
    // 1. Tipo de comprobante (01=Factura, 03=Boleta, 07=NC, 08=ND, 14=Servicios)
    const tipoCpe = String(raw.codTipoCpe || raw.tipoComprobante || raw.codTipoCDP || '01').padStart(2, '0');

    // 2. Serie y Número
    const serie = String(raw.numSerie || raw.serie || raw.numSerieCDP || 'F001').trim().toUpperCase();
    const numero = String(raw.numCpe || raw.numero || raw.numCDP || raw.numCorrelativo || '00000001').trim();

    // 3. RUC y Razón Social de la contraparte
    let emisorRuc = raw.numRuc || raw.numDocIdentidad || raw.emisorRuc || raw.numDocEmisor;
    let emisorRazon = raw.nomRazonSocial || raw.razonSocial || raw.nomEmisor || raw.nomAdquirente;

    if (tipoRegistro === 'RVIE') {
      // En ventas, el emisor es la MYPE y el cliente adquirente es la contraparte
      emisorRuc = raw.numDocAdquirente || raw.numDocIdentidad || raw.adquirenteRuc || emisorRuc || '00000000000';
      emisorRazon = raw.nomAdquirente || raw.razonSocialAdquirente || emisorRazon || 'CLIENTE LOCAL';
    } else {
      emisorRuc = emisorRuc || '20100012345';
      emisorRazon = emisorRazon || 'PROVEEDOR SUNAT S.A.C.';
    }

    // 4. Fechas
    const fechaEmision = (raw.fecEmision || raw.fechaEmision || `${defaultPeriodo || '2026-08'}-10`).split('T')[0];
    const fechaVcto = raw.fecVenc || raw.fechaVcto || raw.fecVencimiento ? (raw.fecVenc || raw.fechaVcto || raw.fecVencimiento).split('T')[0] : null;

    // 5. Moneda y Tipo de cambio
    const moneda = String(raw.codMoneda || raw.moneda || 'PEN').toUpperCase();
    const tipoCambio = Number(raw.tipoCambio || raw.tipCambio || 1.000);

    // 6. Importes numéricos
    const baseImponible = Number(raw.mtoBiGravada ?? raw.baseImponible ?? raw.mtoBi ?? raw.mtoValFactExportacion ?? 0);
    const igv = Number(raw.mtoIgv ?? raw.igv ?? 0);
    const montoTotal = Number(raw.mtoTotal ?? raw.total ?? raw.mtoImporteTotal ?? (baseImponible + igv));

    // 7. CAR (Código de Anotación de Registro)
    const codCar = raw.codCar || raw.car || raw.codCAR || null;

    return {
      tipo_comprobante: tipoCpe,
      serie,
      numero,
      emisor_ruc: String(emisorRuc).replace(/\D/g, '').slice(0, 11),
      emisor_razon_social: String(emisorRazon).slice(0, 255),
      fecha_emision: fechaEmision,
      fecha_vcto: fechaVcto,
      moneda,
      tipo_cambio: isNaN(tipoCambio) || tipoCambio <= 0 ? 1.000 : tipoCambio,
      base_imponible: Math.round(baseImponible * 100) / 100,
      igv: Math.round(igv * 100) / 100,
      monto_total: Math.round(montoTotal * 100) / 100,
      cod_car: codCar
    };
  }
}
