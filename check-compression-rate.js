import fs from 'fs';
import zlib from 'zlib';

const READ_FILE_NAME = 'dist/tiny-vue.min.js';
const WRITE_BROTLI_FILE_NAME = 'dist/tiny-vue.js.br';
const WRITE_GZIP_FILE_NAME = 'dist/tiny-vue.js.gz';

// Create brotli compress object
const gzip = zlib.createGzip();
const brotli = zlib.createBrotliCompress();

// Pipe the read and write operations with brotli compression
const brotliStream = fs.createReadStream(READ_FILE_NAME).pipe(brotli).pipe(fs.createWriteStream(WRITE_BROTLI_FILE_NAME));
const gzipStream = fs.createReadStream(READ_FILE_NAME).pipe(gzip).pipe(fs.createWriteStream(WRITE_GZIP_FILE_NAME));

// Divide by 1000 to get KB (kilobyte), not 1024 which is KiB (kibibyte)
console.log('Minified size:', Math.ceil(fs.statSync(READ_FILE_NAME).size / 1000 * 100) / 100, 'KB');

brotliStream.on('finish', () => {
    console.log('Brotli size:', Math.ceil(brotliStream.bytesWritten / 1000 * 100) / 100, 'KB');
    fs.unlink(WRITE_BROTLI_FILE_NAME, () => {});
});

gzipStream.on('finish', () => {
    console.log('Gzip size:', Math.ceil(gzipStream.bytesWritten / 1000 * 100) / 100, 'KB');
    fs.unlink(WRITE_GZIP_FILE_NAME, () => {});
});
