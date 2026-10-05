import crypto from "node:crypto";
export function createApiKey(){const secret=crypto.randomBytes(32).toString("base64url");return{raw:"nxs_"+secret,prefix:"nxs_"+secret.slice(0,8)}}
export function hashApiKey(key:string){return crypto.createHash("sha256").update(key).digest("hex")}