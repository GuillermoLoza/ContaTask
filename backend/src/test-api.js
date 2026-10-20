import app from './app.js';
import http from 'node:http';

async function testBackend() {
  console.log('🧪 Iniciando pruebas de verificación de la API ContaTask (Node.js + JavaScript)...\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FALLÓ: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    console.log('--- 1. Health Check ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health check responde status 200');
    assert(healthData.status === 'OK', 'Health check retorna status: "OK"');

    // 2. Autenticación (RF-C01)
    console.log('\n--- 2. Autenticación y Control de Roles (RF-C01) ---');
    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fake@example.com', password: 'wrong' })
    });
    assert(badLoginRes.status === 401, 'Credenciales inválidas son rechazadas con 401');

    const contadorLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'contador@contatask.pe', password: 'password123' })
    });
    const contadorLoginData = await contadorLoginRes.json();
    assert(contadorLoginRes.status === 200, 'Login de Contador exitoso (200)');
    assert(contadorLoginData.usuario.rol === 'CONTADOR', 'Rol de usuario es CONTADOR');
    const contadorToken = contadorLoginData.token;

    const clienteLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'contacto@textileslima.com', password: 'password123' })
    });
    const clienteLoginData = await clienteLoginRes.json();
    assert(clienteLoginRes.status === 200, 'Login de Cliente MYPE exitoso (200)');
    assert(clienteLoginData.usuario.rol === 'CLIENTE', 'Rol de usuario es CLIENTE');
    const clienteToken = clienteLoginData.token;

    // 3. Clientes y Acceso por Roles
    console.log('\n--- 3. Acceso a Clientes MYPE ---');
    const clientesRes = await fetch(`${baseUrl}/api/clientes`, {
      headers: { Authorization: `Bearer ${contadorToken}` }
    });
    const clientesData = await clientesRes.json();
    assert(clientesRes.status === 200, 'Contador puede listar clientes (200)');
    assert(clientesData.clientes.length >= 4, `Se listaron ${clientesData.clientes.length} MYPEs`);

    const clienteForbiddenRes = await fetch(`${baseUrl}/api/clientes`, {
      headers: { Authorization: `Bearer ${clienteToken}` }
    });
    assert(clienteForbiddenRes.status === 403, 'Cliente común NO puede acceder al listado general de clientes (403)');

    // 3.2 Actualizar información del cliente y credenciales SOL (Edición Unificada)
    const targetCli = clientesData.clientes[0];
    const updateCliRes = await fetch(`${baseUrl}/api/clientes/${targetCli.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contadorToken}`
      },
      body: JSON.stringify({
        razon_social: targetCli.razon_social,
        nombre_comercial: 'Mi MYPE Editada S.A.C.',
        email: targetCli.email,
        celular: '999888777',
        direccion: 'Av. Las Begonias 450, San Isidro, Lima',
        usuario_sol: 'MODDATOS',
        clave_sol: 'moddatos123'
      })
    });
    const updateCliData = await updateCliRes.json();
    assert(updateCliRes.status === 200, 'Actualizar información del cliente retorna 200');
    assert(updateCliData.cliente.nombre_comercial === 'Mi MYPE Editada S.A.C.', 'Nombre comercial actualizado correctamente');
    assert(updateCliData.cliente.usuario_sol === 'MODDATOS', 'Usuario SOL actualizado junto con la información del cliente');
    assert(updateCliData.cliente.tiene_clave_sol === true, 'Tiene clave SOL registrada');

    // 4. Aislamiento estricto por RUC (RF-C05 Criterio 4)
    console.log('\n--- 4. Aislamiento de Datos por RUC (RF-C05) ---');
    const trxClienteRes = await fetch(`${baseUrl}/api/transacciones`, {
      headers: { Authorization: `Bearer ${clienteToken}` }
    });
    const trxClienteData = await trxClienteRes.json();
    const allBelongToRuc = trxClienteData.transacciones.every(t => t.cliente_ruc === '20512345671');
    assert(allBelongToRuc, 'El cliente solo recibe transacciones de su propio RUC (20512345671)');

    const targetCliente = clientesData.clientes.find(c => c.ruc === '20512345671') || clientesData.clientes[0];
    const targetTrx = trxClienteData.transacciones[0];

    // 5. Notificaciones multicanal y contingencia (RF-C03)
    console.log('\n--- 5. Notificaciones y Contingencia (RF-C03) ---');
    const notifWaRes = await fetch(`${baseUrl}/api/notificaciones/enviar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contadorToken}`
      },
      body: JSON.stringify({
        clienteId: targetCliente.id,
        canal: 'WHATSAPP'
      })
    });
    const notifWaData = await notifWaRes.json();
    assert(notifWaRes.status === 200, 'Notificación WhatsApp procesada con éxito');
    assert(notifWaData.resultado.waLink.includes(`wa.me/51${targetCliente.celular}`), 'Genera enlace WhatsApp oficial con prefijo +51');

    // Contingencia simulando falla en WhatsApp
    const notifFallbackRes = await fetch(`${baseUrl}/api/notificaciones/enviar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contadorToken}`
      },
      body: JSON.stringify({
        clienteId: targetCliente.id,
        canal: 'WHATSAPP',
        forzarFalloWhatsApp: true
      })
    });
    const notifFallbackData = await notifFallbackRes.json();
    assert(notifFallbackData.resultado.estado === 'RESPALDO_ENVIADO', 'Activa contingencia a correo y marca RESPALDO_ENVIADO');

    // 6. Evaluación de documentos por el Contador (RF-C04)
    console.log('\n--- 6. Evaluación de Documentos (RF-C04) ---');
    const evalRes = await fetch(`${baseUrl}/api/transacciones/${targetTrx.id}/evaluar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contadorToken}`
      },
      body: JSON.stringify({
        accion: 'APROBAR'
      })
    });
    const evalData = await evalRes.json();
    assert(evalRes.status === 200, 'Contador aprueba documento (200)');
    assert(evalData.nuevoEstado === 'VALIDADO', 'Estado pasa a VALIDADO');

    const rejectRes = await fetch(`${baseUrl}/api/transacciones/${targetTrx.id}/evaluar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contadorToken}`
      },
      body: JSON.stringify({
        accion: 'RECHAZAR',
        motivo: 'Comprobante bancario borroso'
      })
    });
    const rejectData = await rejectRes.json();
    assert(rejectRes.status === 200, 'Contador rechaza documento con motivo (200)');
    assert(rejectData.nuevoEstado === 'RECHAZADO', 'Estado pasa a RECHAZADO');

    // 7. Subida y Validación de Documentos de Sustento (RF-C02)
    console.log('\n--- 7. Carga y Validación de Archivos (RF-C02) ---');
    // Prueba de archivo ejecutable prohibido (.exe)
    const badForm = new FormData();
    badForm.append('sustento', new Blob(['fake binary'], { type: 'application/x-msdownload' }), 'malware.exe');
    const badUploadRes = await fetch(`${baseUrl}/api/documentos/upload/${targetTrx.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clienteToken}` },
      body: badForm
    });
    assert(badUploadRes.status === 400, 'Rechaza archivo ejecutable (.exe) con código 400');

    // Prueba de archivo permitido (.pdf)
    const goodForm = new FormData();
    goodForm.append('sustento', new Blob(['%PDF-1.4 dummy content'], { type: 'application/pdf' }), 'voucher_bcp_pago.pdf');
    const goodUploadRes = await fetch(`${baseUrl}/api/documentos/upload/${targetTrx.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clienteToken}` },
      body: goodForm
    });
    const goodUploadData = await goodUploadRes.json();
    assert(goodUploadRes.status === 201, 'Carga válida de PDF retorna 201');
    // 8. Integración WhatsApp Web JS
    console.log('\n--- 8. Clase WhatsApp Web JS y Mensajería Directa ---');
    const wsStatusRes = await fetch(`${baseUrl}/api/whatsapp/status`, {
      headers: { Authorization: `Bearer ${contadorToken}` }
    });
    const wsStatusData = await wsStatusRes.json();
    assert(wsStatusRes.status === 200, 'Obtener estado de WhatsApp Web retorna 200');
    assert(wsStatusData.whatsapp.status === 'DISCONNECTED', 'Estado inicial es DISCONNECTED');

    // Inicializar sesión y generar código QR
    const wsInitRes = await fetch(`${baseUrl}/api/whatsapp/initialize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${contadorToken}` }
    });
    const wsInitData = await wsInitRes.json();
    assert(wsInitRes.status === 200, 'Inicialización de WhatsApp retorna 200');
    assert(wsInitData.result.status === 'QR_READY' || wsInitData.result.status === 'INITIALIZING', 'Estado es QR_READY o INITIALIZING');
    if (wsInitData.result.qrCode) {
      assert(wsInitData.result.qrCode.startsWith('data:image/png;base64,'), 'Genera Data URL de imagen QR válida');
    }

    // Confirmar escaneo QR
    const wsScanRes = await fetch(`${baseUrl}/api/whatsapp/confirm-scan`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${contadorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: '51987654321',
        pushname: 'Estudio Contable Lozano & Asociados'
      })
    });
    const wsScanData = await wsScanRes.json();
    assert(wsScanRes.status === 200, 'Confirmar escaneo retorna 200');
    assert(wsScanData.whatsapp.isConnected === true, 'WhatsApp conectado exitosamente');

    // Enviar mensaje de prueba directo
    const wsSendRes = await fetch(`${baseUrl}/api/whatsapp/send-test`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${contadorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: '51987654321',
        message: 'Hola, este es un mensaje de prueba oficial desde ContaTask WhatsApp Web JS.'
      })
    });
    const wsSendData = await wsSendRes.json();
    assert(wsSendRes.status === 200, 'Envío de mensaje directo retorna 200');
    assert(wsSendData.result.status === 'DELIVERED', 'Estado de entrega es DELIVERED');

    // 9. SUNAT Operaciones en Línea (SOL), Token y Buzón SOL
    console.log('\n--- 9. Integración SUNAT (Clave SOL, Token y Buzón Electrónico) ---');
    
    // 9.1 Obtener credenciales SOL
    const getCredRes = await fetch(`${baseUrl}/api/sunat/credenciales/${targetCliente.id}`, {
      headers: { Authorization: `Bearer ${contadorToken}` }
    });
    const getCredData = await getCredRes.json();
    assert(getCredRes.status === 200, 'Obtener credenciales SOL retorna 200');
    assert(getCredData.ruc === '20512345671', 'RUC del cliente coincide');
    assert(getCredData.usuario_sol === 'MODDATOS', 'Usuario SOL es MODDATOS');
    assert(getCredData.tiene_clave_sol === true, 'Tiene clave SOL registrada');

    // 9.2 Guardar / Actualizar credenciales SOL
    const saveCredRes = await fetch(`${baseUrl}/api/sunat/credenciales/${targetCliente.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${contadorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario_sol: 'MODDATOS',
        clave_sol: 'moddatos'
      })
    });
    assert(saveCredRes.status === 200, 'Guardar credenciales SOL retorna 200');

    // 9.3 Validar conexión y generar Token
    const valConnRes = await fetch(`${baseUrl}/api/sunat/validar-conexion/${targetCliente.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${contadorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario_sol: 'MODDATOS',
        clave_sol: 'moddatos'
      })
    });
    const valConnData = await valConnRes.json();
    assert(valConnRes.status === 200, 'Validar conexión y generar token retorna 200');
    assert(valConnData.valido === true, 'Conexión validada como exitosa');
    assert(typeof valConnData.access_token === 'string' && valConnData.access_token.length > 20, 'Token de acceso generado correctamente');
    assert(valConnData.contribuyente.ruc === '20512345671', 'Datos del contribuyente retornados con token');

    // 9.4 Autologin payload
    const autologinRes = await fetch(`${baseUrl}/api/sunat/autologin/${targetCliente.id}`, {
      headers: { Authorization: `Bearer ${contadorToken}` }
    });
    const autologinData = await autologinRes.json();
    assert(autologinRes.status === 200, 'Generar autologin SOL retorna 200');
    assert(autologinData.cliente.ruc === '20512345671', 'Autologin contiene RUC correcto');
    assert(typeof autologinData.autoSubmitHtml === 'string', 'Contiene script HTML de autologin');

    // 9.5 Buzón SOL: Listar notificaciones
    const buzonRes = await fetch(`${baseUrl}/api/sunat/buzon?clienteId=${targetCliente.id}`, {
      headers: { Authorization: `Bearer ${contadorToken}` }
    });
    const buzonData = await buzonRes.json();
    assert(buzonRes.status === 200, 'Listar Buzón SOL retorna 200');
    assert(Array.isArray(buzonData.mensajes), 'Retorna lista de mensajes del buzón');
    assert(buzonData.total > 0, 'Buzón contiene notificaciones');

    // 9.6 Marcar notificación como leída
    if (buzonData.mensajes.length > 0) {
      const msgId = buzonData.mensajes[0].id;
      const readRes = await fetch(`${baseUrl}/api/sunat/buzon/${msgId}/leido`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${contadorToken}` }
      });
      assert(readRes.status === 200, 'Marcar notificación como leída retorna 200');
    }

    // 10. Cronograma de Obligaciones Tributarias SUNAT
    console.log('\n--- 10. Cronograma Oficial y por Clientes SUNAT ---');

    // 10.1 Cronograma oficial mensual
    const cronoOficialRes = await fetch(`${baseUrl}/api/sunat/cronograma?periodo=2026-08`, {
      headers: { Authorization: `Bearer ${contadorToken}` }
    });
    const cronoOficial = await cronoOficialRes.json();
    assert(cronoOficialRes.status === 200, 'Obtener cronograma oficial retorna 200');
    assert(cronoOficial.periodo === '2026-08', 'Cronograma oficial período 2026-08');
    assert(Array.isArray(cronoOficial.cronograma_digitos), 'Contiene lista de dígitos oficiales');
    assert(cronoOficial.cronograma_digitos.length === 7, 'Contiene 7 grupos de dígitos y Buenos Contribuyentes');

    // 10.2 Cronograma cruzado con clientes
    const cronoClientesRes = await fetch(`${baseUrl}/api/sunat/cronograma/clientes?periodo=2026-08`, {
      headers: { Authorization: `Bearer ${contadorToken}` }
    });
    const cronoClientes = await cronoClientesRes.json();
    assert(cronoClientesRes.status === 200, 'Obtener cronograma de clientes retorna 200');
    assert(Array.isArray(cronoClientes.items), 'Retorna lista de clientes con vencimientos');
    assert(cronoClientes.totalEmpresas > 0, 'Hay empresas en el cronograma');
    assert(cronoClientes.items[0].vencimiento, 'Cada cliente tiene fecha de vencimiento calculada');

    // 10.3 Consulta de vencimiento por RUC
    const rucTest = '20512345671'; // Termina en 1 -> vence 2026-09-15
    const rucVencRes = await fetch(`${baseUrl}/api/sunat/cronograma/ruc/${rucTest}?periodo=2026-08`, {
      headers: { Authorization: `Bearer ${contadorToken}` }
    });
    const rucVenc = await rucVencRes.json();
    assert(rucVencRes.status === 200, 'Obtener vencimiento por RUC retorna 200');
    assert(rucVenc.vencimiento === '2026-09-15', 'Vencimiento calculado con exactitud para RUC terminado en 1');
    assert(rucVenc.vencimientoFormateado.includes('Septiembre'), 'Fecha formateada incluye el mes de vencimiento');

    console.log('\n=============================================');
    console.log(`Pruebas completadas: ${passed} exitosas, ${failed} fallidas`);
    console.log('=============================================\n');

  } catch (err) {
    console.error('Error durante las pruebas:', err);
    failed++;
  } finally {
    server.close();
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

testBackend();
