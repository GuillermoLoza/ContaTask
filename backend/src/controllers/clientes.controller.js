import { Cliente } from '../models/Cliente.js';
import { ClienteView } from '../views/cliente.view.js';
import { ResponseView } from '../views/response.view.js';

/**
 * Controlador de Clientes MYPE (Patrón MVC con Knex)
 * Coordina la consulta de empresas asesoradas, métricas y registro.
 */
export async function getAllClientes(req, res, next) {
  try {
    const { soloActivos } = req.query;
    // 1. Invocar Modelo
    const clientes = await Cliente.findAllWithStats({
      soloActivos: soloActivos === 'true'
    });
    // 2. Delegar a la Vista
    return ClienteView.renderList(res, clientes);
  } catch (error) {
    next(error);
  }
}

export async function getClienteById(req, res, next) {
  try {
    const { idOrRuc } = req.params;

    let cliente = null;
    // Búsqueda polimórfica: por RUC (11 dígitos) o por ID numérico
    if (/^\d{11}$/.test(idOrRuc)) {
      cliente = await Cliente.findByRuc(idOrRuc);
    } else {
      cliente = await Cliente.findById(idOrRuc);
    }

    if (!cliente) {
      return ResponseView.error(res, 'Cliente no encontrado', 404);
    }

    if (req.user?.rol === 'CLIENTE' && (cliente.activo === 0 || cliente.activo === false)) {
      return ResponseView.error(res, 'Acceso al portal deshabilitado: La empresa se encuentra inactiva en el sistema.', 403);
    }

    return ClienteView.renderDetail(res, cliente);
  } catch (error) {
    next(error);
  }
}

export async function createCliente(req, res, next) {
  const {
    ruc,
    razon_social,
    nombre_comercial,
    regimen_tributario,
    contacto_nombre,
    email,
    celular,
    direccion,
    usuario_sol,
    clave_sol,
    sunat_client_id,
    sunat_client_secret
  } = req.body;

  if (!ruc || !razon_social || !email || !celular) {
    return ResponseView.error(res, 'Faltan campos obligatorios (ruc, razon_social, email, celular)', 400);
  }

  if (!/^(10|15|16|17|20)\d{9}$/.test(ruc)) {
    return ResponseView.error(res, 'El RUC debe contener 11 dígitos numéricos válidos (iniciando con 10, 15, 16, 17 o 20)', 400);
  }

  try {
    const clienteId = await Cliente.create({
      ruc,
      razon_social,
      nombre_comercial,
      regimen_tributario,
      contacto_nombre,
      email,
      celular,
      direccion,
      usuario_sol,
      clave_sol,
      sunat_client_id,
      sunat_client_secret
    });

    return ClienteView.renderCreated(res, clienteId);
  } catch (error) {
    if (error.code === '23505' || error.message.includes('UNIQUE') || error.message.includes('unique')) {
      return ResponseView.error(res, 'Ya existe un cliente con el mismo RUC', 409);
    }
    return ResponseView.error(res, error.message, 500);
  }
}

/**
 * Actualizar estado activo / inactivo de un cliente (desactivar o reactivar)
 */
export async function updateClienteEstado(req, res, next) {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return ResponseView.error(res, 'Debe especificar el campo booleano "activo"', 400);
    }

    const clienteExistente = await Cliente.findById(id);
    if (!clienteExistente) {
      return ResponseView.error(res, 'Cliente no encontrado', 404);
    }

    const updated = await Cliente.updateActivo(id, activo);

    return ResponseView.success(res, {
      message: activo ? 'Cliente reactivado exitosamente' : 'Cliente desactivado exitosamente',
      cliente: {
        ...updated,
        activo: Boolean(updated.activo)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Desactivar cliente (Soft delete)
 */
export async function deleteCliente(req, res, next) {
  try {
    const { id } = req.params;

    const clienteExistente = await Cliente.findById(id);
    if (!clienteExistente) {
      return ResponseView.error(res, 'Cliente no encontrado', 404);
    }

    const updated = await Cliente.updateActivo(id, false);

    return ResponseView.success(res, {
      message: 'Cliente desactivado exitosamente',
      cliente: {
        ...updated,
        activo: false
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualizar información completa de un cliente (datos comerciales y SOL)
 */
export async function updateCliente(req, res, next) {
  try {
    const { id } = req.params;
    const {
      ruc,
      razon_social,
      nombre_comercial,
      regimen_tributario,
      contacto_nombre,
      email,
      celular,
      direccion,
      usuario_sol,
      clave_sol,
      sunat_client_id,
      sunat_client_secret
    } = req.body;

    const clienteExistente = await Cliente.findById(id);
    if (!clienteExistente) {
      return ResponseView.error(res, 'Cliente no encontrado', 404);
    }

    if (ruc && !/^(10|15|16|17|20)\d{9}$/.test(ruc)) {
      return ResponseView.error(res, 'El RUC debe contener 11 dígitos numéricos válidos (iniciando con 10, 15, 16, 17 o 20)', 400);
    }

    // Si se cambia el RUC, verificar que no esté en uso por otra empresa
    if (ruc && ruc !== clienteExistente.ruc) {
      const duplicado = await Cliente.findByRuc(ruc);
      if (duplicado && duplicado.id !== Number(id)) {
        return ResponseView.error(res, 'Ya existe otro cliente con el mismo RUC', 409);
      }
    }

    const updated = await Cliente.update(id, {
      ruc,
      razon_social,
      nombre_comercial,
      regimen_tributario,
      contacto_nombre,
      email,
      celular,
      direccion,
      usuario_sol,
      clave_sol,
      sunat_client_id,
      sunat_client_secret
    });

    return ResponseView.success(res, {
      message: 'Información del cliente actualizada exitosamente',
      cliente: {
        ...updated,
        tiene_clave_sol: Boolean(updated.clave_sol && updated.clave_sol.trim().length > 0)
      }
    });
  } catch (error) {
    if (error.code === '23505' || error.message.includes('UNIQUE') || error.message.includes('unique')) {
      return ResponseView.error(res, 'Ya existe un cliente con el mismo RUC o correo', 409);
    }
    next(error);
  }
}

