import axios from 'axios';

// Lista de APIs a competir (la primera que responda gana)
const QUOTE_ENDPOINTS = [
  'https://api.alyacore.xyz/tools/quotesticker?key=LumiBot-alya'
];

/**
 * Envia el objeto de quote a múltiples APIs en paralelo y retorna el buffer en base64 de la más rápida.
 * @param {Object} quoteObj - Objeto con los datos del quote.
 * @returns {Promise<string>} Base64 string de la imagen.
 */
export async function generateQuoteSticker(quoteObj) {
  const promises = QUOTE_ENDPOINTS.map(async (endpoint) => {
    try {
      const response = await axios.post(endpoint, quoteObj, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000 // 10 segundos máximo por API
      });
      
      const base64Image = response.data?.result?.image || response.data?.result || response.data?.data?.image;
      if (!base64Image || typeof base64Image !== 'string') {
        throw new Error('Respuesta inválida desde ' + endpoint);
      }
      return base64Image;
    } catch (e) {
      // Lanzamos error para que Promise.any lo ignore si otras funcionan
      throw e;
    }
  });

  try {
    const fastestBase64 = await Promise.any(promises);
    return fastestBase64;
  } catch (aggregateError) {
    throw new Error('Todas las APIs de QuoteSticker fallaron o tardaron demasiado.');
  }
}

/**
 * Función para hacer ping al cluster y obtener el tiempo de respuesta de la API más rápida.
 */
export async function pingQuoteApis() {
  const start = Date.now();
  const promises = QUOTE_ENDPOINTS.map(async (endpoint) => {
    try {
      await axios.get(endpoint, { timeout: 3000 });
      return Date.now() - start;
    } catch (e) {
      if (e.response && e.response.status === 405) {
         // Algunos endpoints dan 405 Method Not Allowed en GET, lo que significa que el server está vivo
         return Date.now() - start;
      }
      throw e; // Falla
    }
  });

  try {
    const fastestPing = await Promise.any(promises);
    return fastestPing + ' ms';
  } catch (e) {
    return 'Inalcanzable ❌';
  }
}

export default {
  generateQuoteSticker,
  pingQuoteApis
};