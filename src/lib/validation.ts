import {z} from 'zod';
// Strict CSP: no JIT compilation or caught new Function capability probe.
z.config({jitless:true});
export {z};
