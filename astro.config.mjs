import { defineConfig } from 'astro/config';
export default defineConfig({output:'static',vite:{cacheDir:'.astro/vite'},server:{host:'127.0.0.1',port:4326}});
