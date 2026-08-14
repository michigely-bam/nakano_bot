import { dirname } from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import webp from "node-webpmux";
import fetch from "node-fetch";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Función para detectar MIME type sin file-type
async function detectMimeType(buffer) {
    if (!buffer || buffer.length < 4) return { ext: 'bin', mime: 'application/octet-stream' };
    
    const hex = buffer.toString('hex', 0, 4).toUpperCase();
    
    // PNG
    if (hex.startsWith('89504E47')) return { ext: 'png', mime: 'image/png' };
    // JPEG
    if (hex.startsWith('FFD8FF')) return { ext: 'jpg', mime: 'image/jpeg' };
    // GIF
    if (hex.startsWith('47494638')) return { ext: 'gif', mime: 'image/gif' };
    // WEBP
    if (hex.startsWith('52494646') && buffer.toString('hex', 8, 12) === '57454250') return { ext: 'webp', mime: 'image/webp' };
    // MP4
    if (hex.startsWith('000000') || hex.startsWith('66747970')) return { ext: 'mp4', mime: 'video/mp4' };
    // PDF
    if (hex.startsWith('25504446')) return { ext: 'pdf', mime: 'application/pdf' };
    // ZIP
    if (hex.startsWith('504B0304')) return { ext: 'zip', mime: 'application/zip' };
    // MP3
    if (hex.startsWith('494433') || hex.startsWith('FFFB')) return { ext: 'mp3', mime: 'audio/mpeg' };
    
    return { ext: 'bin', mime: 'application/octet-stream' };
}

// Detectar FFmpeg del sistema
let support = {
    ffmpeg: false,
    ffprobe: false,
    ffmpegWebp: false
};

// Verificar si ffmpeg está disponible en el sistema
try {
    const test = spawn('ffmpeg', ['-version']);
    
    test.on('error', () => {
        console.log('⚠️ FFmpeg no está disponible en el sistema');
        support.ffmpeg = false;
    });
    
    test.on('close', (code) => {
        if (code === 0) {
            support.ffmpeg = true;
            support.ffmpegWebp = true;
            console.log('✅ FFmpeg detectado en el sistema');
        }
    });
    
} catch (e) {
    console.log('⚠️ Error al verificar FFmpeg:', e.message);
    support.ffmpeg = false;
}

// Función para convertir a sticker usando ffmpeg
async function stickerFFmpeg(buffer) {
    return new Promise(async (resolve, reject) => {
        if (!support.ffmpeg) {
            reject(new Error('FFmpeg no está disponible'));
            return;
        }

        try {
            const type = await detectMimeType(buffer);
            if (!type || !type.ext) {
                reject(new Error('Tipo de archivo no reconocido'));
                return;
            }

            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempId = Date.now();
            const inputPath = path.join(tempDir, `input_${tempId}.${type.ext}`);
            const outputPath = path.join(tempDir, `output_${tempId}.webp`);

            await fs.promises.writeFile(inputPath, buffer);

            const args = [
                '-i', inputPath,
                '-vcodec', 'libwebp',
                '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
                '-compression_level', '6',
                '-q:v', '70',
                '-loop', '0',
                '-preset', 'default',
                '-an',
                '-vsync', '0',
                '-s', '512:512',
                '-f', 'webp',
                outputPath
            ];

            const proc = spawn('ffmpeg', args);
            
            let stderr = '';
            proc.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });

            proc.on('close', async (code) => {
                try {
                    await fs.promises.unlink(inputPath);
                    
                    if (code !== 0) {
                        console.error('FFmpeg error:', stderr);
                        reject(new Error(`FFmpeg falló con código ${code}`));
                        return;
                    }

                    const result = await fs.promises.readFile(outputPath);
                    await fs.promises.unlink(outputPath);
                    resolve(result);
                    
                } catch (cleanupError) {
                    reject(cleanupError);
                }
            });

            proc.on('error', (err) => {
                reject(err);
            });

            // Timeout después de 30 segundos
            setTimeout(() => {
                proc.kill();
                reject(new Error('FFmpeg timeout'));
            }, 30000);

        } catch (error) {
            reject(error);
        }
    });
}

// Función para agregar metadata EXIF
async function addExif(webpSticker, packname, author, categories = [""]) {
    try {
        const img = new webp.Image();
        await img.load(webpSticker);
        
        const json = {
            "sticker-pack-id": crypto.randomBytes(32).toString("hex"),
            "sticker-pack-name": packname || 'Sticker',
            "sticker-pack-publisher": author || 'Bot',
            "emojis": categories
        };

        const exif = Buffer.from(JSON.stringify(json), 'utf8');
        const exifChunk = webp.exifChunk(exif);
        
        if (img.exif) {
            img.exif = exifChunk;
        } else {
            img.exif = exifChunk;
        }
        
        return await img.save();
    } catch (error) {
        console.error('Error en addExif:', error);
        return webpSticker;
    }
}

// Función principal de sticker
async function sticker(img, url, packname, author, categories = [""]) {
    try {
        let buffer = img;
        if (url) {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            buffer = await res.buffer();
        }

        let stickerBuffer;
        
        if (support.ffmpeg) {
            try {
                stickerBuffer = await stickerFFmpeg(buffer);
                console.log('✅ Sticker creado con FFmpeg');
            } catch (ffmpegError) {
                console.log('⚠️ FFmpeg falló, usando método alternativo:', ffmpegError.message);
                // Fallback simple: si es imagen, devolver como sticker sin procesar
                const type = await detectMimeType(buffer);
                if (type && (type.mime.startsWith('image/') || type.mime.startsWith('video/'))) {
                    stickerBuffer = buffer;
                } else {
                    throw ffmpegError;
                }
            }
        } else {
            // Si no hay FFmpeg, intentar con el buffer directamente
            const type = await detectMimeType(buffer);
            if (type && type.mime.startsWith('image/')) {
                stickerBuffer = buffer;
            } else {
                throw new Error('FFmpeg no disponible para procesar este tipo de archivo');
            }
        }
        
        if (!stickerBuffer || stickerBuffer.length === 0) {
            throw new Error('No se pudo crear el sticker');
        }

        // Agregar metadata EXIF
        try {
            const finalSticker = await addExif(stickerBuffer, packname, author, categories);
            return finalSticker;
        } catch (exifError) {
            console.error('Error al agregar EXIF:', exifError.message);
            return stickerBuffer;
        }
        
    } catch (error) {
        console.error('Error en función sticker:', error);
        throw error;
    }
}

// Versión para video (animado)
async function stickerVideo(videoBuffer, packname, author) {
    try {
        if (!support.ffmpeg) {
            throw new Error('FFmpeg no disponible para stickers animados');
        }

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempId = Date.now();
        const inputPath = path.join(tempDir, `video_${tempId}.mp4`);
        const outputPath = path.join(tempDir, `animated_${tempId}.webp`);

        await fs.promises.writeFile(inputPath, videoBuffer);

        const args = [
            '-i', inputPath,
            '-vcodec', 'libwebp',
            '-vf', 'fps=10,scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
            '-lossless', '0',
            '-compression_level', '3',
            '-q:v', '70',
            '-loop', '0',
            '-preset', 'default',
            '-an',
            '-vsync', '0',
            '-s', '512:512',
            '-f', 'webp',
            outputPath
        ];

        return new Promise((resolve, reject) => {
            const proc = spawn('ffmpeg', args);
            
            let stderr = '';
            proc.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });
            
            proc.on('close', async (code) => {
                try {
                    await fs.promises.unlink(inputPath);
                    
                    if (code !== 0) {
                        console.error('FFmpeg error:', stderr);
                        await fs.promises.unlink(outputPath).catch(() => {});
                        reject(new Error(`FFmpeg falló con código ${code}`));
                        return;
                    }

                    const result = await fs.promises.readFile(outputPath);
                    await fs.promises.unlink(outputPath);
                    
                    // Agregar metadata
                    const finalSticker = await addExif(result, packname || 'Sticker', author || 'Bot');
                    resolve(finalSticker);
                    
                } catch (error) {
                    reject(error);
                }
            });

            proc.on('error', reject);
            
            // Timeout
            setTimeout(() => {
                proc.kill();
                reject(new Error('FFmpeg timeout'));
            }, 45000);
        });

    } catch (error) {
        console.error('Error en stickerVideo:', error);
        throw error;
    }
}

export { 
    sticker, 
    stickerVideo, 
    addExif, 
    support,
    detectMimeType
};