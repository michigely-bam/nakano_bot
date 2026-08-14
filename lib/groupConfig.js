import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo de configuración de grupos
const GROUPS_CONFIG_FILE = path.join(__dirname, '../databases', 'groups.json');

// ====================
// Esto solo es paea solucionar el error
// ====================

// Cargar configuración de grupos
export const loadGroupsConfig = () => {
    try {
        if (fs.existsSync(GROUPS_CONFIG_FILE)) {
            const data = fs.readFileSync(GROUPS_CONFIG_FILE, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('Error cargando groups.json:', error);
        return {};
    }
};

// Guardar configuración de grupos
export const saveGroupsConfig = (groupsConfig) => {
    try {
        // Asegurar que el directorio existe
        const dir = path.dirname(GROUPS_CONFIG_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(GROUPS_CONFIG_FILE, JSON.stringify(groupsConfig, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error guardando groups.json:', error);
        return false;
    }
};

// Obtener configuración de un grupo específico
export const getGroupConfig = (groupId) => {
    try {
        const groupsConfig = loadGroupsConfig();
        return groupsConfig[groupId] || null;
    } catch (error) {
        console.error('Error obteniendo configuración del grupo:', error);
        return null;
    }
};

// Actualizar configuración de un grupo específico
export const updateGroupConfig = (groupId, configData) => {
    try {
        const groupsConfig = loadGroupsConfig();
        if (!groupsConfig[groupId]) {
            groupsConfig[groupId] = {};
        }
        groupsConfig[groupId] = {
            ...groupsConfig[groupId],
            ...configData,
            updatedAt: Date.now()
        };
        saveGroupsConfig(groupsConfig);
        return true;
    } catch (error) {
        console.error('Error actualizando configuración del grupo:', error);
        return false;
    }
};

// Eliminar configuración de un grupo
export const deleteGroupConfig = (groupId) => {
    try {
        const groupsConfig = loadGroupsConfig();
        if (groupsConfig[groupId]) {
            delete groupsConfig[groupId];
            saveGroupsConfig(groupsConfig);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error eliminando configuración del grupo:', error);
        return false;
    }
};

// Verificar si un grupo tiene una configuración específica
export const hasGroupConfig = (groupId, key) => {
    try {
        const groupConfig = getGroupConfig(groupId);
        if (!groupConfig) return false;
        if (key) {
            return groupConfig[key] !== undefined;
        }
        return true;
    } catch (error) {
        console.error('Error verificando configuración del grupo:', error);
        return false;
    }
};

// Obtener un valor específico de la configuración de un grupo
export const getGroupConfigValue = (groupId, key, defaultValue = null) => {
    try {
        const groupConfig = getGroupConfig(groupId);
        if (!groupConfig) return defaultValue;
        return groupConfig[key] !== undefined ? groupConfig[key] : defaultValue;
    } catch (error) {
        console.error('Error obteniendo valor de configuración del grupo:', error);
        return defaultValue;
    }
};
